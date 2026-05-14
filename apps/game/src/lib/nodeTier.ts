export type NodeTier = "synapse" | "cortex" | "lattice" | "nexus";

const TIER_MULTIPLIERS: Record<NodeTier, number> = {
  synapse: 1.0,
  cortex: 1.25,
  lattice: 1.5,
  nexus: 2.0,
};

export const TIER_DISPLAY_NAME: Record<NodeTier, string> = {
  synapse: "Synapse",
  cortex: "Cortex",
  lattice: "Lattice",
  nexus: "Nexus",
};

/** Map an integer level to its tier band. Synapse 1-3, Cortex 4-6, Lattice 7-9, Nexus 10+. */
export function getNodeTier(level: number): NodeTier {
  if (level <= 3) return "synapse";
  if (level <= 6) return "cortex";
  if (level <= 9) return "lattice";
  return "nexus";
}

/** CPU multiplier applied to the base linear curve. */
export function getTierMultiplier(level: number): number {
  return TIER_MULTIPLIERS[getNodeTier(level)];
}

/** CPU output per turn for a node at the given level. */
export function getNodeCpuPerTurn(level: number): number {
  const baseCpu = 5 + level * 5;
  return Math.floor(baseCpu * getTierMultiplier(level));
}

/** Triangular timer: advancing FROM level n takes n turns. */
export function getLevelUpTurns(currentLevel: number): number {
  return currentLevel;
}

/** One-shot CPU cost to advance FROM the given level to (level+1).
 *  200 × 1.8^(L-1), rounded down. Ogame-research-style steep curve. */
export function getLevelUpCost(currentLevel: number): number {
  return Math.floor(200 * Math.pow(1.8, currentLevel - 1));
}

/** Per-node Mining/Securing CPU/turn presets. Absolute values, drained from the player pool. */
export const MINING_PRESETS = [0, 100, 200, 500, 1000] as const;
export const SECURING_PRESETS = [0, 100, 200, 500, 1000] as const;
