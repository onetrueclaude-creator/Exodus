import { Graphics } from "pixi.js";
import type { BlockNode, FactionId } from "@/types";
import { CELL_SIZE, cellToPixel, getFactionForCell } from "@/lib/lattice";

/** Faction fill colors */
export const FACTION_COLORS: Record<FactionId, number> = {
  community: 0x0d9488, // teal
  treasury: 0xdc2680,  // pink (Machines)
  founder: 0xf59e0b,   // amber
  "pro-max": 0x3b82f6, // blue (Professional)
};

const ALL_FACTIONS: FactionId[] = ["community", "treasury", "founder", "pro-max"];

const GRID_LINE_COLOR = 0xffffff;
const GRID_LINE_ALPHA = 0.03;
const FACTION_FILL_ALPHA = 0.08;
const FOG_COLOR = 0x050510;
const FOG_ALPHA = 0.85;

/**
 * Assigns every cell in the viewport a faction via quadrant-based lookup.
 * Returns a cx,cy → FactionId map for all cells in [-range, range]².
 */
function buildCellFactionMap(range: number, _nodes: BlockNode[]): Record<string, FactionId> {
  const map: Record<string, FactionId> = {};
  for (let cy = -range; cy <= range; cy++) {
    for (let cx = -range; cx <= range; cx++) {
      const faction = getFactionForCell(cx, cy);
      if (faction) map[`${cx},${cy}`] = faction;
    }
  }
  return map;
}

/**
 * Draws the background for the Neural Lattice grid.
 *
 * Every cell is quadrant-assigned to a faction based on its (cx, cy) coordinates.
 * - Arm-path cells for visible factions: faction color tint + bright dot
 * - Non-arm cells for visible factions: fog + faction-colored dim dot
 * - Non-visible faction cells: fog + very dim faction-colored dot
 * Faction territory mesh (same-faction adjacent cell connections) is drawn on top
 * of cell fills, then grid lines are drawn last.
 *
 * @param blocknodes All current blocknodes (keyed by id)
 * @param visibleFactions Factions whose cells show tinting instead of full fog
 * @param viewportCells Half-width and half-height in cell units (determines draw range)
 */
export function createGridBackground(
  blocknodes: Record<string, BlockNode>,
  visibleFactions: FactionId[],
  viewportCells: number = 20
): Graphics {
  const grid = new Graphics();

  const nodes = Object.values(blocknodes);
  const factionByCellKey: Record<string, FactionId> = {};
  for (const node of nodes) {
    factionByCellKey[`${node.cx},${node.cy}`] = node.faction;
  }

  const range = viewportCells;
  // Voronoi: every cell gets a faction based on nearest arm node
  const cellFactionMap = buildCellFactionMap(range, nodes);

  // --- Pass 1: cell backgrounds and fill dots ---
  for (let cy = -range; cy <= range; cy++) {
    for (let cx = -range; cx <= range; cx++) {
      // Skip axis cells and origin — these are faction boundaries, not territory
      if (cx === 0 || cy === 0) continue;

      const key = `${cx},${cy}`;
      const { px, py } = cellToPixel(cx, cy);
      const x = px - CELL_SIZE / 2;
      const y = py - CELL_SIZE / 2;

      const armFaction = factionByCellKey[key];
      const cellFaction = armFaction ?? cellFactionMap[key];
      const isVisible = cellFaction ? visibleFactions.includes(cellFaction) : false;
      const dotColor = cellFaction ? FACTION_COLORS[cellFaction] : 0x1e2d4a;

      if (armFaction && visibleFactions.includes(armFaction)) {
        // Arm-path cell, visible faction — full faction tint + bright seed dot
        grid
          .rect(x, y, CELL_SIZE, CELL_SIZE)
          .fill({ color: FACTION_COLORS[armFaction], alpha: FACTION_FILL_ALPHA });
        grid.circle(px, py, 2).fill({ color: dotColor, alpha: 0.3 });
      } else {
        // Fog background for all other cells
        grid.rect(x, y, CELL_SIZE, CELL_SIZE).fill({ color: FOG_COLOR, alpha: FOG_ALPHA });
        // Faction-colored seed dot — every cell is an AGNTC coin slot for its faction
        grid.circle(px, py, 2).fill({ color: dotColor, alpha: isVisible ? 0.22 : 0.07 });
      }
    }
  }

  // --- Pass 2: faction territory mesh (webbed tree) ---
  // Connect adjacent same-faction cells with dim lines, batched per faction.
  // Visible factions show brighter connections; fogged factions are barely visible.
  for (const faction of ALL_FACTIONS) {
    const isVisible = visibleFactions.includes(faction);
    const alpha = isVisible ? 0.1 : 0.025;
    const color = FACTION_COLORS[faction];
    let hasLines = false;

    grid.setStrokeStyle({ width: 0.5, color, alpha });
    for (let cy = -range; cy <= range; cy++) {
      for (let cx = -range; cx <= range; cx++) {
        if (cellFactionMap[`${cx},${cy}`] !== faction) continue;
        const { px: x1, py: y1 } = cellToPixel(cx, cy);

        // Right neighbor
        if (cx < range && cellFactionMap[`${cx + 1},${cy}`] === faction) {
          const { px: x2, py: y2 } = cellToPixel(cx + 1, cy);
          grid.moveTo(x1, y1).lineTo(x2, y2);
          hasLines = true;
        }
        // Down neighbor
        if (cy < range && cellFactionMap[`${cx},${cy + 1}`] === faction) {
          const { px: x2, py: y2 } = cellToPixel(cx, cy + 1);
          grid.moveTo(x1, y1).lineTo(x2, y2);
          hasLines = true;
        }
      }
    }
    if (hasLines) grid.stroke();
  }

  // --- Pass 3: grid lines on top ---
  grid.setStrokeStyle({ width: 1, color: GRID_LINE_COLOR, alpha: GRID_LINE_ALPHA });
  const pixelRange = range * CELL_SIZE;
  for (let cx = -range; cx <= range + 1; cx++) {
    const px = cx * CELL_SIZE - CELL_SIZE / 2;
    grid.moveTo(px, -pixelRange - CELL_SIZE / 2);
    grid.lineTo(px, pixelRange + CELL_SIZE / 2);
  }
  for (let cy = -range; cy <= range + 1; cy++) {
    const py = cy * CELL_SIZE - CELL_SIZE / 2;
    grid.moveTo(-pixelRange - CELL_SIZE / 2, py);
    grid.lineTo(pixelRange + CELL_SIZE / 2, py);
  }
  grid.stroke();

  return grid;
}

/**
 * Updates an existing background Graphics object to reflect new blocknode state.
 * Clears and redraws — suitable for when blocknodes change.
 */
export function updateGridBackground(
  existing: Graphics,
  blocknodes: Record<string, BlockNode>,
  visibleFactions: FactionId[],
  viewportCells: number = 20
): void {
  existing.clear();

  const nodes = Object.values(blocknodes);
  const factionByCellKey: Record<string, FactionId> = {};
  for (const node of nodes) {
    factionByCellKey[`${node.cx},${node.cy}`] = node.faction;
  }

  const range = viewportCells;
  const cellFactionMap = buildCellFactionMap(range, nodes);

  for (let cy = -range; cy <= range; cy++) {
    for (let cx = -range; cx <= range; cx++) {
      // Skip axis cells and origin — these are faction boundaries, not territory
      if (cx === 0 || cy === 0) continue;

      const key = `${cx},${cy}`;
      const { px, py } = cellToPixel(cx, cy);
      const x = px - CELL_SIZE / 2;
      const y = py - CELL_SIZE / 2;

      const armFaction = factionByCellKey[key];
      const cellFaction = armFaction ?? cellFactionMap[key];
      const isVisible = cellFaction ? visibleFactions.includes(cellFaction) : false;
      const dotColor = cellFaction ? FACTION_COLORS[cellFaction] : 0x1e2d4a;

      if (armFaction && visibleFactions.includes(armFaction)) {
        existing
          .rect(x, y, CELL_SIZE, CELL_SIZE)
          .fill({ color: FACTION_COLORS[armFaction], alpha: FACTION_FILL_ALPHA });
        existing.circle(px, py, 2).fill({ color: dotColor, alpha: 0.3 });
      } else {
        existing.rect(x, y, CELL_SIZE, CELL_SIZE).fill({ color: FOG_COLOR, alpha: FOG_ALPHA });
        existing.circle(px, py, 2).fill({ color: dotColor, alpha: isVisible ? 0.22 : 0.07 });
      }
    }
  }

  for (const faction of ALL_FACTIONS) {
    const isVisible = visibleFactions.includes(faction);
    const alpha = isVisible ? 0.1 : 0.025;
    const color = FACTION_COLORS[faction];
    let hasLines = false;

    existing.setStrokeStyle({ width: 0.5, color, alpha });
    for (let cy = -range; cy <= range; cy++) {
      for (let cx = -range; cx <= range; cx++) {
        if (cellFactionMap[`${cx},${cy}`] !== faction) continue;
        const { px: x1, py: y1 } = cellToPixel(cx, cy);

        if (cx < range && cellFactionMap[`${cx + 1},${cy}`] === faction) {
          const { px: x2, py: y2 } = cellToPixel(cx + 1, cy);
          existing.moveTo(x1, y1).lineTo(x2, y2);
          hasLines = true;
        }
        if (cy < range && cellFactionMap[`${cx},${cy + 1}`] === faction) {
          const { px: x2, py: y2 } = cellToPixel(cx, cy + 1);
          existing.moveTo(x1, y1).lineTo(x2, y2);
          hasLines = true;
        }
      }
    }
    if (hasLines) existing.stroke();
  }

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

  // Origin marker — tiny point at the meeting center of all 4 factions
  existing.circle(0, 0, 1.5);
  existing.fill({ color: 0xffffff, alpha: 0.3 });

  // Quadrant boundaries — dashed lines along axes
  const extent = range * CELL_SIZE;
  existing.setStrokeStyle({ width: 1, color: 0x444444, alpha: 0.4 });
  for (let x = -extent; x < extent; x += 8) {
    existing.moveTo(x, 0);
    existing.lineTo(Math.min(x + 4, extent), 0);
    existing.stroke();
  }
  for (let y = -extent; y < extent; y += 8) {
    existing.moveTo(0, y);
    existing.lineTo(0, Math.min(y + 4, extent));
    existing.stroke();
  }
}
