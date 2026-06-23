import { describe, it, expect, beforeEach } from "vitest";
import {
  getNodeTier,
  getTierMultiplier,
  getNodeCpuPerTurn,
  getLevelUpTurns,
  TIER_DISPLAY_NAME,
  getLevelUpCost,
  getMiningPresets,
  getSecuringPresets,
} from "@/lib/nodeTier";
import { useParamsStore } from "@/store/paramsStore";
import { ECONOMY_DEFAULTS } from "@/lib/economyDefaults";

beforeEach(() => useParamsStore.setState({ economy: ECONOMY_DEFAULTS, loaded: false }));

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

describe("getMiningPresets / getSecuringPresets", () => {
  it("both return [0, 100, 200, 500, 1000] at defaults", () => {
    expect(getMiningPresets()).toEqual([0, 100, 200, 500, 1000]);
    expect(getSecuringPresets()).toEqual([0, 100, 200, 500, 1000]);
  });
  it("getMiningPresets reflects a store override", () => {
    useParamsStore.setState({ economy: { ...ECONOMY_DEFAULTS, miningPresets: [0, 50, 250] } });
    expect(getMiningPresets()).toEqual([0, 50, 250]);
  });
});

describe("nodeTier reads params store", () => {
  it("default getLevelUpCost matches the legacy curve (200 × 1.8^(L-1))", () => {
    expect(getLevelUpCost(1)).toBe(200);
    expect(getLevelUpCost(3)).toBe(Math.floor(200 * 1.8 ** 2));
  });
  it("reflects a server override of upgradeCostBase", () => {
    useParamsStore.setState({ economy: { ...ECONOMY_DEFAULTS, upgradeCostBase: 400 } });
    expect(getLevelUpCost(1)).toBe(400);
  });
  it("default getNodeCpuPerTurn unchanged; getNodeTier bands unchanged", () => {
    expect(getNodeCpuPerTurn(1)).toBe(Math.floor((5 + 1 * 5) * 1.0));
    expect(getNodeTier(3)).toBe("synapse");
    expect(getNodeTier(4)).toBe("cortex");
  });
});
