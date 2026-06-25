import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db, mockAuth } = vi.hoisted(() => ({
  db: { user: { findUnique: vi.fn() } },
  mockAuth: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/lib/founders', () => ({ isFounderEmail: vi.fn((email: string) => email === 'founder@x.com') }));

import { GET } from './route';

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
    db.user.findUnique.mockResolvedValue({
      username: 'neo', subscription: 'COMMUNITY', role: 'PLAYER', phantomWalletPubkey: null,
      genesisCohortBatch: null,
    });
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({
      username: 'neo', tier: 'COMMUNITY', role: 'PLAYER', isOnChain: false,
      genesisCohortBatch: null,
    });
  });

  it('forces FOUNDER role from the allowlist regardless of the DB role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u2', email: 'founder@x.com' } });
    db.user.findUnique.mockResolvedValue({
      username: 'root', subscription: 'PROFESSIONAL', role: 'PLAYER', phantomWalletPubkey: 'abc',
      genesisCohortBatch: null,
    });
    const res = await GET();
    const body = await res.json();
    expect(body.role).toBe('FOUNDER');
    expect(body.isOnChain).toBe(true);
  });

  it('returns the permanent genesisCohortBatch when set', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } });
    db.user.findUnique.mockResolvedValue({
      username: 'neo', subscription: 'COMMUNITY', role: 'PLAYER',
      phantomWalletPubkey: null, genesisCohortBatch: 3,
    });
    const res = await GET();
    const body = await res.json();
    expect(body.genesisCohortBatch).toBe(3);
  });

  it('returns null when the user is not in a Genesis batch', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } });
    db.user.findUnique.mockResolvedValue({
      username: 'later', subscription: 'COMMUNITY', role: 'PLAYER',
      phantomWalletPubkey: null, genesisCohortBatch: null,
    });
    const res = await GET();
    const body = await res.json();
    expect(body.genesisCohortBatch).toBeNull();
  });
});
