import { Graphics } from "pixi.js";
import type { BlockNode, FactionId } from "@/types";
import { CELL_SIZE, cellToPixel } from "@/lib/lattice";

/** Faction fill colors — used by Task 14 (owned-cell tints). */
export const FACTION_COLORS: Record<FactionId, number> = {
  community: 0x0d9488, // teal
  treasury: 0xdc2680,  // pink (Machines)
  founder: 0xf59e0b,   // amber
  "pro-max": 0x3b82f6, // blue (Professional)
};

const GRID_LINE_COLOR = 0xffffff;
const GRID_LINE_ALPHA = 0.03;

/**
 * Draws the background for the Neural Lattice grid.
 *
 * Pass 1: Neutral dot per blocknode cell (temporary placeholder — Task 14 replaces
 *         with faction-tinted owned-cell rendering).
 * Pass 2: Grid lines on top.
 *
 * @param blocknodes All current blocknodes (keyed by id)
 * @param viewportCells Half-width and half-height in cell units (determines draw range)
 */
export function createGridBackground(
  blocknodes: Record<string, BlockNode>,
  viewportCells: number = 20
): Graphics {
  const graphics = new Graphics();
  const range = viewportCells;

  // TEMPORARY placeholder — Task 14 replaces with faction-tinted owned cells.
  for (const node of Object.values(blocknodes)) {
    const { px, py } = cellToPixel(node.cx, node.cy);
    graphics
      .circle(px, py, 2)
      .fill({ color: 0xffffff, alpha: 0.30 });
  }

  // Grid lines
  graphics.setStrokeStyle({ width: 1, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA });
  const pixelRange = range * CELL_SIZE;
  for (let cx = -range; cx <= range + 1; cx++) {
    const px = cx * CELL_SIZE - CELL_SIZE / 2;
    graphics.moveTo(px, -pixelRange - CELL_SIZE / 2);
    graphics.lineTo(px, pixelRange + CELL_SIZE / 2);
  }
  for (let cy = -range; cy <= range + 1; cy++) {
    const py = cy * CELL_SIZE - CELL_SIZE / 2;
    graphics.moveTo(-pixelRange - CELL_SIZE / 2, py);
    graphics.lineTo(pixelRange + CELL_SIZE / 2, py);
  }
  graphics.stroke();

  return graphics;
}

/**
 * Updates an existing background Graphics object to reflect new blocknode state.
 * Clears and redraws — suitable for when blocknodes change.
 */
export function updateGridBackground(
  existing: Graphics,
  blocknodes: Record<string, BlockNode>,
  viewportCells: number = 20
): void {
  existing.clear();

  const range = viewportCells;

  // TEMPORARY placeholder — Task 14 replaces with faction-tinted owned cells.
  for (const node of Object.values(blocknodes)) {
    const { px, py } = cellToPixel(node.cx, node.cy);
    existing
      .circle(px, py, 2)
      .fill({ color: 0xffffff, alpha: 0.30 });
  }

  // Grid lines
  existing.setStrokeStyle({ width: 1, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA });
  const pixelRange = range * CELL_SIZE;
  for (let cx = -range; cx <= range + 1; cx++) {
    const px = cx * CELL_SIZE - CELL_SIZE / 2;
    existing.moveTo(px, -pixelRange - CELL_SIZE / 2);
    existing.lineTo(px, pixelRange + CELL_SIZE / 2);
  }
  for (let cy = -range; cy <= range + 1; cy++) {
    const py = cy * CELL_SIZE - CELL_SIZE / 2;
    existing.moveTo(-pixelRange - CELL_SIZE / 2, py);
    existing.lineTo(pixelRange + CELL_SIZE / 2, py);
  }
  existing.stroke();
}
