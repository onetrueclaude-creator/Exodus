// @vitest-environment node
// Mint route: session → chain facts → tier → JWT (house route-test style:
// each sequential fetch covered by its own mockResolvedValueOnce).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db, mockAuth, mintMock, verifyMock, revokeMock, deriveMock } = vi.hoisted(() => ({
  db: { user: { findUnique: vi.fn() } },
  mockAuth: vi.fn(),
  mintMock: vi.fn(),
  verifyMock: vi.fn(),
  revokeMock: vi.fn(),
  deriveMock: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/services/vaultIndex/token', () => ({
  mintVaultToken: mintMock, verifyVaultToken: verifyMock, revokeToken: revokeMock,
}));
vi.mock('@/services/vaultIndex/quota', () => ({ deriveTier: deriveMock }));

import { POST, DELETE } from './route';

const VAULT_PARAMS = {
  entryMaxBytes: 4096, excerptMaxBytes: 1024, tokenTtlS: 3600,
  quotaTiers: {
    read_only: { search_per_min: 20, writes_per_day: 0 },
    wallet: { search_per_min: 30, writes_per_day: 8 },
    standing: { search_per_min: 30, writes_per_day: 32 },
    veteran: { search_per_min: 60, writes_per_day: 128 },
  },
  standingPassWindows: 7, standingGateTime: 2, veteranGateTime: 5,
  timeEpochBlocks: 1440, embedModelId: 'minilm-l6-v2-q8-384',
};

function mockChainFacts() {
  // Order matters — the route fetches: params, assignment, status, time, pins.
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ vault: VAULT_PARAMS }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ wallet_index: 1, owner: 'a'.repeat(64), shards: [1] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ blocks_processed: 5000 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ time_accrued: 3, influence: 1.7, wallet_index: 1, owner_hex: 'a'.repeat(64), updated_at_block: 5000 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ pins: [{ shard_id: 1, passes: 4, misses: 0, size_bytes: 4096, active: true, last_pass_block: 4900 }], pinned_bytes: 4096, pass_rate: 1.0, wallet_index: 1, owner: 'a'.repeat(64) }) }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
  mintMock.mockResolvedValue({ token: 'jwt-abc', jti: 'jti-1', expiresAt: new Date(9999999999000) });
  deriveMock.mockReturnValue('standing');
});

describe('POST /api/vault/token', () => {
  it('401s without a session', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('409s when onboarding is incomplete (no chainWalletIndex)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    db.user.findUnique.mockResolvedValue({ chainWalletIndex: null, username: 'neo', phantomWalletPubkey: null });
    const res = await POST();
    expect(res.status).toBe(409);
  });

  it('mints from verified chain facts: tier, scope, limits', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    db.user.findUnique.mockResolvedValue({ chainWalletIndex: 1, username: 'neo', phantomWalletPubkey: 'PhAn' });
    mockChainFacts();
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      token: 'jwt-abc', jti: 'jti-1', expiresAt: new Date(9999999999000).toISOString(),
      tier: 'standing', scope: ['memory:read', 'memory:write'],
      limits: { search_per_min: 30, writes_per_day: 32 },
    });
    // deriveTier saw the real facts (wallet bound, time 3, fresh pass, block 5000)
    expect(deriveMock).toHaveBeenCalledWith(
      { walletBound: true, timeAccrued: 3, lastPassBlock: 4900, currentBlock: 5000 },
      VAULT_PARAMS);
    expect(mintMock).toHaveBeenCalledWith(expect.objectContaining({
      sub: 'a'.repeat(64), walletIndex: 1, username: 'neo',
      scope: ['memory:read', 'memory:write'], quotaTier: 'standing', ttlS: 3600,
    }));
  });

  it('unbound wallet → read-only scope', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    db.user.findUnique.mockResolvedValue({ chainWalletIndex: 1, username: 'neo', phantomWalletPubkey: null });
    deriveMock.mockReturnValue('read_only');
    mockChainFacts();
    const res = await POST();
    const body = await res.json();
    expect(body.scope).toEqual(['memory:read']);
    expect(body.limits).toEqual({ search_per_min: 20, writes_per_day: 0 });
  });
});

describe('DELETE /api/vault/token', () => {
  it('revokes only the caller-owned token', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    db.user.findUnique.mockResolvedValue({ chainWalletIndex: 1, username: 'neo', phantomWalletPubkey: 'PhAn' });
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true, json: async () => ({ wallet_index: 1, owner: 'a'.repeat(64), shards: [] }),
    }) as unknown as typeof fetch;
    verifyMock.mockResolvedValue({ sub: 'a'.repeat(64), jti: 'jti-1', exp: 9999999999 });
    const req = new Request('http://x/api/vault/token', {
      method: 'DELETE', body: JSON.stringify({ token: 'jwt-abc' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(revokeMock).toHaveBeenCalledWith('jti-1', new Date(9999999999 * 1000));
  });

  it("403s revoking someone else's token", async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    db.user.findUnique.mockResolvedValue({ chainWalletIndex: 1, username: 'neo', phantomWalletPubkey: 'PhAn' });
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true, json: async () => ({ wallet_index: 1, owner: 'a'.repeat(64), shards: [] }),
    }) as unknown as typeof fetch;
    verifyMock.mockResolvedValue({ sub: 'f'.repeat(64), jti: 'jti-9', exp: 9999999999 });
    const req = new Request('http://x/api/vault/token', {
      method: 'DELETE', body: JSON.stringify({ token: 'stolen' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
    expect(revokeMock).not.toHaveBeenCalled();
  });
});
