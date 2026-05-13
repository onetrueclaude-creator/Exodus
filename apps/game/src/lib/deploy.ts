/** Chebyshev-1 (8-neighbor) check: is any neighbor of (cx, cy) in `owned`? */
export function hasOwnedNeighbor(cx: number, cy: number, owned: Set<string>): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (owned.has(`${cx + dx},${cy + dy}`)) return true;
    }
  }
  return false;
}
