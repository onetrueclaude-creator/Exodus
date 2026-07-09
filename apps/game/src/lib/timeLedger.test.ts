/**
 * DePIN S3b — the pure Time (tenure) core: gate-threshold parity with the chain,
 * gate reads, folds, and the truncated-hex username fallback. GATES ONLY: these
 * are threshold READS — nothing here spends or mutates tenure.
 */
import { describe, it, expect } from "vitest";
import {
  gateThreshold,
  meetsTimeGate,
  foldTimeStatus,
  foldLeaderboardRow,
  truncateOwnerHex,
} from "@/lib/timeLedger";

describe("timeLedger — gate thresholds (chain parity)", () => {
  it("mirrors chain gate_threshold T(1..7) = [0, 2, 3, 5, 7, 11, 16]", () => {
    // Locked to chain/agentic/params.py (BASE=2, GROWTH=1.5): ceil(2 * 1.5**(N-2)).
    expect([1, 2, 3, 4, 5, 6, 7].map(gateThreshold)).toEqual([0, 2, 3, 5, 7, 11, 16]);
  });

  it("never gates the starting level (T(1)=0) and clamps level<=1 to 0", () => {
    expect(gateThreshold(1)).toBe(0);
    expect(gateThreshold(0)).toBe(0);
    expect(gateThreshold(-3)).toBe(0);
  });

  it("meetsTimeGate is a pure >= threshold read", () => {
    expect(meetsTimeGate(0, 1)).toBe(true);   // starting level never gated
    expect(meetsTimeGate(1, 2)).toBe(false);  // T(2)=2, have 1
    expect(meetsTimeGate(2, 2)).toBe(true);   // exactly meets
    expect(meetsTimeGate(4, 4)).toBe(false);  // T(4)=5, have 4
    expect(meetsTimeGate(5, 4)).toBe(true);
  });
});

describe("timeLedger — folds", () => {
  it("foldTimeStatus maps snake API → camel game shape", () => {
    expect(
      foldTimeStatus({
        wallet_index: 1,
        owner_hex: "ab".repeat(32),
        time_accrued: 6,
        influence: Math.sqrt(6),
        updated_at_block: 4321,
      }),
    ).toEqual({
      walletIndex: 1,
      ownerHex: "ab".repeat(32),
      timeAccrued: 6,
      influence: Math.sqrt(6),
      updatedAtBlock: 4321,
    });
  });

  it("foldLeaderboardRow maps snake API → camel row", () => {
    expect(foldLeaderboardRow({ owner_hex: "cd".repeat(32), time_accrued: 12, influence: Math.sqrt(12) }))
      .toEqual({ ownerHex: "cd".repeat(32), timeAccrued: 12, influence: Math.sqrt(12) });
  });
});

describe("timeLedger — truncateOwnerHex (username fallback)", () => {
  it("truncates a full hex to head…tail", () => {
    expect(truncateOwnerHex("ab".repeat(32))).toBe("ababab…abab");
  });
  it("returns short strings unchanged", () => {
    expect(truncateOwnerHex("short")).toBe("short");
  });
});
