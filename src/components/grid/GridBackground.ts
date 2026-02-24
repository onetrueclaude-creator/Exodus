import { Graphics } from 'pixi.js';
import { classifyCell, FACTION_COLORS, FACTION_FOG_ALPHA } from '@/lib/spiral/SpiralClassifier';
import type { Faction } from '@/lib/spiral/SpiralClassifier';

export function createGridBackground(width: number, height: number, cellSize: number = 60): Graphics {
  const grid = new Graphics();
  const lineColor = 0xffffff;
  const lineAlpha = 0.03;

  grid.setStrokeStyle({ width: 1, color: lineColor, alpha: lineAlpha });

  for (let x = -width; x <= width; x += cellSize) {
    grid.moveTo(x, -height);
    grid.lineTo(x, height);
  }
  for (let y = -height; y <= height; y += cellSize) {
    grid.moveTo(-width, y);
    grid.lineTo(width, y);
  }
  grid.stroke();

  return grid;
}

/**
 * Creates a Graphics layer that tints each grid cell based on its SpiralClassifier
 * faction assignment. Drawn behind the grid lines and star nodes.
 *
 * @param width      Half-extent in world units (e.g. GRID_EXTENT = 10000)
 * @param height     Half-extent in world units
 * @param userFaction Faction of the current player (determines fog levels)
 * @param cellSize   World-unit size of each grid cell (default 60)
 */
export function createFactionBackground(
  width: number,
  height: number,
  userFaction: Faction,
  cellSize: number = 60,
): Graphics {
  const g = new Graphics();

  for (let wx = -width; wx < width; wx += cellSize) {
    for (let wy = -height; wy < height; wy += cellSize) {
      // Convert world cell origin to classifier grid coordinates (cell index)
      const gx = Math.round((wx + cellSize / 2) / cellSize);
      const gy = Math.round((wy + cellSize / 2) / cellSize);

      const classification = classifyCell(gx, gy, userFaction);

      if (classification.fogLevel === 'hidden') {
        // Very dark, near-invisible tint for void regions
        g.rect(wx, wy, cellSize, cellSize);
        g.fill({ color: 0x050510, alpha: 0.05 });
        continue;
      }

      const baseColor =
        classification.faction !== null
          ? FACTION_COLORS[classification.faction]
          : 0x111133;

      const fogAlpha = FACTION_FOG_ALPHA[classification.fogLevel];
      const fillAlpha = fogAlpha * 0.15;

      g.rect(wx, wy, cellSize, cellSize);
      g.fill({ color: baseColor, alpha: fillAlpha });
    }
  }

  return g;
}
