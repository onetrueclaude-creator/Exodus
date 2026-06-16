export type OrbitalFaction = "community" | "professional" | "founders" | "singularity";

/** Normative faction colors (whitepaper §4.2), as PixiJS tint numbers. */
export const FACTION_TINT: Record<OrbitalFaction, number> = {
  community: 0x0d9488,
  professional: 0x3b82f6,
  founders: 0xf59e0b,
  singularity: 0x140532, // dark violet core
};

export interface SeatInput {
  id: string;
  faction: OrbitalFaction;
  isSingularity?: boolean;
  parentId?: string; // present → subagent (orbits parent)
  activity: number; // ranking proxy
}

export interface SceneNode {
  id: string;
  x: number;
  y: number;
  radius: number; // draw radius (px, world space)
  tint: number;
  kind: "player" | "subagent" | "singularity";
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
