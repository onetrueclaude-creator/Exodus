/**
 * vaultGate — orchestrates the Singularity Proof-of-Agentic-Work gate flows.
 *
 * Pure-ish coordination over a {@link ChainService} + the IndexedDB shard cache
 * + the {@link makeProofFromHex} prover, factored out of NodeInspector so the
 * gate logic is unit-testable without rendering the WebGL canvas.
 *
 * The "Secure" flow is the gate itself (spec §2): the player's browser holds a
 * vault shard, answers a fresh per-block challenge by building a Merkle
 * possession proof locally, and submits it; only an accepted proof mutates
 * state (credits CPU + spawns the success edge). It is an honest possession /
 * protocol-obedience proof — NOT a ZK proof (the SNARK wrap is a later
 * milestone).
 */
import type { ChainService } from "@/services/chainService";
import type { VaultPinsResponse } from "@/types";
import { makeProofFromHex } from "@/lib/vaultProof";
import { getCachedShard, putShard } from "@/lib/vaultShardStore";

export interface ReadResult {
  rootCid: string;
  atomCount: number;
  shardCount: number;
  replicationFactor: number;
  shards: number[];
}

/** Folded Disk resource stats — the game-facing view of the chain's pins surface. */
export interface PinStats {
  /** Bytes of vault shards this wallet durably pins (server-attested). */
  pinnedBytes: number;
  /**
   * Windowed audit pass-rate in [0, 1]. ALWAYS the server's `pass_rate` field —
   * never recomputed from pin rows client-side: the chain's rate absorbs an
   * internal owner-level miss bucket (shard_id = -1) that the pins list never
   * contains, so a client recount would overstate the rate.
   */
  passRate: number;
  /** Count of currently-active pins. */
  activePins: number;
}

/** Browser-tier pin quota (design spec §3.2): up to 8 shards (~32 MiB) held
 *  while playing. Display constant only — the chain registry is authoritative
 *  for actual assignment. */
export const BROWSER_PIN_SLOTS = 8;

/** Fold the chain's pins response into the game's Disk stats (HUD + inspector). */
export function foldPinStats(pins: VaultPinsResponse): PinStats {
  return {
    pinnedBytes: pins.pinned_bytes,
    passRate: pins.pass_rate,
    activePins: pins.pins.filter((p) => p.active).length,
  };
}

export interface StatsResult extends PinStats {
  shards: number[];
  lastPassBlock: number | null;
  securedPasses: number;
}

export interface SecureSuccess {
  ok: true;
  shardId: number;
  cpuCredit: number;
  issuedBlock: number;
  /** true if the shard bytes came from the IndexedDB cache (held over time). */
  fromCache: boolean;
}

export interface SecureFailure {
  ok: false;
  reason: string;
  /** Present when the failure happened after a shard was selected. */
  shardId?: number;
}

export type SecureResult = SecureSuccess | SecureFailure;

/** READ — vault root CID + sizing + this player's assigned shards. */
export async function runRead(
  chain: ChainService,
  walletIndex: number,
): Promise<ReadResult> {
  const [root, assignment] = await Promise.all([
    chain.getVaultRoot(),
    chain.getVaultAssignment(walletIndex),
  ]);
  return {
    rootCid: root.root_cid,
    atomCount: root.atom_count,
    shardCount: root.shard_count,
    replicationFactor: root.replication_factor,
    shards: assignment.shards,
  };
}

/** STATS — securing history + Disk pin stats: shards, last pass, passes, pins. */
export async function runStats(
  chain: ChainService,
  walletIndex: number,
): Promise<StatsResult> {
  const [status, pins] = await Promise.all([
    chain.getVaultStatus(walletIndex),
    chain.getVaultPins(walletIndex),
  ]);
  return {
    shards: status.shards,
    lastPassBlock: status.last_pass_block,
    securedPasses: status.secured_passes,
    ...foldPinStats(pins),
  };
}

/**
 * SECURE — the PoAW gate flow.
 *
 *   1. assignment → pick the wallet's first responsible shard
 *   2. ensure the shard's sub-units are cached (fetch on miss, store in IndexedDB)
 *   3. challenge → fresh per-block sampled indices
 *   4. build the Merkle possession proof locally over the cached bytes
 *   5. submit-proof → on accept return the cpu_credit; else the failure reason
 *
 * Holding the bytes across challenges (step 2 fetch-on-miss-only) is the real
 * spacetime-possession property — re-fetching every challenge would defeat it.
 */
export async function runSecure(
  chain: ChainService,
  walletIndex: number,
): Promise<SecureResult> {
  // 0. Vault root — also the IndexedDB cache key namespace (invalidates on rebuild).
  const root = await chain.getVaultRoot();

  // 1. Which shard does this wallet hold?
  const assignment = await chain.getVaultAssignment(walletIndex);
  if (assignment.shards.length === 0) {
    return { ok: false, reason: "No shard assigned to this wallet yet" };
  }
  const shardId = assignment.shards[0];

  // 2. Hold-the-shard: use cached bytes if present, else fetch once and cache.
  let subUnitsHex = await getCachedShard(walletIndex, shardId, root.root_cid);
  const fromCache = subUnitsHex !== null;
  if (subUnitsHex === null) {
    const shard = await chain.getVaultShard(shardId, walletIndex);
    subUnitsHex = shard.sub_units;
    await putShard(walletIndex, shardId, root.root_cid, subUnitsHex);
  }

  // 3. Fresh per-block challenge bound to this shard.
  const challenge = await chain.getVaultChallenge(walletIndex, shardId);

  // 4. Build the possession proof locally over the held bytes.
  const proof = makeProofFromHex(subUnitsHex, challenge.indices);

  // 5. Submit through the Singularity gate.
  const res = await chain.submitVaultProof({
    wallet_index: walletIndex,
    shard_id: shardId,
    issued_block: challenge.issued_block,
    expires_block: challenge.expires_block,
    indices: challenge.indices,
    block_seed_hex: challenge.block_seed_hex,
    proof,
  });

  if (!res.accepted) {
    return {
      ok: false,
      reason: "Proof rejected by the Singularity gate",
      shardId,
    };
  }
  return {
    ok: true,
    shardId,
    cpuCredit: res.cpu_credit,
    issuedBlock: challenge.issued_block,
    fromCache,
  };
}
