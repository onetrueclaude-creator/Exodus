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

import type { BlockNode } from "@/types";
import { getCellDensity } from "@/lib/lattice";

export interface DeployCandidate {
  id: string;
  cx: number;
  cy: number;
  density: number;
  chebyshevFromHome: number;
}

/** All unclaimed cells adjacent (Chebyshev-1) to any cell the player owns. */
export function computeDeployCandidates(
  blocknodes: Record<string, BlockNode>,
  ownerId: string,
  homenodeCell: { cx: number; cy: number }
): DeployCandidate[] {
  const owned = new Set<string>();
  for (const b of Object.values(blocknodes)) {
    if (b.ownerId === ownerId) owned.add(`${b.cx},${b.cy}`);
  }
  return Object.values(blocknodes)
    .filter(b => b.ownerId === null && hasOwnedNeighbor(b.cx, b.cy, owned))
    .map(b => ({
      id: b.id,
      cx: b.cx,
      cy: b.cy,
      density: getCellDensity(b.cx, b.cy),
      chebyshevFromHome: Math.max(
        Math.abs(b.cx - homenodeCell.cx),
        Math.abs(b.cy - homenodeCell.cy)
      ),
    }))
    .sort((a, b) =>
      a.chebyshevFromHome - b.chebyshevFromHome
      || a.id.localeCompare(b.id)
    );
}
