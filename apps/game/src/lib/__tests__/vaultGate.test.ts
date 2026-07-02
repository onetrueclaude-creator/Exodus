/**
 * vaultGate orchestration tests — the PoAW gate flow without the WebGL canvas.
 *
 * A fake ChainService serves real Python-generated shard sub-units, so the proof
 * the gate builds is genuine; the fake's submit-proof verifies it the same way
 * the chain does (root match) and records the submitted envelope. This proves the
 * orchestration produces a chain-acceptable proof, exercises the hold-the-shard
 * IndexedDB caching (fetch-on-miss-only), and covers the failure branches.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { runRead, runStats, runSecure, foldPinStats } from "@/lib/vaultGate";
import { _clearMemoryFallback } from "@/lib/vaultShardStore";
import { verifyProof, type VaultProof } from "@/lib/vaultProof";
import type { ChainService } from "@/services/chainService";
import vectorsJson from "./fixtures/vaultProofVectors.json";

interface Vector {
  n: number;
  shard_id: number;
  sub_units_hex: string[];
  indices: number[];
  expected_root: string;
  expected_proof: { root: string; leaves: Record<string, string>; paths: Record<string, string[]> };
}
const vectors = vectorsJson as unknown as Vector[];
const V = vectors.find((x) => x.n === 8)!; // 8 sub-units, full sample

/**
 * Build a fake ChainService backed by a chosen vector. Tracks shard-fetch calls
 * (to assert the cache prevents re-fetching) and the submitted proof.
 */
function makeFakeChain(vector: Vector, opts: { accept?: boolean; emptyShards?: boolean } = {}) {
  const accept = opts.accept ?? true;
  const calls = { getShard: 0, submit: 0, challenge: 0 };
  let lastSubmitted: VaultProof | null = null;

  const chain: Partial<ChainService> = {
    getVaultRoot: async () => ({
      root_cid: `root-${vector.n}`,
      atom_count: 42,
      shard_count: 16,
      replication_factor: 3,
    }),
    getVaultAssignment: async (walletIndex: number) => ({
      wallet_index: walletIndex,
      owner: `owner-${walletIndex}`,
      shards: opts.emptyShards ? [] : [vector.shard_id],
    }),
    getVaultShard: async (shardId: number) => {
      calls.getShard += 1;
      return { shard_id: shardId, sub_units: vector.sub_units_hex, count: vector.sub_units_hex.length };
    },
    getVaultChallenge: async (_w: number, shardId: number) => {
      calls.challenge += 1;
      return {
        shard_id: shardId,
        indices: vector.indices,
        issued_block: 100,
        expires_block: 101,
        block_seed_hex: "00".repeat(32),
      };
    },
    submitVaultProof: async (req) => {
      calls.submit += 1;
      lastSubmitted = req.proof as VaultProof;
      // Verify exactly as the chain does: recompute paths to the expected root.
      const ok = accept && verifyProof(req.indices, vector.expected_root, req.proof as VaultProof);
      return { accepted: ok, cpu_credit: ok ? 50 : 0 };
    },
    getVaultStatus: async (walletIndex: number) => ({
      wallet_index: walletIndex,
      shards: [vector.shard_id],
      last_pass_block: 99,
      secured_passes: 7,
    }),
    getVaultPins: async (walletIndex: number) => ({
      wallet_index: walletIndex,
      owner: `owner-${walletIndex}`,
      pins: [
        { shard_id: vector.shard_id, passes: 6, misses: 2, size_bytes: 4_194_304, active: true },
        { shard_id: vector.shard_id + 1, passes: 1, misses: 0, size_bytes: 4_194_304, active: false },
      ],
      pinned_bytes: 4_194_304,
      // Deliberately NOT any recount of the rows above (6/8 = 0.75): the server
      // rate absorbs the hidden -1 miss bucket. The fold must read this value.
      pass_rate: 0.6,
    }),
  };
  return { chain: chain as ChainService, calls, getSubmitted: () => lastSubmitted };
}

describe("vaultGate", () => {
  beforeEach(() => {
    _clearMemoryFallback();
  });

  describe("runRead", () => {
    it("returns root sizing + assigned shards", async () => {
      const { chain } = makeFakeChain(V);
      const r = await runRead(chain, 0);
      expect(r.rootCid).toBe(`root-${V.n}`);
      expect(r.atomCount).toBe(42);
      expect(r.shardCount).toBe(16);
      expect(r.replicationFactor).toBe(3);
      expect(r.shards).toEqual([V.shard_id]);
    });
  });

  describe("runStats", () => {
    it("returns securing history folded with Disk pin stats", async () => {
      const { chain } = makeFakeChain(V);
      const s = await runStats(chain, 0);
      expect(s.shards).toEqual([V.shard_id]);
      expect(s.lastPassBlock).toBe(99);
      expect(s.securedPasses).toBe(7);
      expect(s.pinnedBytes).toBe(4_194_304);
      expect(s.activePins).toBe(1);
      // The server's windowed rate — NOT a client recount of rows (which would be 0.75).
      expect(s.passRate).toBe(0.6);
    });
  });

  describe("foldPinStats", () => {
    it("reads the server pass_rate and never recounts pin rows", () => {
      const folded = foldPinStats({
        wallet_index: 1,
        owner: "o",
        pins: [
          { shard_id: 0, passes: 6, misses: 2, size_bytes: 4_194_304, active: true },
          { shard_id: 1, passes: 1, misses: 0, size_bytes: 4_194_304, active: false },
        ],
        pinned_bytes: 4_194_304,
        pass_rate: 0.6, // ≠ any recount of the rows above
      });
      expect(folded).toEqual({ pinnedBytes: 4_194_304, passRate: 0.6, activePins: 1 });
    });
  });

  describe("runSecure — the gate", () => {
    it("builds a chain-acceptable proof and reports the credit", async () => {
      const { chain, getSubmitted } = makeFakeChain(V);
      const res = await runSecure(chain, 0);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.shardId).toBe(V.shard_id);
        expect(res.cpuCredit).toBe(50);
        expect(res.issuedBlock).toBe(100);
        expect(res.fromCache).toBe(false); // first run: cache miss
      }
      // The submitted proof must equal the Python-generated proof byte-for-byte.
      const submitted = getSubmitted()!;
      const normalisedLeaves: Record<number, string> = {};
      for (const [k, val] of Object.entries(submitted.leaves)) normalisedLeaves[Number(k)] = val;
      const expectedLeaves: Record<number, string> = {};
      for (const [k, val] of Object.entries(V.expected_proof.leaves)) expectedLeaves[Number(k)] = val;
      expect(submitted.root).toBe(V.expected_root);
      expect(normalisedLeaves).toEqual(expectedLeaves);
    });

    it("holds the shard: re-proves from cache without re-fetching", async () => {
      const { chain, calls } = makeFakeChain(V);

      const first = await runSecure(chain, 0);
      expect(first.ok && first.fromCache).toBe(false);
      expect(calls.getShard).toBe(1);

      const second = await runSecure(chain, 0);
      expect(second.ok && second.fromCache).toBe(true);
      // Still only ONE shard fetch — the second proof came from the cache.
      expect(calls.getShard).toBe(1);
      // But a fresh challenge + submit happened each time (live action proof).
      expect(calls.challenge).toBe(2);
      expect(calls.submit).toBe(2);
    });

    it("re-fetches when the vault root changes (cache invalidation)", async () => {
      const { chain, calls } = makeFakeChain(V);
      await runSecure(chain, 0);
      expect(calls.getShard).toBe(1);

      // Simulate a vault rebuild: root CID changes → cache key misses.
      vi.spyOn(chain, "getVaultRoot").mockResolvedValue({
        root_cid: "root-CHANGED",
        atom_count: 42,
        shard_count: 16,
        replication_factor: 3,
      });
      const after = await runSecure(chain, 0);
      expect(after.ok && after.fromCache).toBe(false);
      expect(calls.getShard).toBe(2);
    });

    it("fails cleanly when no shard is assigned", async () => {
      const { chain, calls } = makeFakeChain(V, { emptyShards: true });
      const res = await runSecure(chain, 0);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toMatch(/no shard/i);
      expect(calls.getShard).toBe(0);
    });

    it("reports rejection when the gate rejects the proof", async () => {
      const { chain } = makeFakeChain(V, { accept: false });
      const res = await runSecure(chain, 0);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toMatch(/rejected/i);
        expect(res.shardId).toBe(V.shard_id);
      }
    });
  });
});
