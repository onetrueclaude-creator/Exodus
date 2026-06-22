import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockFind = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FOUNDER_EMAILS = 'founder@x.com';
});

describe('GET /api/me', () => {
  it('401s when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns server-resolved tier + PLAYER role for a normal user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'p@x.com' } });
    mockFind.mockResolvedValue({
      username: 'neo', subscription: 'COMMUNITY', role: 'PLAYER', phantomWalletPubkey: null,
    });
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ username: 'neo', tier: 'COMMUNITY', role: 'PLAYER', isOnChain: false });
  });

  it('forces FOUNDER role from the allowlist regardless of the DB role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u2', email: 'founder@x.com' } });
    mockFind.mockResolvedValue({
      username: 'root', subscription: 'PROFESSIONAL', role: 'PLAYER', phantomWalletPubkey: 'abc',
    });
    const res = await GET();
    const body = await res.json();
    expect(body.role).toBe('FOUNDER');
    expect(body.isOnChain).toBe(true);
  });
});
