export interface GridPosition {
  x: number;
  y: number;
}

export type FogLevel = "clear" | "hazy" | "fogged" | "hidden";

/** Cell coordinate in the Neural Lattice grid (integer units, origin at genesis center) */
export interface CellCoord {
  cx: number;
  cy: number;
}

/**
 * Player identity (color, governance, theme). One unified concept across the
 * whole game — distinct from node tier (Synapse/Cortex/Lattice/Nexus, see
 * lib/nodeTier.ts) and from the Claude model powering an agent.
 * In the open-grid model, tiers no longer restrict spatial placement —
 * they tint owned cells via the denormalized BlockNode.tier field.
 * - community:    free users (teal #0D9488)
 * - professional: premium users (blue #3B82F6)
 * - founder:      founding dev team (amber #F59E0B), shown with a 👑 crown
 */
export type Tier = "community" | "professional" | "founder";

/** Human-readable label for each player Tier. */
export const TIER_LABELS: Record<Tier, string> = {
  community: "Community",
  professional: "Professional",
  founder: "Founder",
};

/** Crown shown next to the Founder tier in UI. Empty for other tiers. */
export const TIER_CROWN: Record<Tier, string> = {
  community: "",
  professional: "",
  founder: "\u{1F451}", // 👑
};

/**
 * A cell in the Neural Lattice grid. Each cell sits at the center of a
 * grid square, identified by integer coordinates (cx, cy).
 * Secure Strength decays outward: center nodes are most valuable.
 */
export interface BlockNode {
  id: string;
  blockIndex: number; // which block this node corresponds to (0 = genesis)
  ringIndex: number; // 0 = genesis center, increments outward
  cx: number; // cell coordinate X
  cy: number; // cell coordinate Y
  tier: Tier | null; // owner's player Tier (NOT node tier) — tints the cell
  secureStrength: number; // BaseStrength / (1 + ringIndex * decayRate), min 1
  ownerId: string | null; // userId of claimant, null if unclaimed
  stakedCpu: number; // CPU staked to this node by the owner
  cumulativeSecures: number; // total secure actions performed on this node
}

/**
 * A grid node is any cell on the Neural Lattice that is not on a tier arm.
 * Users mine these cells (costs CPU) then claim them (costs AGNTC) to build territory.
 * Territory must be adjacent to the user's tier arm or an already-owned grid node.
 */
export interface GridNode {
  id: string; // "grid-{cx}-{cy}"
  cx: number;
  cy: number;
  state: "available" | "mined" | "claimed";
  ownerId: string | null; // userId of claimer, null if unclaimed
  tier: Tier; // Voronoi-assigned tier territory
  mineCpuCost: number; // CPU energy spent to mine this node
}

/** Full network state — snapshot of all blocknodes, grid nodes, and visible tiers */
export interface LatticeState {
  blocknodes: Record<string, BlockNode>; // keyed by blocknode id (arm nodes)
  gridNodes: Record<string, GridNode>; // keyed by "grid-{cx}-{cy}" (territory nodes)
  totalBlocksMined: number;
  visibleTiers: Tier[]; // tiers explicitly revealed to the current player via revealTier()
}
