import { Graphics } from 'pixi.js';
import { classifyCell, FACTION_COLORS, FACTION_FOG_ALPHA } from '@/lib/spiral/SpiralClassifier';
import type { Faction } from '@/lib/spiral/SpiralClassifier';

/**
 * Grid lines are offset by half a cell so that node positions (at multiples of
 * cellSize) fall at cell CENTERS, not at grid line intersections.
 * Lines are at: ..., -cellSize/2, cellSize/2, 3*cellSize/2, ...
 */
export function createGridBackground(width: number, height: number, cellSize: number = 60): Graphics {
  const grid = new Graphics();
  const lineColor = 0xffffff;
  const lineAlpha = 0.03;
  const half = cellSize / 2;

  grid.setStrokeStyle({ width: 1, color: lineColor, alpha: lineAlpha });

  for (let x = -width - half; x <= width + half; x += cellSize) {
    grid.moveTo(x, -height);
    grid.lineTo(x, height);
  }
  for (let y = -height - half; y <= height + half; y += cellSize) {
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
 * Cells are offset by -halfCell so they're centered on node positions.
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
  const half = cellSize / 2;

  // Cells start at -half so cell (gx=0) spans from -half to +half, centered at 0
  for (let wx = -width - half; wx < width + half; wx += cellSize) {
    for (let wy = -height - half; wy < height + half; wy += cellSize) {
      // Cell center in world space
      const centerX = wx + half;
      const centerY = wy + half;
      // Convert to grid cell index
      const gx = Math.round(centerX / cellSize);
      // Negate for math y-up convention
      const gyMath = -Math.round(centerY / cellSize);

      const classification = classifyCell(gx, gyMath, userFaction);

      if (classification.fogLevel === 'hidden') {
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
