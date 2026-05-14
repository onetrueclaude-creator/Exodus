import { describe, it, expect } from "vitest";
import {
  getNodeTier,
  getTierMultiplier,
  getNodeCpuPerTurn,
  getLevelUpTurns,
  TIER_DISPLAY_NAME,
  getLevelUpCost,
  MINING_PRESETS,
  SECURING_PRESETS,
} from "@/lib/nodeTier";

describe("getNodeTier", () => {
  it.each([
    [1, "synapse"],
    [3, "synapse"],
    [4, "cortex"],
    [6, "cortex"],
    [7, "lattice"],
    [9, "lattice"],
    [10, "nexus"],
    [100, "nexus"],
  ])("level %i maps to tier %s", (level, tier) => {
    expect(getNodeTier(level)).toBe(tier);
  });
});

describe("getTierMultiplier", () => {
  it.each([
    [1, 1.0],
    [3, 1.0],
    [4, 1.25],
    [6, 1.25],
    [7, 1.5],
    [9, 1.5],
    [10, 2.0],
    [20, 2.0],
  ])("level %i has tier multiplier %f", (level, mult) => {
    expect(getTierMultiplier(level)).toBe(mult);
  });
});

describe("getNodeCpuPerTurn", () => {
  it.each([
    [1, 10],
    [3, 20],
    [4, 31],
    [6, 43],
    [7, 60],
    [9, 75],
    [10, 110],
    [20, 210],
  ])("level %i produces %i CPU/turn", (level, expected) => {
    expect(getNodeCpuPerTurn(level)).toBe(expected);
  });
});

describe("getLevelUpTurns", () => {
  it.each([
    [1, 1],
    [5, 5],
    [10, 10],
    [29, 29],
  ])("level %i requires %i turns to advance", (level, turns) => {
    expect(getLevelUpTurns(level)).toBe(turns);
  });
});

describe("TIER_DISPLAY_NAME", () => {
  it("maps every tier to a display string", () => {
    expect(TIER_DISPLAY_NAME.synapse).toBe("Synapse");
    expect(TIER_DISPLAY_NAME.cortex).toBe("Cortex");
    expect(TIER_DISPLAY_NAME.lattice).toBe("Lattice");
    expect(TIER_DISPLAY_NAME.nexus).toBe("Nexus");
  });
});

describe("getLevelUpCost", () => {
  it.each([
    [1, 200],
    [2, 360],
    [3, 648],
    [4, 1166],
    [5, 2099],
    [6, 3779],
    [7, 6802],
    [8, 12244],
    [9, 22039],
    [10, 39671],
    [15, 749626],
    [20, 14164706],
  ])("level %i costs %i CPU to advance", (level, cost) => {
    expect(getLevelUpCost(level)).toBe(cost);
  });
});

describe("MINING_PRESETS / SECURING_PRESETS", () => {
  it("both contain 0/100/200/500/1000", () => {
    expect([...MINING_PRESETS]).toEqual([0, 100, 200, 500, 1000]);
    expect([...SECURING_PRESETS]).toEqual([0, 100, 200, 500, 1000]);
  });
});
