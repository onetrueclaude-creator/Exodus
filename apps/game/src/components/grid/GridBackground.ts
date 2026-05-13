import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { BlockNode, FactionId } from "@/types";
import { CELL_SIZE, cellToPixel } from "@/lib/lattice";
import { MAX_LATTICE_RING } from "@/lib/spawn";

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
 * Generate a radial-gradient heatmap sprite anchored at lattice origin (0,0).
 * Drawn once at startup — faint cyan glow that fades to transparent at MAX_LATTICE_RING.
 */
function createDensityHeatmapSprite(): Sprite {
  const radius = MAX_LATTICE_RING * CELL_SIZE; // half-extent in pixels
  const diameter = radius * 2;
  const canvas = document.createElement("canvas");
  canvas.width = diameter;
  canvas.height = diameter;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // ctx may be null in non-browser environments (e.g. jsdom in tests) — skip gradient there
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, "rgba(34, 211, 238, 0.18)");   // accent-cyan at center
    gradient.addColorStop(1, "rgba(34, 211, 238, 0.00)");   // transparent at edge
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, diameter, diameter);
  }
  const tex = Texture.from(canvas);
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5);
  sprite.position.set(0, 0); // origin in lattice coords
  return sprite;
}

/**
 * Draws the background for the Neural Lattice grid.
 *
 * Returns a Container with two children:
 *   [0] density heatmap Sprite (radial cyan gradient from origin)
 *   [1] Graphics layer with placeholder dots + grid lines
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
): Container {
  const container = new Container();

  // Layer 0: density heatmap (behind everything)
  const heatmap = createDensityHeatmapSprite();
  container.addChild(heatmap);

  // Layer 1: placeholder dots + grid lines
  const graphics = new Graphics();
  container.addChild(graphics);

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

  return container;
}

/**
 * Updates the background container to reflect new blocknode state.
 * The container must have been created by createGridBackground — children[1] is the Graphics layer.
 * Clears and redraws the Graphics layer; the heatmap sprite (children[0]) is unchanged.
 */
export function updateGridBackground(
  bgContainer: Container,
  blocknodes: Record<string, BlockNode>,
  viewportCells: number = 20
): void {
  // children[1] is the Graphics layer (children[0] is the heatmap sprite)
  const graphics = bgContainer.getChildAt(1) as Graphics;
  graphics.clear();

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
}
