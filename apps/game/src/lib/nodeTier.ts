import { useParamsStore } from "@/store/paramsStore";
import { ECONOMY_DEFAULTS } from "@/lib/economyDefaults";

export type NodeTier = "synapse" | "cortex" | "lattice" | "nexus";

/** Read economy params from the store; fall back to baked-in defaults if not yet hydrated. */
const eco = () => useParamsStore.getState().economy ?? ECONOMY_DEFAULTS;

export const TIER_DISPLAY_NAME: Record<NodeTier, string> = {
  synapse: "Synapse",
  cortex: "Cortex",
  lattice: "Lattice",
  nexus: "Nexus",
};

/** Canonical per-node-tier text-accent class. Single source of truth so the
 *  terminal, network chat, and skills panel colour each tier identically.
 *  Nexus is pink (apex tier, distinct from Lattice purple). */
export const NODE_TIER_ACCENT: Record<NodeTier, string> = {
  synapse: "text-yellow-400",
  cortex: "text-accent-cyan",
  lattice: "text-accent-purple",
  nexus: "text-pink-400",
};

/** Map an integer level to its tier band. Bands are server-overridable via /api/params. */
export function getNodeTier(level: number): NodeTier {
  const b = eco().tierBands;
  if (level <= b.synapse) return "synapse";
  if (level <= b.cortex) return "cortex";
  if (level <= b.lattice) return "lattice";
  return "nexus";
}

/** CPU multiplier applied to the base linear curve. Reads tier multipliers from the store. */
export function getTierMultiplier(level: number): number {
  return eco().tierMultipliers[getNodeTier(level)];
}

/** CPU output per turn for a node at the given level. */
export function getNodeCpuPerTurn(level: number): number {
  const e = eco();
  const baseCpu = e.cpuPerTurnFlat + level * e.cpuPerTurnPerLevel;
  return Math.floor(baseCpu * getTierMultiplier(level));
}

/** Triangular timer: advancing FROM level n takes n turns. */
export function getLevelUpTurns(currentLevel: number): number {
  return currentLevel;
}

/** One-shot CPU cost to advance FROM the given level to (level+1).
 *  upgradeCostBase × upgradeCostGrowth^(L-1), rounded down. Ogame-research-style steep curve. */
export function getLevelUpCost(currentLevel: number): number {
  const e = eco();
  return Math.floor(e.upgradeCostBase * Math.pow(e.upgradeCostGrowth, currentLevel - 1));
}

/** Per-node Mining CPU/turn presets. Server-overridable via /api/params. */
export function getMiningPresets(): number[] {
  return eco().miningPresets;
}

/** Per-node Securing CPU/turn presets. Server-overridable via /api/params. */
export function getSecuringPresets(): number[] {
  return eco().securingPresets;
}
