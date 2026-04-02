import { describe, it, expect } from "vitest";
import {
  getArmCell,
  getSecureStrength,
  generateArmPath,
  cellToPixel,
  ARM_BASE_ANGLES,
  CELL_SIZE,
} from "@/lib/spiral";

describe("getArmCell", () => {
  it("ring 0 community should be directly above origin (0,-1)", () => {
    const cell = getArmCell("community", 0);
    // At ring 0: angle=270°, radius=sqrt(2)≈1.414
    // cos(270°)=0, sin(270°)=-1 → (0,-1) after rounding
    expect(cell.cx).toBe(0);
    expect(cell.cy).toBe(-1);
  });

  it("ring 0 treasury should be directly right of origin (1,0)", () => {
    const cell = getArmCell("treasury", 0);
    // angle=0°, cos(0°)=1, sin(0°)=0 → (1,0)
    expect(cell.cx).toBe(1);
    expect(cell.cy).toBe(0);
  });

  it("ring 0 founder should be directly below origin (0,1)", () => {
    const cell = getArmCell("founder", 0);
    // angle=90°, cos(90°)=0, sin(90°)=1 → (0,1)
    expect(cell.cx).toBe(0);
    expect(cell.cy).toBe(1);
  });

  it("ring 0 pro-max should be directly left of origin (-1,0)", () => {
    const cell = getArmCell("pro-max", 0);
    // angle=180°, cos(180°)=-1, sin(180°)=0 → (-1,0)
    expect(cell.cx).toBe(-1);
    expect(cell.cy).toBe(0);
  });

  it("ring 1 community should be further than ring 0", () => {
    const r0 = getArmCell("community", 0);
    const r1 = getArmCell("community", 1);
    const dist0 = Math.sqrt(r0.cx ** 2 + r0.cy ** 2);
    const dist1 = Math.sqrt(r1.cx ** 2 + r1.cy ** 2);
    expect(dist1).toBeGreaterThanOrEqual(dist0);
  });

  it("returns integer cell coordinates", () => {
    for (let ring = 0; ring < 10; ring++) {
      const cell = getArmCell("community", ring);
      expect(Number.isInteger(cell.cx)).toBe(true);
      expect(Number.isInteger(cell.cy)).toBe(true);
    }
  });
});

describe("getSecureStrength", () => {
  it("ring 0 returns 100 (maximum strength)", () => {
    expect(getSecureStrength(0)).toBe(100);
  });

  it("strength decreases as ring increases", () => {
    const s0 = getSecureStrength(0);
    const s5 = getSecureStrength(5);
    const s10 = getSecureStrength(10);
    expect(s5).toBeLessThan(s0);
    expect(s10).toBeLessThan(s5);
  });

  it("never drops below 1", () => {
    for (let ring = 0; ring <= 100; ring++) {
      expect(getSecureStrength(ring)).toBeGreaterThanOrEqual(1);
    }
  });

  it("ring 40 is near the minimum (≥1, ≤10)", () => {
    const s = getSecureStrength(40);
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(10);
  });
});

describe("generateArmPath", () => {
  it("returns correct number of nodes", () => {
    const path = generateArmPath("community", 5);
    expect(path).toHaveLength(5);
  });

  it("first node matches ring 0", () => {
    const path = generateArmPath("treasury", 3);
    const r0 = getArmCell("treasury", 0);
    expect(path[0]).toEqual(r0);
  });

  it("returns empty array for count 0", () => {
    expect(generateArmPath("founder", 0)).toEqual([]);
  });
});

describe("cellToPixel", () => {
  it("origin maps to (0, 0) pixels", () => {
    expect(cellToPixel(0, 0)).toEqual({ px: 0, py: 0 });
  });

  it("cell (1, 0) maps to (CELL_SIZE, 0)", () => {
    expect(cellToPixel(1, 0)).toEqual({ px: CELL_SIZE, py: 0 });
  });

  it("cell (-1, -1) maps to (-CELL_SIZE, -CELL_SIZE)", () => {
    expect(cellToPixel(-1, -1)).toEqual({ px: -CELL_SIZE, py: -CELL_SIZE });
  });
});

describe("ARM_BASE_ANGLES", () => {
  it("all 4 factions have base angles defined", () => {
    expect(ARM_BASE_ANGLES.community).toBe(270); // up → curves upper-left
    expect(ARM_BASE_ANGLES.treasury).toBe(0); // right → curves upper-right
    expect(ARM_BASE_ANGLES.founder).toBe(90); // down → curves lower-right
    expect(ARM_BASE_ANGLES["pro-max"]).toBe(180); // left → curves lower-left
  });
});
