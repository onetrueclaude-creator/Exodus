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

interface MockContainer {
  children: unknown[];
  addChild: ReturnType<typeof vi.fn>;
  getChildAt: ReturnType<typeof vi.fn>;
  removeChildren: ReturnType<typeof vi.fn>;
}

// Mock PixiJS — Canvas/WebGL not available in jsdom
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

  function Container(this: MockContainer) {
    this.children = [];
    this.addChild = vi.fn((child: unknown) => {
      this.children.push(child);
      return child;
    });
    this.getChildAt = vi.fn((index: number) => this.children[index]);
    this.removeChildren = vi.fn(() => { this.children = []; });
  }

  function Sprite() {
    return { anchor: { set: vi.fn() }, position: { set: vi.fn() }, scale: { set: vi.fn() } };
  }

  const Texture = { from: vi.fn(() => ({})) };

  return { Graphics, Container, Sprite, Texture };
});

import {
  createGridBackground,
  updateGridBackground,
  TIER_COLORS,
} from "@/components/grid/GridBackground";
import { buildAllCells } from "@/lib/lattice";

describe("TIER_COLORS", () => {
  it("all 3 tiers have colors defined", () => {
    expect(TIER_COLORS.community).toBe(0x0d9488); // teal
    expect(TIER_COLORS.professional).toBe(0x3b82f6); // blue
    expect(TIER_COLORS.founder).toBe(0xf59e0b); // amber
  });
});

describe("createGridBackground", () => {
  it("returns a Container with two children (heatmap + graphics)", () => {
    const container = createGridBackground({}, 5) as unknown as MockContainer;
    expect(container).toBeDefined();
    // children[0] = heatmap sprite, children[1] = graphics layer
    expect(container.children).toHaveLength(2);
  });

  it("calls circle/fill for each blocknode (placeholder dots) on the graphics layer", () => {
    const nodes = buildAllCells(1);
    const container = createGridBackground(nodes, 5) as unknown as MockContainer;
    const graphics = container.children[1] as MockGraphics;
    // Placeholder renders one dot per blocknode — fill must have been called
    expect(graphics.fill).toHaveBeenCalled();
    expect(graphics.circle).toHaveBeenCalled();
  });

  it("calls stroke for grid lines even with no blocknodes", () => {
    const container = createGridBackground({}, 2) as unknown as MockContainer;
    const graphics = container.children[1] as MockGraphics;
    expect(graphics.stroke).toHaveBeenCalled();
    expect(graphics.setStrokeStyle).toHaveBeenCalled();
  });
});

describe("updateGridBackground", () => {
  it("calls clear before redrawing the graphics layer", () => {
    const nodes = buildAllCells(1);
    const container = createGridBackground(nodes, 5) as unknown as MockContainer;
    const graphics = container.children[1] as MockGraphics;
    // Clear the call count to verify clear() is called during update
    graphics.clear.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock Container passed in place of real Container
    updateGridBackground(container as any, nodes, 5);
    expect(graphics.clear).toHaveBeenCalledOnce();
  });
});
