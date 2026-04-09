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
 * The 4 Megafactions. Each occupies a 90-degree quadrant of the Neural Lattice.
 * - community: free users (NW quadrant, cx<0 cy<0)
 * - treasury:  AI-controlled Machines swarm (NE quadrant, cx>0 cy<0)
 * - founder:   founding dev team (SE quadrant, cx>0 cy>0)
 * - pro-max:   premium users (SW quadrant, cx<0 cy>0)
 */
export type FactionId = "community" | "treasury" | "founder" | "pro-max";

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
  faction: FactionId;
  secureStrength: number; // BaseStrength / (1 + ringIndex * decayRate), min 1
  ownerId: string | null; // userId of claimant, null if unclaimed
  stakedCpu: number; // CPU staked to this node by the owner
  cumulativeSecures: number; // total secure actions performed on this node
}

/**
 * A grid node is any cell on the Neural Lattice that is not on a faction arm.
 * Users mine these cells (costs CPU) then claim them (costs AGNTC) to build territory.
 * Territory must be adjacent to the user's faction arm or an already-owned grid node.
 */
export interface GridNode {
  id: string; // "grid-{cx}-{cy}"
  cx: number;
  cy: number;
  state: "available" | "mined" | "claimed";
  ownerId: string | null; // userId of claimer, null if unclaimed
  faction: FactionId; // Voronoi-assigned faction territory
  mineCpuCost: number; // CPU energy spent to mine this node
}

/** Full network state — snapshot of all blocknodes, grid nodes, and visible factions */
export interface LatticeState {
  blocknodes: Record<string, BlockNode>; // keyed by blocknode id (arm nodes)
  gridNodes: Record<string, GridNode>; // keyed by "grid-{cx}-{cy}" (territory nodes)
  totalBlocksMined: number;
  visibleFactions: FactionId[]; // factions explicitly revealed to the current player via revealFaction()
}
