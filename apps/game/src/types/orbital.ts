import type { Tier } from "./grid";

/** Orbital seat identity: a player Tier, or the Singularity protocol core. */
export type OrbitalTier = Tier | "singularity";

/** Normative tier colors (whitepaper §4.2), as PixiJS tint numbers. */
export const TIER_TINT: Record<OrbitalTier, number> = {
  community: 0x0d9488,
  professional: 0x3b82f6,
  founder: 0xf59e0b,
  singularity: 0x140532, // dark violet core
};

/**
 * Neutral tint for subagents. Subagents belong to their parent player and do
 * NOT carry a Tier of their own (a Tier is a player-identity concept). They are
 * rendered with this desaturated slate marker so they read as "owned drones",
 * visually distinct from any player Tier colour.
 */
export const SUBAGENT_TINT = 0x94a3b8; // slate-400

export interface SeatInput {
  id: string;
  /**
   * Player Tier identity. Only meaningful for top-level player nodes (and the
   * Singularity core). Subagents are tier-less — `parentId` present ⇒ ignore
   * `tier` for colour/labels; they render with SUBAGENT_TINT instead.
   */
  tier: OrbitalTier;
  isSingularity?: boolean;
  isSelf?: boolean; // true for the current player's own node (homenode marker)
  parentId?: string; // present → subagent (orbits parent, tier-less)
  activity: number; // ranking proxy
}

export interface SceneNode {
  id: string;
  x: number;
  y: number;
  radius: number; // draw radius (px, world space)
  tint: number;
  kind: "player" | "subagent" | "singularity";
  isSelf?: boolean; // true for the current player's own node (homenode marker)
  tier?: OrbitalTier; // carried through for self-marker styling (e.g. founder crown). Omitted for subagents (tier-less).
}

export interface SceneEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  kind: "family" | "interaction";
}

export interface SceneModel {
  nodes: SceneNode[];
  edges: SceneEdge[];
}
