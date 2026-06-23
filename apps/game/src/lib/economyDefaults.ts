// Baked-in economy defaults = the offline/Mock fallback AND the params store's
// initial state. The server (/api/params) overrides these at runtime. Keep these
// EXACTLY equal to chain/agentic/params.py's game-economy block.
// NO imports — this module is the cycle-breaker (paramsStore, nodeTier, and
// subscription all import from here; it must not import from any of them).
export interface EconomyParams {
  upgradeCostBase: number; upgradeCostGrowth: number;
  cpuPerTurnFlat: number; cpuPerTurnPerLevel: number;
  tierMultipliers: Record<"synapse" | "cortex" | "lattice" | "nexus", number>;
  tierBands: { synapse: number; cortex: number; lattice: number };
  miningPresets: number[]; securingPresets: number[];
  subscription: Record<string, { startEnergy: number; cpuRegen: number; startAgntc: number; startMinerals: number }>;
}
export const ECONOMY_DEFAULTS: EconomyParams = {
  upgradeCostBase: 200, upgradeCostGrowth: 1.8,
  cpuPerTurnFlat: 5, cpuPerTurnPerLevel: 5,
  tierMultipliers: { synapse: 1.0, cortex: 1.25, lattice: 1.5, nexus: 2.0 },
  tierBands: { synapse: 3, cortex: 6, lattice: 9 },
  miningPresets: [0, 100, 200, 500, 1000], securingPresets: [0, 100, 200, 500, 1000],
  subscription: {
    COMMUNITY:    { startEnergy: 1000, cpuRegen: 100, startAgntc: 10, startMinerals: 10 },
    PROFESSIONAL: { startEnergy: 5000, cpuRegen: 200, startAgntc: 100, startMinerals: 50 },
  },
};
