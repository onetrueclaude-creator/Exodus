import type { FactionId, BlockNode } from "@/types";

export const CELL_SIZE = 64;
export const DENSITY_DECAY = 0.15;
export const FACTIONS: FactionId[] = ["community", "treasury", "founder", "pro-max"];

const QUADRANT_SIGNS: Record<FactionId, { sx: number; sy: number }> = {
  community: { sx: -1, sy: -1 },
  treasury: { sx: 1, sy: -1 },
  founder: { sx: 1, sy: 1 },
  "pro-max": { sx: -1, sy: 1 },
};

export function getFactionForCell(cx: number, cy: number): FactionId | null {
  if (cx === 0 || cy === 0) return null;
  if (cx < 0 && cy < 0) return "community";
  if (cx > 0 && cy < 0) return "treasury";
  if (cx > 0 && cy > 0) return "founder";
  return "pro-max";
}

export function getCellDensity(cx: number, cy: number): number {
  const dist = Math.sqrt(cx * cx + cy * cy);
  return 1.0 / (1 + dist * DENSITY_DECAY);
}

export function cellToPixel(cx: number, cy: number): { px: number; py: number } {
  return { px: cx * CELL_SIZE, py: cy * CELL_SIZE };
}

export function cellId(cx: number, cy: number): string {
  return `cell-${cx}-${cy}`;
}

function createCell(cx: number, cy: number, ringIndex: number): BlockNode {
  const faction = getFactionForCell(cx, cy);
  if (!faction) throw new Error(`Cannot create cell at axis/origin (${cx},${cy})`);
  return {
    id: cellId(cx, cy),
    blockIndex: ringIndex,
    ringIndex,
    cx, cy, faction,
    secureStrength: getCellDensity(cx, cy) * 100,
    ownerId: null,
    stakedCpu: 0,
    cumulativeSecures: 0,
  };
}

export function getCellsForRing(ring: number): BlockNode[] {
  if (ring <= 0) return [];
  const cells: BlockNode[] = [];
  for (const faction of FACTIONS) {
    const { sx, sy } = QUADRANT_SIGNS[faction];
    if (ring === 1) {
      cells.push(createCell(sx, sy, ring));
    } else {
      for (let i = 1; i <= ring; i++) { cells.push(createCell(sx * i, sy * ring, ring)); }
      for (let i = 1; i < ring; i++) { cells.push(createCell(sx * ring, sy * i, ring)); }
    }
  }
  return cells;
}

export function buildCellsForRing(ring: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (const cell of getCellsForRing(ring)) { result[cell.id] = cell; }
  return result;
}

export function buildAllCells(totalRings: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (let r = 1; r <= totalRings; r++) { Object.assign(result, buildCellsForRing(r)); }
  return result;
}

export function getFrontierCell(faction: FactionId, cells: Record<string, BlockNode>): BlockNode | null {
  const candidates = Object.values(cells)
    .filter((c) => c.faction === faction && c.ownerId === null)
    .sort((a, b) => (a.cx * a.cx + a.cy * a.cy) - (b.cx * b.cx + b.cy * b.cy));
  return candidates[0] ?? null;
}

export function getCellAt(cx: number, cy: number, cells: Record<string, BlockNode>): BlockNode | null {
  return cells[cellId(cx, cy)] ?? null;
}
