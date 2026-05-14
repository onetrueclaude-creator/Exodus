import type { BlockNode } from "@/types";

export const MAX_LATTICE_RING = 100;

/** Cells at exactly Chebyshev distance `r` from origin, sorted lex by (cx, cy). */
export function cellsInChebyshevRing(r: number): { cx: number; cy: number }[] {
  if (r < 0) return [];
  if (r === 0) return [{ cx: 0, cy: 0 }];
  const cells: { cx: number; cy: number }[] = [];
  for (let cx = -r; cx <= r; cx++) {
    for (let cy = -r; cy <= r; cy++) {
      if (Math.max(Math.abs(cx), Math.abs(cy)) === r) {
        cells.push({ cx, cy });
      }
    }
  }
  // Already in lex order because of nested-loop traversal (cx outer, cy inner).
  return cells;
}

export interface SpawnCandidate {
  cx: number;
  cy: number;
  chebyshev: number;
}

/**
 * Find the next homenode placement for a new player. Walks Chebyshev rings outward
 * from origin; within a ring, picks the lex-first cell with ownerId === null.
 * Returns null if no unclaimed cell exists within MAX_LATTICE_RING (degenerate).
 */
export function getNextSpawnCell(
  blocknodes: Record<string, BlockNode>
): SpawnCandidate | null {
  const claimed = new Set<string>();
  for (const b of Object.values(blocknodes)) {
    if (b.ownerId !== null) claimed.add(`${b.cx},${b.cy}`);
  }
  for (let r = 0; r <= MAX_LATTICE_RING; r++) {
    for (const cell of cellsInChebyshevRing(r)) {
      if (!claimed.has(`${cell.cx},${cell.cy}`)) {
        return { cx: cell.cx, cy: cell.cy, chebyshev: r };
      }
    }
  }
  return null;
}
