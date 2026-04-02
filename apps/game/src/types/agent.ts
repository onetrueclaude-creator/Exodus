export type { FactionId } from "./grid";
import type { GridPosition } from "./grid";

export type AgentTier = "opus" | "sonnet" | "haiku";

export interface Agent {
  id: string;
  userId: string;
  position: GridPosition;
  tier: AgentTier;
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
}

/** CPU cost per turn by tier */
export const TIER_CPU_COST: Record<AgentTier, number> = {
  haiku: 1,
  sonnet: 3,
  opus: 8,
};

/** Base border radius by tier */
export const TIER_BASE_BORDER: Record<AgentTier, number> = {
  haiku: 60,
  sonnet: 90,
  opus: 130,
};

/** Base mining rate (energy produced per turn) by tier */
export const TIER_MINING_RATE: Record<AgentTier, number> = {
  haiku: 2,
  sonnet: 5,
  opus: 12,
};

/** Max child agents each tier can control */
export const TIER_MAX_CHILDREN: Record<AgentTier, number> = {
  opus: 3, // Opus controls up to 3 Sonnets
  sonnet: 3, // Sonnet controls up to 3 Haikus
  haiku: 0, // Haiku is the leaf tier — can claim distant nodes but controls nothing
};

/** Claim cost multiplier by tier (energy = multiplier * base, minerals = multiplier * 0.3) */
export const TIER_CLAIM_COST: Record<AgentTier, number> = {
  haiku: 10, // cheapest to claim
  sonnet: 30, // mid-range
  opus: 80, // most expensive
};

export interface Planet {
  id: string;
  agentId: string;
  content: string;
  contentType: "post" | "text" | "chat" | "prompt";
  isZeroKnowledge: boolean;
  createdAt: number;
}
