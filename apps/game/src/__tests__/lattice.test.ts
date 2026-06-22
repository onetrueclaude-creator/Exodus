import { describe, it, expect } from "vitest";
import {
  getCellsForRing,
  buildAllCells,
  TIERS,
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

describe("TIERS", () => {
  it("enumerates the three player tiers", () => {
    expect(TIERS).toEqual(["community", "professional", "founder"]);
  });
});

describe("createCell — open grid", () => {
  it("creates an origin cell (0,0) with tier null", () => {
    const cell = createCellInternal(0, 0, 0);
    expect(cell.cx).toBe(0);
    expect(cell.cy).toBe(0);
    expect(cell.tier).toBeNull();
    expect(cell.ownerId).toBeNull();
    expect(cell.secureStrength).toBeCloseTo(100, 0); // density 1.0 at origin
  });

  it("creates axis cells with tier null", () => {
    expect(createCellInternal(0, 5, 5).tier).toBeNull();
    expect(createCellInternal(5, 0, 5).tier).toBeNull();
    expect(createCellInternal(-3, 0, 3).tier).toBeNull();
  });

  it("creates non-axis cells with tier null (no quadrant binding)", () => {
    expect(createCellInternal(1, 1, 1).tier).toBeNull();
    expect(createCellInternal(-2, 3, 3).tier).toBeNull();
  });
});

describe("setCellOwner / clearCellOwner", () => {
  it("setCellOwner returns new cell with owner + tier set", () => {
    const c = createCellInternal(2, 3, 3);
    const owned = setCellOwner(c, "user-abc", "community");
    expect(owned.ownerId).toBe("user-abc");
    expect(owned.tier).toBe("community");
    expect(c.ownerId).toBeNull(); // original unchanged (pure)
    expect(c.tier).toBeNull();
  });

  it("clearCellOwner returns new cell with owner + tier cleared", () => {
    const c = createCellInternal(2, 3, 3);
    const owned = setCellOwner(c, "user-abc", "community");
    const cleared = clearCellOwner(owned);
    expect(cleared.ownerId).toBeNull();
    expect(cleared.tier).toBeNull();
    expect(owned.ownerId).toBe("user-abc"); // pure
  });
});
