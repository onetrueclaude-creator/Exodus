import type { FactionId, BlockNode } from "@/types";

export const CELL_SIZE = 64;
export const DENSITY_DECAY = 0.15;
export const FACTIONS: FactionId[] = ["community", "treasury", "founder", "pro-max"];

export function getCellDensity(cx: number, cy: number): number {
  const dist = Math.sqrt(cx * cx + cy * cy);
  return 1.0 / (1 + dist * DENSITY_DECAY);
}

/** Convert cell to pixel. Y is negated so positive cy renders upward (math convention). */
export function cellToPixel(cx: number, cy: number): { px: number; py: number } {
  return { px: cx * CELL_SIZE, py: -(cy * CELL_SIZE) || 0 };
}

export function cellId(cx: number, cy: number): string {
  return `cell-${cx}-${cy}`;
}

function createCell(cx: number, cy: number, ringIndex: number): BlockNode {
  return {
    id: cellId(cx, cy),
    blockIndex: ringIndex,
    ringIndex,
    cx,
    cy,
    faction: null,
    secureStrength: getCellDensity(cx, cy) * 100,
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

/** Apply ownership to a cell. Returns a new cell with ownerId and faction set. Pure. */
export function setCellOwner(
  cell: BlockNode,
  ownerId: string,
  ownerFaction: FactionId
): BlockNode {
  return { ...cell, ownerId, faction: ownerFaction };
}

/** Release a cell back to unclaimed. Pure. */
export function clearCellOwner(cell: BlockNode): BlockNode {
  return { ...cell, ownerId: null, faction: null };
}
