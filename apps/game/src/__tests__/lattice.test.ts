import { describe, it, expect } from "vitest";
import {
  CELL_SIZE,
  cellToPixel,
  getFactionForCell,
  getCellsForRing,
  buildAllCells,
  buildCellsForRing,
  getCellDensity,
  getFrontierCell,
  FACTIONS,
} from "@/lib/lattice";

describe("getFactionForCell", () => {
  it("(-1,-1) is community (NW)", () => { expect(getFactionForCell(-1, -1)).toBe("community"); });
  it("(1,-1) is treasury (NE)", () => { expect(getFactionForCell(1, -1)).toBe("treasury"); });
  it("(1,1) is founder (SE)", () => { expect(getFactionForCell(1, 1)).toBe("founder"); });
  it("(-1,1) is pro-max (SW)", () => { expect(getFactionForCell(-1, 1)).toBe("pro-max"); });
  it("(0,0) returns null (origin is a point, not a cell)", () => { expect(getFactionForCell(0, 0)).toBeNull(); });
  it("cells on axes return null (boundaries)", () => {
    expect(getFactionForCell(0, -3)).toBeNull();
    expect(getFactionForCell(3, 0)).toBeNull();
    expect(getFactionForCell(0, 2)).toBeNull();
    expect(getFactionForCell(-2, 0)).toBeNull();
  });
  it("(-5, -3) is community (NW)", () => { expect(getFactionForCell(-5, -3)).toBe("community"); });
  it("(2, 4) is founder (SE)", () => { expect(getFactionForCell(2, 4)).toBe("founder"); });
});

describe("getCellsForRing", () => {
  it("ring 0 returns empty (origin point, no cells)", () => { expect(getCellsForRing(0)).toEqual([]); });
  it("ring 1 returns 4 genesis cells", () => {
    const cells = getCellsForRing(1);
    expect(cells).toHaveLength(4);
    const coords = cells.map((c) => `${c.cx},${c.cy}`).sort();
    expect(coords).toEqual(["-1,-1", "-1,1", "1,-1", "1,1"]);
  });
  it("ring 2 returns 12 new cells (3 per quadrant)", () => {
    const cells = getCellsForRing(2);
    expect(cells).toHaveLength(12);
    const nw = cells.filter((c) => c.cx < 0 && c.cy < 0);
    expect(nw).toHaveLength(3);
  });
  it("ring 3 returns 20 new cells (5 per quadrant)", () => {
    expect(getCellsForRing(3)).toHaveLength(20);
  });
  it("all cells in a ring have correct faction assignment", () => {
    const cells = getCellsForRing(2);
    for (const cell of cells) { expect(cell.faction).toBe(getFactionForCell(cell.cx, cell.cy)); }
  });
});

describe("buildAllCells", () => {
  it("totalRings=0 returns empty", () => { expect(Object.keys(buildAllCells(0))).toHaveLength(0); });
  it("totalRings=1 returns 4 cells (genesis)", () => { expect(Object.keys(buildAllCells(1))).toHaveLength(4); });
  it("totalRings=2 returns 16 cells (4 + 12)", () => { expect(Object.keys(buildAllCells(2))).toHaveLength(16); });
  it("totalRings=3 returns 36 cells (4 + 12 + 20)", () => { expect(Object.keys(buildAllCells(3))).toHaveLength(36); });
  it("cell IDs use cell-{cx}-{cy} format", () => {
    const cells = buildAllCells(1);
    expect(cells["cell--1--1"]).toBeDefined();
    expect(cells["cell-1--1"]).toBeDefined();
    expect(cells["cell-1-1"]).toBeDefined();
    expect(cells["cell--1-1"]).toBeDefined();
  });
  it("no cell exists at (0,0)", () => { expect(buildAllCells(5)["cell-0-0"]).toBeUndefined(); });
  it("no cells on axes", () => {
    const cells = buildAllCells(5);
    expect(cells["cell-0--1"]).toBeUndefined();
    expect(cells["cell-1-0"]).toBeUndefined();
  });
});

describe("getCellDensity", () => {
  it("cells near origin have higher density", () => { expect(getCellDensity(-1, -1)).toBeGreaterThan(getCellDensity(-5, -5)); });
  it("density is between 0 and 1", () => {
    expect(getCellDensity(1, 1)).toBeGreaterThan(0);
    expect(getCellDensity(1, 1)).toBeLessThanOrEqual(1);
  });
});

describe("getFrontierCell", () => {
  it("returns genesis cell when all are unclaimed", () => {
    const cells = buildAllCells(3);
    const frontier = getFrontierCell("community", cells);
    expect(frontier).not.toBeNull();
    expect(frontier!.cx).toBe(-1);
    expect(frontier!.cy).toBe(-1);
  });
  it("returns next nearest when genesis is claimed", () => {
    const cells = buildAllCells(3);
    cells["cell--1--1"].ownerId = "user-1";
    const frontier = getFrontierCell("community", cells);
    expect(frontier).not.toBeNull();
    expect(frontier!.cx).toBeLessThan(0);
    expect(frontier!.cy).toBeLessThan(0);
  });
  it("returns null when all cells are claimed", () => {
    const cells = buildAllCells(1);
    Object.values(cells).forEach(c => c.ownerId = "u");
    expect(getFrontierCell("community", cells)).toBeNull();
  });
});

describe("cellToPixel", () => {
  it("(0,0) maps to pixel (0,0)", () => { expect(cellToPixel(0, 0)).toEqual({ px: 0, py: 0 }); });
  it("(1,0) maps to (CELL_SIZE, 0)", () => { expect(cellToPixel(1, 0)).toEqual({ px: CELL_SIZE, py: 0 }); });
  it("(-1,-1) maps to (-CELL_SIZE, -CELL_SIZE)", () => { expect(cellToPixel(-1, -1)).toEqual({ px: -CELL_SIZE, py: -CELL_SIZE }); });
});
