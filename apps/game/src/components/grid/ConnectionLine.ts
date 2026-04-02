import { Graphics } from "pixi.js";
import type { GridPosition, BlockNode, FactionId } from "@/types";
import { cellToPixel } from "@/lib/spiral";

export function createConnectionLine(
  from: GridPosition,
  to: GridPosition,
  strength: number
): Graphics {
  const line = new Graphics();
  const alpha = Math.max(0.05, strength * 0.4);

  line.setStrokeStyle({ width: 1 + strength * 2, color: 0x00d4ff, alpha });
  line.moveTo(from.x, from.y);
  line.lineTo(to.x, to.y);
  line.stroke();

  return line;
}

/** Faction colors for connection lines — must match FACTION_COLORS in GridBackground.ts */
const BLOCKNODE_LINE_COLORS: Record<FactionId, number> = {
  community: 0xffffff, // white — free tier
  treasury: 0xf97316, // gold orange
  founder: 0xd946ef, // fuchsia
  "pro-max": 0x00ffff, // cyan — professional tier
};

/**
 * Creates connection lines from a blocknode to its same-faction neighbors.
 * Only connects nodes of the same faction (no cross-faction lines).
 * Returns a single Graphics object with all lines drawn.
 *
 * @param node The source blocknode
 * @param neighbors All blocknodes to consider as potential neighbors
 * @param isVisible Whether this faction is currently visible
 */
export function createBlocknodeConnections(
  node: BlockNode,
  neighbors: BlockNode[],
  isVisible: boolean
): Graphics {
  const lines = new Graphics();
  const color = BLOCKNODE_LINE_COLORS[node.faction];
  const alpha = isVisible ? 0.4 : 0.08;
  const { px: fromPx, py: fromPy } = cellToPixel(node.cx, node.cy);

  // Connect only to adjacent rings (ringIndex ± 1) — builds the chain along the spiral arm.
  // Every-to-every connections would produce O(n²) lines and obscure the arm shape.
  const adjacentRings = neighbors.filter(
    (n) => n.faction === node.faction && Math.abs(n.ringIndex - node.ringIndex) === 1
  );

  for (const neighbor of adjacentRings) {
    const { px: toPx, py: toPy } = cellToPixel(neighbor.cx, neighbor.cy);
    lines.setStrokeStyle({ width: 1, color, alpha });
    lines.moveTo(fromPx, fromPy);
    lines.lineTo(toPx, toPy);
    lines.stroke();
  }

  return lines;
}
