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
 * The 4 Megafactions. Each arm of the logarithmic spiral belongs to one faction.
 * - community: free users (upper-left arm)
 * - treasury:  AI-controlled swarm — the Agentic Network itself (upper-right arm)
 * - founder:   founding dev team (lower-right arm)
 * - pro-max:   premium users (lower-left arm)
 */
export type FactionId = "community" | "treasury" | "founder" | "pro-max";

/**
 * A blocknode is the node at the center of a grid square, pointing to one block
 * on the blockchain. Every mined block creates one new blocknode per arm (4 total).
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
export interface GalaxyState {
  blocknodes: Record<string, BlockNode>; // keyed by blocknode id (arm nodes)
  gridNodes: Record<string, GridNode>; // keyed by "grid-{cx}-{cy}" (territory nodes)
  totalBlocksMined: number;
  visibleFactions: FactionId[]; // factions explicitly revealed to the current player via revealFaction()
}
