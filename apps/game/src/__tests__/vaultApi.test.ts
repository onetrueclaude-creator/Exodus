import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally (mirrors testnetApi.test.ts pattern).
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  getVaultRoot,
  getVaultAssignment,
  getVaultShard,
  getVaultChallenge,
  submitVaultProof,
  getVaultStatus,
} from '@/services/testnetApi';
import { setWriteSigner } from '@/lib/writeSigner';

describe('vault API client', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getVaultRoot GETs /api/vault/root', async () => {
    const body = { root_cid: 'cid', atom_count: 10, shard_count: 16, replication_factor: 3 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });

    const r = await getVaultRoot();

    expect(mockFetch).toHaveBeenCalledWith('/api/chain/api/vault/root');
    expect(r).toEqual(body);
  });

  it('getVaultAssignment GETs the wallet-indexed path', async () => {
    const body = { wallet_index: 2, owner: 'abc', shards: [3, 7] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });

    const r = await getVaultAssignment(2);

    expect(mockFetch).toHaveBeenCalledWith('/api/chain/api/vault/assignment/2');
    expect(r.shards).toEqual([3, 7]);
  });

  it('getVaultShard POSTs {wallet_index, shard_id} when no signer is registered (#221)', async () => {
    // Mirrors getVaultChallenge's unsigned shape below: with no WriteSigner
    // registered, signedPost posts the body as-is (dev bypass accepts it
    // unsigned on the chain side) — see writeSigner.ts.
    const body = { shard_id: 5, sub_units: ['aa', 'bb'], count: 2 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });

    const r = await getVaultShard(5, 1);

    expect(mockFetch).toHaveBeenCalledWith('/api/chain/api/vault/shard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_index: 1, shard_id: 5 }),
    });
    expect(r.sub_units).toEqual(['aa', 'bb']);
  });

  describe('getVaultShard with a registered signer (#221)', () => {
    afterEach(() => setWriteSigner(null));

    it('signs through the gateway: nonce context fetch, then a signed POST body', async () => {
      setWriteSigner({
        pubkeyBase58: 'Pk',
        signMessage: async () => new Uint8Array(64),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ nonce: 3, owner_hex: 'aa'.repeat(32), chain_id: 'testnet' }),
      });
      const body = { shard_id: 5, sub_units: ['aa', 'bb'], count: 2 };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });

      const r = await getVaultShard(5, 1);

      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/chain/api/nonce/0');
      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toBe('/api/chain/api/vault/shard');
      const sentBody = JSON.parse(init.body);
      expect(sentBody.wallet_index).toBe(1);
      expect(sentBody.shard_id).toBe(5);
      expect(sentBody.nonce).toBe(3);
      expect(sentBody.signature).toBeTypeOf('string');
      expect(r.sub_units).toEqual(['aa', 'bb']);
    });
  });

  it('getVaultChallenge POSTs wallet_index + shard_id', async () => {
    const body = {
      shard_id: 4, indices: [0, 1, 2], issued_block: 9,
      expires_block: 10, block_seed_hex: '00',
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });

    const r = await getVaultChallenge(3, 4);

    expect(mockFetch).toHaveBeenCalledWith('/api/chain/api/vault/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_index: 3, shard_id: 4 }),
    });
    expect(r.indices).toEqual([0, 1, 2]);
  });

  it('submitVaultProof POSTs the full proof envelope', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accepted: true, cpu_credit: 50 }),
    });
    const req = {
      wallet_index: 0, shard_id: 1, issued_block: 2, expires_block: 3,
      indices: [0], block_seed_hex: 'ab',
      proof: { root: 'r', leaves: { 0: 'l' }, paths: { 0: [] } },
    };

    const r = await submitVaultProof(req);

    expect(mockFetch).toHaveBeenCalledWith('/api/chain/api/vault/submit-proof', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    expect(r).toEqual({ accepted: true, cpu_credit: 50 });
  });

  it('getVaultStatus GETs the wallet-indexed path', async () => {
    const body = { wallet_index: 0, shards: [1], last_pass_block: 12, secured_passes: 4 };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) });

    const r = await getVaultStatus(0);

    expect(mockFetch).toHaveBeenCalledWith('/api/chain/api/vault/status/0');
    expect(r.secured_passes).toBe(4);
  });

  it('propagates non-ok responses as errors', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(getVaultAssignment(99)).rejects.toThrow('Testnet API /api/vault/assignment/99');
  });
});
