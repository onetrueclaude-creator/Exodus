/**
 * DePIN S3b — store tenure slice: null-honest fold + the advisory level-up gate.
 * GATES ONLY: Time is read here, never spent — a level-up must leave timeStatus
 * untouched (client-side reverse-Howey guard).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store";
import type { TimeStatus } from "@/lib/timeLedger";
import type { Agent } from "@/types";

const INITIAL = useGameStore.getState();

function makeAgent(over: Partial<Agent> = {}): Agent {
  return {
    id: "a1", userId: "me", position: { x: 0, y: 0 }, level: 1, miningCpu: 0,
    securingCpu: 0, levelingUntilTurn: null, isPrimary: true, planets: [],
    createdAt: 0, borderRadius: 30, borderPressure: 0, cpuPerTurn: 0,
    miningRate: 0, energyLimit: 0, stakedCpu: 0, ...over,
  } as Agent;
}

const status = (timeAccrued: number): TimeStatus => ({
  walletIndex: 1, ownerHex: "ab".repeat(32), timeAccrued, influence: Math.sqrt(timeAccrued), updatedAtBlock: 10,
});

describe("gameStore — timeStatus (null-honest)", () => {
  beforeEach(() => useGameStore.setState(INITIAL, true));

  it("starts null and never fabricates a zero row", () => {
    expect(useGameStore.getState().timeStatus).toBeNull();
  });

  it("setTimeStatus sets and clears", () => {
    useGameStore.getState().setTimeStatus(status(6));
    expect(useGameStore.getState().timeStatus?.timeAccrued).toBe(6);
    useGameStore.getState().setTimeStatus(null);
    expect(useGameStore.getState().timeStatus).toBeNull();
  });
});

describe("gameStore — beginNodeLevelUp tenure gate", () => {
  beforeEach(() =>
    useGameStore.setState(
      { ...INITIAL, currentUserId: "me", energy: 1_000_000, turn: 0, chainMode: "testnet", agents: { a1: makeAgent() } },
      true,
    ),
  );

  it("BLOCKS when testnet + known tenure below T(2)=2", () => {
    useGameStore.getState().setTimeStatus(status(1));
    expect(useGameStore.getState().beginNodeLevelUp("a1")).toBe(false);
    expect(useGameStore.getState().agents.a1.levelingUntilTurn).toBeNull();
  });

  it("ALLOWS when tenure meets T(2)=2", () => {
    useGameStore.getState().setTimeStatus(status(2));
    expect(useGameStore.getState().beginNodeLevelUp("a1")).toBe(true);
    expect(useGameStore.getState().agents.a1.levelingUntilTurn).not.toBeNull();
  });

  it("does NOT block when tenure is unknown (null) — never fabricates a fail", () => {
    useGameStore.getState().setTimeStatus(null);
    expect(useGameStore.getState().beginNodeLevelUp("a1")).toBe(true);
  });

  it("does NOT block offline (chainMode != testnet)", () => {
    useGameStore.setState({ chainMode: "mock" });
    useGameStore.getState().setTimeStatus(status(0));
    expect(useGameStore.getState().beginNodeLevelUp("a1")).toBe(true);
  });

  it("never spends tenure — timeStatus is unchanged across a level-up (GATES ONLY)", () => {
    const s = status(5);
    useGameStore.getState().setTimeStatus(s);
    // Snapshot a detached copy before the gate runs. The store holds the same
    // `s` reference (Zustand's `set` does not clone), so asserting against `s`
    // itself would be blind to an in-place field mutation — `s` would mutate
    // right along with the store's copy and the comparison would trivially
    // pass. Asserting against a pre-mutation snapshot closes that gap.
    const before = { ...s };
    useGameStore.getState().beginNodeLevelUp("a1");
    expect(useGameStore.getState().timeStatus).toEqual(before);
  });
});
