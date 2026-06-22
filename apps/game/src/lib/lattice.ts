import type { Tier, BlockNode } from "@/types";

export const DENSITY_DECAY = 0.15;
export const TIERS: Tier[] = ["community", "professional", "founder"];

export function cellId(cx: number, cy: number): string {
  return `cell-${cx}-${cy}`;
}

function createCell(cx: number, cy: number, ringIndex: number): BlockNode {
  const dist = Math.sqrt(cx * cx + cy * cy);
  const density = 1.0 / (1 + dist * DENSITY_DECAY);
  return {
    id: cellId(cx, cy),
    blockIndex: ringIndex,
    ringIndex,
    cx,
    cy,
    tier: null,
    secureStrength: density * 100,
    ownerId: null,
    stakedCpu: 0,
    cumulativeSecures: 0,
  };
}

/** Exposed for tests only — production code uses buildCellsForRing/buildAllCells. */
export const createCellInternal = createCell;

/** Returns all cells at exactly Chebyshev distance `ring` from origin. Ring 0 = [(0,0)]. */
export function getCellsForRing(ring: number): BlockNode[] {
  if (ring < 0) return [];
  if (ring === 0) return [createCell(0, 0, 0)];
  const cells: BlockNode[] = [];
  // Top and bottom edges (cy = ±ring), full width including corners
  for (let cx = -ring; cx <= ring; cx++) {
    cells.push(createCell(cx, -ring, ring));
    cells.push(createCell(cx, ring, ring));
  }
  // Left and right edges (cx = ±ring), excluding corners (already added)
  for (let cy = -ring + 1; cy <= ring - 1; cy++) {
    cells.push(createCell(-ring, cy, ring));
    cells.push(createCell(ring, cy, ring));
  }
  return cells;
}

export function buildCellsForRing(ring: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (const cell of getCellsForRing(ring)) { result[cell.id] = cell; }
  return result;
}

export function buildAllCells(totalRings: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (let r = 1; r <= totalRings; r++) { Object.assign(result, buildCellsForRing(r)); }
  return result;
}

export function getCellAt(cx: number, cy: number, cells: Record<string, BlockNode>): BlockNode | null {
  return cells[cellId(cx, cy)] ?? null;
}

/** Apply ownership to a cell. Returns a new cell with ownerId and tier set. Pure. */
export function setCellOwner(
  cell: BlockNode,
  ownerId: string,
  ownerTier: Tier
): BlockNode {
  return { ...cell, ownerId, tier: ownerTier };
}

/** Release a cell back to unclaimed. Pure. */
export function clearCellOwner(cell: BlockNode): BlockNode {
  return { ...cell, ownerId: null, tier: null };
}
