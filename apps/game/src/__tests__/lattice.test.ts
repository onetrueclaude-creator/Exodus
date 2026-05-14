import { describe, it, expect } from "vitest";
import {
  CELL_SIZE,
  cellToPixel,
  getCellsForRing,
  buildAllCells,
  buildCellsForRing,
  getCellDensity,
  FACTIONS,
  createCellInternal,
  setCellOwner,
  clearCellOwner,
} from "@/lib/lattice";

describe("buildAllCells", () => {
  it("totalRings=0 returns empty", () => { expect(Object.keys(buildAllCells(0))).toHaveLength(0); });
  it("cell IDs use cell-{cx}-{cy} format", () => {
    const cells = buildAllCells(2);
    expect(cells["cell--1--1"]).toBeDefined();
    expect(cells["cell-1--1"]).toBeDefined();
    expect(cells["cell-1-1"]).toBeDefined();
    expect(cells["cell--1-1"]).toBeDefined();
  });
});

describe("getCellDensity", () => {
  it("cells near origin have higher density", () => { expect(getCellDensity(-1, 1)).toBeGreaterThan(getCellDensity(-5, 5)); });
  it("density is between 0 and 1", () => {
    expect(getCellDensity(1, 1)).toBeGreaterThan(0);
    expect(getCellDensity(1, 1)).toBeLessThanOrEqual(1);
  });
});

describe("cellToPixel", () => {
  it("(0,0) maps to pixel (0,0)", () => { expect(cellToPixel(0, 0)).toEqual({ px: 0, py: 0 }); });
  it("(1,0) maps to (CELL_SIZE, 0)", () => { expect(cellToPixel(1, 0)).toEqual({ px: CELL_SIZE, py: 0 }); });
  it("(-1,1) maps to (-CELL_SIZE, -CELL_SIZE) — Y negated for screen", () => {
    expect(cellToPixel(-1, 1)).toEqual({ px: -CELL_SIZE, py: -CELL_SIZE });
  });
  it("(1,-1) maps to (CELL_SIZE, CELL_SIZE) — negative Y renders downward", () => {
    expect(cellToPixel(1, -1)).toEqual({ px: CELL_SIZE, py: CELL_SIZE });
  });
});

describe("getCellsForRing — open grid", () => {
  it("ring 0 is just origin (0,0)", () => {
    const cells = getCellsForRing(0);
    expect(cells).toHaveLength(1);
    expect(cells[0].cx).toBe(0);
    expect(cells[0].cy).toBe(0);
  });

  it("ring 1 has 8 cells (3x3 minus origin)", () => {
    const cells = getCellsForRing(1);
    expect(cells).toHaveLength(8);
    const coords = cells.map(c => `${c.cx},${c.cy}`).sort();
    expect(coords).toEqual([
      "-1,-1", "-1,0", "-1,1",
      "0,-1",          "0,1",
      "1,-1",  "1,0",  "1,1",
    ].sort());
  });

  it("ring 2 has 16 cells (5x5 minus 3x3 inner)", () => {
    const cells = getCellsForRing(2);
    expect(cells).toHaveLength(16);
    // verify all cells have max(|cx|, |cy|) === 2
    for (const cell of cells) {
      expect(Math.max(Math.abs(cell.cx), Math.abs(cell.cy))).toBe(2);
    }
  });

  it("ring N has 8*N cells for N >= 1", () => {
    for (let n = 1; n <= 5; n++) {
      expect(getCellsForRing(n)).toHaveLength(8 * n);
    }
  });
});

describe("createCell — open grid", () => {
  it("creates an origin cell (0,0) with faction null", () => {
    const cell = createCellInternal(0, 0, 0);
    expect(cell.cx).toBe(0);
    expect(cell.cy).toBe(0);
    expect(cell.faction).toBeNull();
    expect(cell.ownerId).toBeNull();
    expect(cell.secureStrength).toBeCloseTo(100, 0); // density 1.0 at origin
  });

  it("creates axis cells with faction null", () => {
    expect(createCellInternal(0, 5, 5).faction).toBeNull();
    expect(createCellInternal(5, 0, 5).faction).toBeNull();
    expect(createCellInternal(-3, 0, 3).faction).toBeNull();
  });

  it("creates non-axis cells with faction null (no quadrant binding)", () => {
    expect(createCellInternal(1, 1, 1).faction).toBeNull();
    expect(createCellInternal(-2, 3, 3).faction).toBeNull();
  });
});

describe("setCellOwner / clearCellOwner", () => {
  it("setCellOwner returns new cell with owner + faction set", () => {
    const c = createCellInternal(2, 3, 3);
    const owned = setCellOwner(c, "user-abc", "community");
    expect(owned.ownerId).toBe("user-abc");
    expect(owned.faction).toBe("community");
    expect(c.ownerId).toBeNull(); // original unchanged (pure)
    expect(c.faction).toBeNull();
  });

  it("clearCellOwner returns new cell with owner + faction cleared", () => {
    const c = createCellInternal(2, 3, 3);
    const owned = setCellOwner(c, "user-abc", "community");
    const cleared = clearCellOwner(owned);
    expect(cleared.ownerId).toBeNull();
    expect(cleared.faction).toBeNull();
    expect(owned.ownerId).toBe("user-abc"); // pure
  });
});
