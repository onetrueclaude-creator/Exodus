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
import { buildGenesisBlocknodes } from "@/lib/lattice";

describe("FACTION_COLORS", () => {
  it("all 4 factions have colors defined", () => {
    expect(FACTION_COLORS.community).toBe(0xffffff); // white — free tier
    expect(FACTION_COLORS.treasury).toBe(0xf97316); // gold orange
    expect(FACTION_COLORS.founder).toBe(0xd946ef); // fuchsia
    expect(FACTION_COLORS["pro-max"]).toBe(0x00ffff); // cyan — professional tier
  });
});

describe("createGridBackground", () => {
  it("returns a Graphics object", () => {
    const g = createGridBackground({}, [], 5);
    expect(g).toBeDefined();
  });

  it("calls fill for faction cells when faction is visible", () => {
    const nodes = buildGenesisBlocknodes();
    // Claim community genesis
    nodes["block-0-community"].ownerId = "user-001";
    const g = createGridBackground(nodes, ["community"], 5) as unknown as MockGraphics;
    expect(g.fill).toHaveBeenCalled();
  });

  it("calls fill for fog cells", () => {
    const g = createGridBackground({}, [], 2) as unknown as MockGraphics;
    // All cells should be fog-filled since no blocknodes
    expect(g.fill).toHaveBeenCalled();
  });

  it("calls stroke for grid lines", () => {
    const g = createGridBackground({}, [], 2) as unknown as MockGraphics;
    expect(g.stroke).toHaveBeenCalled();
    expect(g.setStrokeStyle).toHaveBeenCalled();
  });
});

describe("updateGridBackground", () => {
  it("calls clear before redrawing", () => {
    const nodes = buildGenesisBlocknodes();
    const g = createGridBackground(nodes, [], 5) as unknown as MockGraphics;
    // Clear the call count to verify clear() is called during update
    g.clear.mockClear();
    // updateGridBackground accepts Graphics type; cast via unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock Graphics instance passed in place of real Graphics
    updateGridBackground(g as any, nodes, ["community"], 5);
    expect(g.clear).toHaveBeenCalledOnce();
  });
});
