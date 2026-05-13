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
