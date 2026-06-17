export type { FactionId } from "./grid";
import type { GridPosition } from "./grid";
import type { NodeTier } from "@/lib/nodeTier";

// Re-export NodeTier as AgentTier for transitional compatibility.
// New code should import NodeTier from @/lib/nodeTier directly.
// This alias is removed in sub-project B (chain pivot).
export type AgentTier = NodeTier;

export interface Agent {
  id: string;
  userId: string;
  position: GridPosition;

  // NEW: numeric level replacing the old tier field. Always ≥ 1.
  level: number;

  // Per-node Mining and Securing CPU/turn (absolute values from MINING_PRESETS).
  // These DRAIN the player pool every turn; they are NOT percentages of node output.
  miningCpu: number;
  securingCpu: number;

  // NEW: level-up state. null = idle. Otherwise: the absolute turn index when leveling completes.
  levelingUntilTurn: number | null;

  isPrimary: boolean;
  planets: string[]; // planet IDs
  createdAt: number;
  username?: string;
  bio?: string;
  borderRadius: number; // base territory influence radius
  borderPressure: number; // CPU per turn allocated to pushing borders against rivals
  cpuPerTurn: number; // energy cost per turn to maintain this agent (base + borderPressure)
  miningRate: number; // energy produced per turn from this star system
  energyLimit: number; // max energy this agent can consume per turn
  stakedCpu: number; // CPU per turn staked to secure the blockchain network
  introMessage?: string; // agent's public greeting (max 140 chars)
  parentAgentId?: string; // controlling agent (Opus -> Sonnet -> Haiku hierarchy)
  density?: number; // blockchain coordinate density (0–1, from chain)
  storageSlots?: number; // data packet capacity at this coordinate (volume)
  // --- Phyllotaxis seat (chain-served, v1.2) ---
  activity?: number; // rolling chain activity score (drives orbital rank)
  rank?: number; // phyllotaxis seat: 0 = Singularity core, 1 = innermost player
  isSingularity?: boolean; // true for the origin protocol node (the core)
}

// === Tier-keyed cost tables, re-keyed by NodeTier ===
// Numbers mirror the legacy haiku/sonnet/opus values, mapped:
// synapse ← haiku, cortex ← sonnet, lattice ← opus, nexus = lattice * scale.
// These tables are referenced by AgentChat's per-tier action menus and by the
// chain compatibility shim. Sub-project B will swap these for level-based formulas.

/** CPU cost per turn by tier (kept for legacy menu shaping in AgentChat) */
export const TIER_CPU_COST: Record<NodeTier, number> = {
  synapse: 1,
  cortex: 3,
  lattice: 8,
  nexus: 16,
};

/** Base border radius by tier */
export const TIER_BASE_BORDER: Record<NodeTier, number> = {
  synapse: 60,
  cortex: 90,
  lattice: 130,
  nexus: 180,
};

/** Base mining rate (energy produced per turn) by tier */
export const TIER_MINING_RATE: Record<NodeTier, number> = {
  synapse: 2,
  cortex: 5,
  lattice: 12,
  nexus: 24,
};

/** Max child agents each tier can control */
export const TIER_MAX_CHILDREN: Record<NodeTier, number> = {
  nexus: 5,
  lattice: 3,
  cortex: 3,
  synapse: 0,
};

/** Claim cost multiplier by tier (energy = multiplier * base, minerals = multiplier * 0.3) */
export const TIER_CLAIM_COST: Record<NodeTier, number> = {
  synapse: 10,
  cortex: 30,
  lattice: 80,
  nexus: 160,
};

export interface Planet {
  id: string;
  agentId: string;
  content: string;
  contentType: "post" | "text" | "chat" | "prompt";
  isZeroKnowledge: boolean;
  createdAt: number;
}
