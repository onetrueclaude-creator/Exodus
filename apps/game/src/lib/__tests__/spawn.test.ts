import { describe, it, expect } from "vitest";
import { cellsInChebyshevRing } from "@/lib/spawn";

describe("cellsInChebyshevRing", () => {
  it("ring 0 returns [(0,0)]", () => {
    expect(cellsInChebyshevRing(0)).toEqual([{ cx: 0, cy: 0 }]);
  });

  it("ring 1 returns 8 cells sorted lex by (cx, cy)", () => {
    expect(cellsInChebyshevRing(1)).toEqual([
      { cx: -1, cy: -1 },
      { cx: -1, cy: 0 },
      { cx: -1, cy: 1 },
      { cx: 0, cy: -1 },
      { cx: 0, cy: 1 },
      { cx: 1, cy: -1 },
      { cx: 1, cy: 0 },
      { cx: 1, cy: 1 },
    ]);
  });

  it("ring 2 returns 16 cells, all at Chebyshev distance 2", () => {
    const cells = cellsInChebyshevRing(2);
    expect(cells).toHaveLength(16);
    for (const c of cells) {
      expect(Math.max(Math.abs(c.cx), Math.abs(c.cy))).toBe(2);
    }
  });

  it("negative ring returns []", () => {
    expect(cellsInChebyshevRing(-1)).toEqual([]);
  });
});
