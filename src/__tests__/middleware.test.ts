/**
 * Middleware test suite — full branch coverage for src/middleware.ts
 *
 * Strategy:
 * - Mock `next-auth` so we control req.auth (isLoggedIn).
 * - Mock `next/server` NextResponse so we can detect next() vs redirect().
 * - Mock global fetch for /api/user/status calls.
 * - Import the middleware once at module level (after mocks are established).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Sentinel values so we can distinguish next() from redirect() ----------
const NEXT_SENTINEL = { __type: 'next' } as const;
const REDIRECT_SENTINEL = { __type: 'redirect' } as const;

// ---------- Mock next/server ----------
const mockNext = vi.fn().mockReturnValue(NEXT_SENTINEL);
const mockRedirect = vi.fn().mockReturnValue(REDIRECT_SENTINEL);

vi.mock('next/server', () => ({
  NextResponse: {
    next: mockNext,
    redirect: mockRedirect,
  },
}));

// ---------- Mock @/lib/auth.config ----------
vi.mock('@/lib/auth.config', () => ({
  authConfig: {},
}));

// ---------- Auth state controlled per-test ----------
let currentAuthUser: { user?: { email: string } } | null = null;

/**
 * Mock next-auth so that:
 *   - NextAuth(config) returns { auth }
 *   - auth(handler) returns a function that injects req.auth and calls handler
 */
vi.mock('next-auth', () => ({
  default: (_config: unknown) => ({
    auth: (handler: (req: AugmentedRequest) => unknown) =>
      (req: AugmentedRequest) => {
        req.auth = currentAuthUser;
        return handler(req);
      },
  }),
}));

// ---------- Mock fetch ----------
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------- Types ----------
interface AugmentedRequest {
  nextUrl: { pathname: string };
  url: string;
  headers: { get: (key: string) => string | null };
  auth: { user?: { email: string } } | null;
}

// ---------- Request factory ----------
function makeRequest(pathname: string, baseUrl = 'http://localhost:3000'): AugmentedRequest {
  return {
    nextUrl: { pathname },
    url: `${baseUrl}${pathname}`,
    headers: { get: (_key: string) => null },
    auth: null, // will be overwritten by the auth wrapper
  };
}

// ---------- Helpers ----------
function setLoggedIn(email = 'user@example.com') {
  currentAuthUser = { user: { email } };
}

function setLoggedOut() {
  currentAuthUser = null;
}

function mockUserStatus(user: { username?: string; subscription?: string }) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => user,
  });
}

// ---------- Import the middleware AFTER mocks are hoisted ----------
// vi.mock() calls are hoisted, so imports below see the mocked modules.
// We import at the top level but after the mock declarations (hoisting guarantees order).

let middleware: (req: AugmentedRequest) => unknown;

beforeEach(async () => {
  // Clear mock state between tests
  mockNext.mockClear();
  mockRedirect.mockClear();
  mockFetch.mockReset();
  setLoggedOut();

  // Import fresh middleware each test (resetModules ensures NODE_ENV changes take effect)
  vi.resetModules();
  // Re-register mocks after module reset
  vi.mock('next/server', () => ({
    NextResponse: { next: mockNext, redirect: mockRedirect },
  }));
  vi.mock('@/lib/auth.config', () => ({ authConfig: {} }));
  vi.mock('next-auth', () => ({
    default: (_config: unknown) => ({
      auth: (handler: (req: AugmentedRequest) => unknown) =>
        (req: AugmentedRequest) => {
          req.auth = currentAuthUser;
          return handler(req);
        },
    }),
  }));

  const mod = await import('@/middleware');
  middleware = mod.default as unknown as (req: AugmentedRequest) => unknown;
});

// =============================================================================
// DEV BYPASS
// =============================================================================

describe('DEV bypass (NODE_ENV=development)', () => {
  it('allows all authenticated requests through in development', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    setLoggedIn();

    const result = await middleware(makeRequest('/game'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows unauthenticated requests through in development', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    setLoggedOut();

    const result = await middleware(makeRequest('/game'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('bypasses auth for protected routes in development', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    setLoggedOut();

    for (const path of ['/onboard', '/subscribe', '/dashboard']) {
      mockNext.mockClear();
      const result = await middleware(makeRequest(path));
      expect(result).toEqual(NEXT_SENTINEL);
    }
  });
});

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

describe('public route passthrough', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    setLoggedOut();
  });

  it('passes /api/auth/** through without auth', async () => {
    const result = await middleware(makeRequest('/api/auth/callback/google'));
    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('passes /api/auth (exact) through', async () => {
    const result = await middleware(makeRequest('/api/auth'));
    expect(result).toEqual(NEXT_SENTINEL);
  });

  it('passes /api/auth/signin through', async () => {
    const result = await middleware(makeRequest('/api/auth/signin'));
    expect(result).toEqual(NEXT_SENTINEL);
  });

  it('passes /api/waitlist through without auth', async () => {
    const result = await middleware(makeRequest('/api/waitlist'));
    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('passes /_next/** static routes through', async () => {
    const result = await middleware(makeRequest('/_next/static/chunk.abc123.js'));
    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('passes paths with file extensions through (static files)', async () => {
    const result = await middleware(makeRequest('/favicon.ico'));
    expect(result).toEqual(NEXT_SENTINEL);
  });

  it('passes .png files through', async () => {
    const result = await middleware(makeRequest('/og-image.png'));
    expect(result).toEqual(NEXT_SENTINEL);
  });

  it('passes .svg files through', async () => {
    const result = await middleware(makeRequest('/logo.svg'));
    expect(result).toEqual(NEXT_SENTINEL);
  });

  it('passes .css files through', async () => {
    const result = await middleware(makeRequest('/styles.css'));
    expect(result).toEqual(NEXT_SENTINEL);
  });
});

// =============================================================================
// LANDING PAGE (/)
// =============================================================================

describe('landing page (/)', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
  });

  it('allows unauthenticated users to stay on landing page', async () => {
    setLoggedOut();

    const result = await middleware(makeRequest('/'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects authenticated users from landing page to /game', async () => {
    setLoggedIn();

    const result = await middleware(makeRequest('/'));

    expect(result).toEqual(REDIRECT_SENTINEL);
    expect(mockRedirect).toHaveBeenCalledOnce();
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/game');
  });
});

// =============================================================================
// PROTECTED ROUTES — unauthenticated users redirected to /
// =============================================================================

describe('protected routes — unauthenticated', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    setLoggedOut();
  });

  it('redirects unauthenticated users from /game to /', async () => {
    const result = await middleware(makeRequest('/game'));
    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/');
  });

  it('redirects unauthenticated users from /onboard to /', async () => {
    const result = await middleware(makeRequest('/onboard'));
    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/');
  });

  it('redirects unauthenticated users from /subscribe to /', async () => {
    const result = await middleware(makeRequest('/subscribe'));
    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/');
  });

  it('redirects unauthenticated users from other protected routes to /', async () => {
    const result = await middleware(makeRequest('/dashboard'));
    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/');
  });

  it('redirects unauthenticated users from /settings to /', async () => {
    const result = await middleware(makeRequest('/settings'));
    expect(result).toEqual(REDIRECT_SENTINEL);
  });
});

// =============================================================================
// /game — onboarding routing for authenticated users
// =============================================================================

describe('/game — onboarding routing', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    setLoggedIn();
  });

  it('redirects to /onboard when user has no username', async () => {
    mockUserStatus({ username: '', subscription: '' });

    const result = await middleware(makeRequest('/game'));

    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/onboard');
  });

  it('redirects to /subscribe when user has username but no subscription', async () => {
    mockUserStatus({ username: 'alice', subscription: '' });

    const result = await middleware(makeRequest('/game'));

    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/subscribe');
  });

  it('allows through when user has both username and subscription', async () => {
    mockUserStatus({ username: 'alice', subscription: 'COMMUNITY' });

    const result = await middleware(makeRequest('/game'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('forwards cookie header to /api/user/status', async () => {
    mockUserStatus({ username: 'alice', subscription: 'COMMUNITY' });
    const req = makeRequest('/game');
    req.headers = { get: (key: string) => (key === 'cookie' ? 'session=abc' : null) };

    await middleware(req);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ headers: { cookie: 'session=abc' } })
    );
  });
});

// =============================================================================
// /onboard — onboarding routing for authenticated users
// =============================================================================

describe('/onboard — onboarding routing', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    setLoggedIn();
  });

  it('allows through when user has no username (correct step)', async () => {
    mockUserStatus({ username: '', subscription: '' });

    const result = await middleware(makeRequest('/onboard'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /subscribe when user has username but no subscription', async () => {
    mockUserStatus({ username: 'alice', subscription: '' });

    const result = await middleware(makeRequest('/onboard'));

    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/subscribe');
  });

  it('redirects to /game when onboarding is fully complete', async () => {
    mockUserStatus({ username: 'alice', subscription: 'COMMUNITY' });

    const result = await middleware(makeRequest('/onboard'));

    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/game');
  });
});

// =============================================================================
// /subscribe — onboarding routing for authenticated users
// =============================================================================

describe('/subscribe — onboarding routing', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    setLoggedIn();
  });

  it('redirects to /onboard when user has no username', async () => {
    mockUserStatus({ username: '', subscription: '' });

    const result = await middleware(makeRequest('/subscribe'));

    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/onboard');
  });

  it('allows through when user has username but no subscription (correct step)', async () => {
    mockUserStatus({ username: 'alice', subscription: '' });

    const result = await middleware(makeRequest('/subscribe'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /game when already subscribed', async () => {
    mockUserStatus({ username: 'alice', subscription: 'PROFESSIONAL' });

    const result = await middleware(makeRequest('/subscribe'));

    expect(result).toEqual(REDIRECT_SENTINEL);
    const redirectArg = mockRedirect.mock.calls[0][0] as URL;
    expect(redirectArg.pathname).toBe('/game');
  });
});

// =============================================================================
// /api/user/status fetch failure — fail-open (allow through)
// =============================================================================

describe('/api/user/status fetch failure — fail-open', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    setLoggedIn();
  });

  it('allows through when fetch throws (network error) on /game', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await middleware(makeRequest('/game'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows through when fetch throws on /onboard', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    const result = await middleware(makeRequest('/onboard'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows through when fetch throws on /subscribe', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

    const result = await middleware(makeRequest('/subscribe'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows through when status API returns non-ok (500) on /game', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

    const result = await middleware(makeRequest('/game'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('allows through when status API returns 404 on /onboard', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

    const result = await middleware(makeRequest('/onboard'));

    expect(result).toEqual(NEXT_SENTINEL);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
