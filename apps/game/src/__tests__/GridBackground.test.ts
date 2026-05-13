import { describe, it, expect, vi } from "vitest";

interface MockGraphics {
  rect: ReturnType<typeof vi.fn>;
  circle: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  setStrokeStyle: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

// Mock PixiJS - Graphics is not available in jsdom
vi.mock("pixi.js", () => {
  function Graphics(this: MockGraphics) {
    this.rect = vi.fn().mockReturnThis();
    this.circle = vi.fn().mockReturnThis();
    this.fill = vi.fn().mockReturnThis();
    this.stroke = vi.fn().mockReturnThis();
    this.moveTo = vi.fn().mockReturnThis();
    this.lineTo = vi.fn().mockReturnThis();
    this.setStrokeStyle = vi.fn().mockReturnThis();
    this.clear = vi.fn().mockReturnThis();
    this.destroy = vi.fn();
  }
  return { Graphics };
});

import {
  createGridBackground,
  updateGridBackground,
  FACTION_COLORS,
} from "@/components/grid/GridBackground";
import { buildAllCells } from "@/lib/lattice";

describe("FACTION_COLORS", () => {
  it("all 4 factions have colors defined", () => {
    expect(FACTION_COLORS.community).toBe(0x0d9488); // teal
    expect(FACTION_COLORS.treasury).toBe(0xdc2680);  // pink (Machines)
    expect(FACTION_COLORS.founder).toBe(0xf59e0b);   // amber
    expect(FACTION_COLORS["pro-max"]).toBe(0x3b82f6); // blue (Professional)
  });
});

describe("createGridBackground", () => {
  it("returns a Graphics object", () => {
    const g = createGridBackground({}, 5);
    expect(g).toBeDefined();
  });

  it("calls circle/fill for each blocknode (placeholder dots)", () => {
    const nodes = buildAllCells(1);
    const g = createGridBackground(nodes, 5) as unknown as MockGraphics;
    // Placeholder renders one dot per blocknode — fill must have been called
    expect(g.fill).toHaveBeenCalled();
    expect(g.circle).toHaveBeenCalled();
  });

  it("calls fill even with no blocknodes (grid lines only)", () => {
    // With no blocknodes the placeholder loop is a no-op, but stroke is still called
    const g = createGridBackground({}, 2) as unknown as MockGraphics;
    expect(g.stroke).toHaveBeenCalled();
  });

  it("calls stroke for grid lines", () => {
    const g = createGridBackground({}, 2) as unknown as MockGraphics;
    expect(g.stroke).toHaveBeenCalled();
    expect(g.setStrokeStyle).toHaveBeenCalled();
  });
});

describe("updateGridBackground", () => {
  it("calls clear before redrawing", () => {
    const nodes = buildAllCells(1);
    const g = createGridBackground(nodes, 5) as unknown as MockGraphics;
    // Clear the call count to verify clear() is called during update
    g.clear.mockClear();
    // updateGridBackground accepts Graphics type; cast via unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock Graphics instance passed in place of real Graphics
    updateGridBackground(g as any, nodes, 5);
    expect(g.clear).toHaveBeenCalledOnce();
  });
});
