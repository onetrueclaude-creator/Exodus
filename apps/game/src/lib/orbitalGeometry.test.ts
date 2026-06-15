import { describe, it, expect } from "vitest";
import {
  GOLDEN_ANGLE_DEG,
  phylloPos,
  bandOf,
  hardnessOf,
  SEATS_INNER_BAND,
} from "./orbitalGeometry";

describe("phylloPos", () => {
  it("uses the golden angle (137.507…°)", () => {
    expect(GOLDEN_ANGLE_DEG).toBeCloseTo(137.50776, 4);
  });
  it("places k=0 at the origin", () => {
    expect(phylloPos(0, 10)).toEqual({ x: 0, y: 0 });
  });
  it("radius grows as c·√k", () => {
    const p = phylloPos(4, 10); // r = 10·√4 = 20
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(20, 6);
  });
  it("rotates each seat by the golden angle", () => {
    const a1 = Math.atan2(phylloPos(1, 10).y, phylloPos(1, 10).x);
    const a2 = Math.atan2(phylloPos(2, 10).y, phylloPos(2, 10).x);
    const stepDeg = (((a2 - a1) * 180) / Math.PI + 360) % 360;
    expect(stepDeg).toBeCloseTo(GOLDEN_ANGLE_DEG, 3);
  });
});

describe("bands", () => {
  it("inner band K1=8 holds ranks 1..8", () => {
    expect(SEATS_INNER_BAND).toBe(8);
    expect(bandOf(1)).toBe(1);
    expect(bandOf(8)).toBe(1);
    expect(bandOf(9)).toBe(2); // ceil(√(9/8)) = ceil(1.06) = 2
    expect(bandOf(32)).toBe(2); // ceil(√(32/8)) = ceil(2) = 2
    expect(bandOf(33)).toBe(3);
  });
  it("band b holds (2b−1)·K1 seats", () => {
    const count = (b: number) =>
      Array.from({ length: 200 }, (_, i) => i + 1).filter((k) => bandOf(k) === b).length;
    expect(count(1)).toBe(8); // (2·1−1)·8
    expect(count(2)).toBe(24); // (2·2−1)·8
    expect(count(3)).toBe(40); // (2·3−1)·8
  });
  it("hardness = 16 × band", () => {
    expect(hardnessOf(1)).toBe(16);
    expect(hardnessOf(9)).toBe(32);
  });
});

describe("non-overlap invariant", () => {
  const angleDeg = (k: number) => ((k * GOLDEN_ANGLE_DEG) % 360 + 360) % 360;
  const circDist = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  };

  it("no two of the first 2000 seats share an angle", () => {
    const angles = Array.from({ length: 2000 }, (_, i) => angleDeg(i + 1)).sort((a, b) => a - b);
    let minGap = 360;
    for (let i = 1; i < angles.length; i++) minGap = Math.min(minGap, angles[i] - angles[i - 1]);
    expect(minGap).toBeGreaterThan(0.0001); // strictly distinct
  });

  it("worst-case spoke clearance over k=1..512 exceeds 0.4°", () => {
    const A = Array.from({ length: 512 }, (_, i) => angleDeg(i + 1));
    let worst = 360;
    for (let i = 0; i < A.length; i++)
      for (let j = 0; j < i; j++) worst = Math.min(worst, circDist(A[i], A[j]));
    expect(worst).toBeGreaterThan(0.4);
  });
});
