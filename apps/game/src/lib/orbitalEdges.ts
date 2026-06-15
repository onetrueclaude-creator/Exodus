export const EDGE_FADE_BLOCKS = 30;

export type EdgeKind = "family" | "interaction";

export interface InteractionEdge {
  fromId: string;
  toId: string; // "__singularity__" for chain ops
  bornBlock: number;
  baseAlpha: number; // weight of the action
}

/** Linear fade: full at age 0, 0 at/after fadeBlocks. */
export function edgeAlpha(ageBlocks: number, baseAlpha: number, fadeBlocks: number = EDGE_FADE_BLOCKS): number {
  if (ageBlocks <= 0) return baseAlpha;
  if (ageBlocks >= fadeBlocks) return 0;
  return baseAlpha * (1 - ageBlocks / fadeBlocks);
}
