/**
 * timeLedger — game-side view of the chain's soulbound Time (tenure) ledger
 * (DePIN S3, spec §2.1 — GATES ONLY). Pure, canvas-free, unit-testable.
 *
 * Time is the third real resource: epochs of *verified storage service*. It is a
 * single monotonic counter — read here, NEVER spent, moved, or fabricated. Two
 * pure roles, mirrored from the chain:
 *   - influence = timeAccrued ** 0.5 (√) → leaderboard / governance rank weight.
 *   - gate(N)   = cumulative Time ≥ T(N) → node level-up threshold (advisory
 *     client mirror; the chain is the source of truth — see plan follow-up I2).
 */
import type { TimeRowResponse, TimeLeaderboardEntryResponse } from "@/types";

/** Folded own-tenure row (camel) — the store / HUD / AccountView shape. */
export interface TimeStatus {
  walletIndex: number;
  ownerHex: string;
  /** Epochs of verified service — monotonic; never spent (spec §2.1). */
  timeAccrued: number;
  /** √-tenure rank weight (leaderboard / governance). */
  influence: number;
  updatedAtBlock: number;
}

/** One folded leaderboard row (camel). */
export interface LeaderboardRow {
  ownerHex: string;
  timeAccrued: number;
  influence: number;
}

/**
 * Node-level Time gate params — baked mirror of chain/agentic/params.py
 * (TIME_GATE_BASE, TIME_GATE_GROWTH), exactly like BROWSER_PIN_SLOTS mirrors a
 * spec constant. S3 shipped no /api/params Time-gate field, so there is nothing
 * server-side to read yet (plan follow-up I3: migrate to paramsStore if they
 * become runtime-tunable).
 */
export const TIME_GATE_BASE = 2;
export const TIME_GATE_GROWTH = 1.5;

/**
 * Cumulative Time required to reach node level `level` — T(N), spec §2.1.
 * Byte-for-byte mirror of the chain's gate_threshold: T(1)=0; for N>=2,
 * ceil(TIME_GATE_BASE * TIME_GATE_GROWTH ** (N-2)). GATES ONLY — a threshold read.
 */
export function gateThreshold(level: number): number {
  if (level <= 1) return 0;
  return Math.ceil(TIME_GATE_BASE * Math.pow(TIME_GATE_GROWTH, level - 2));
}

/** True iff `timeAccrued` meets the gate for `level`. Pure read — spends nothing. */
export function meetsTimeGate(timeAccrued: number, level: number): boolean {
  return timeAccrued >= gateThreshold(level);
}

/** Fold the chain's raw tenure row → the game's TimeStatus (camel). */
export function foldTimeStatus(row: TimeRowResponse): TimeStatus {
  return {
    walletIndex: row.wallet_index,
    ownerHex: row.owner_hex,
    timeAccrued: row.time_accrued,
    influence: row.influence,
    updatedAtBlock: row.updated_at_block,
  };
}

/** Fold one raw leaderboard entry → a LeaderboardRow (camel). */
export function foldLeaderboardRow(e: TimeLeaderboardEntryResponse): LeaderboardRow {
  return { ownerHex: e.owner_hex, timeAccrued: e.time_accrued, influence: e.influence };
}

/** Truncated-hex display fallback for an owner with no joined username. */
export function truncateOwnerHex(ownerHex: string): string {
  return ownerHex.length <= 12 ? ownerHex : `${ownerHex.slice(0, 6)}…${ownerHex.slice(-4)}`;
}
