import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockFind = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_DEV_IDENTITY;
  process.env.TESTNET_API = 'http://chain:8080';
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
  );
});

function req(url: string, init?: RequestInit) { return new Request(url, init); }

describe('chain gateway proxy', () => {
  it('forwards a read for a session user and overrides the wallet in the path', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    mockFind.mockResolvedValue({ chainWalletIndex: 7 });
    await GET(req('http://app/api/chain/api/balance/99'), { params: Promise.resolve({ path: ['api', 'balance', '99'] }) });
    expect(fetchMock).toHaveBeenCalledWith('http://chain:8080/api/balance/7', expect.objectContaining({ method: 'GET' }));
  });

  it('overrides wallet_index in a write body to the session wallet', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    mockFind.mockResolvedValue({ chainWalletIndex: 7 });
    await POST(
      req('http://app/api/chain/api/secure', { method: 'POST', body: JSON.stringify({ wallet_index: 99, duration: 5 }), headers: { 'content-type': 'application/json' } }),
      { params: Promise.resolve({ path: ['api', 'secure'] }) },
    );
    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({ wallet_index: 7, duration: 5 });
  });

  it('401s a write with no session and no dev flag', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      req('http://app/api/chain/api/secure', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }),
      { params: Promise.resolve({ path: ['api', 'secure'] }) },
    );
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows a sessionless write under the dev flag, forcing wallet 1', async () => {
    process.env.NEXT_PUBLIC_DEV_IDENTITY = '1';
    mockAuth.mockResolvedValue(null);
    await POST(
      req('http://app/api/chain/api/secure', { method: 'POST', body: JSON.stringify({ wallet_index: 99 }), headers: { 'content-type': 'application/json' } }),
      { params: Promise.resolve({ path: ['api', 'secure'] }) },
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://chain:8080/api/secure');
    expect(JSON.parse(init.body)).toEqual({ wallet_index: 1 });
  });
});
