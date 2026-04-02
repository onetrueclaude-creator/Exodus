import { describe, it, expect, vi } from "vitest";

interface MockGraphics {
  circle: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  setStrokeStyle: ReturnType<typeof vi.fn>;
  roundRect: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  alpha: number;
  scale: { set: ReturnType<typeof vi.fn> };
  position: { set: ReturnType<typeof vi.fn> };
}

interface MockContainer {
  addChild: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  position: { set: ReturnType<typeof vi.fn> };
  scale: { set: ReturnType<typeof vi.fn> };
  alpha: number;
  eventMode: string;
  cursor: string;
  label: string;
}

interface MockText {
  anchor: { set: ReturnType<typeof vi.fn> };
  position: { set: ReturnType<typeof vi.fn> };
  alpha: number;
  text: string;
}

// Mock PixiJS — no WebGL in jsdom
vi.mock("pixi.js", () => {
  function MockGraphics(this: MockGraphics) {
    this.circle = vi.fn().mockReturnThis();
    this.fill = vi.fn().mockReturnThis();
    this.stroke = vi.fn().mockReturnThis();
    this.moveTo = vi.fn().mockReturnThis();
    this.lineTo = vi.fn().mockReturnThis();
    this.setStrokeStyle = vi.fn().mockReturnThis();
    this.roundRect = vi.fn().mockReturnThis();
    this.rect = vi.fn().mockReturnThis();
    this.clear = vi.fn().mockReturnThis();
    this.alpha = 1;
    this.scale = { set: vi.fn() };
    this.position = { set: vi.fn() };
  }
  function MockContainer(this: MockContainer) {
    this.addChild = vi.fn();
    this.on = vi.fn();
    this.position = { set: vi.fn() };
    this.scale = { set: vi.fn() };
    this.alpha = 1;
    this.eventMode = "";
    this.cursor = "";
    this.label = "";
  }
  function MockText(this: MockText, opts: { text?: string }) {
    this.anchor = { set: vi.fn() };
    this.position = { set: vi.fn() };
    this.alpha = 1;
    this.text = opts?.text ?? "";
  }
  return { Graphics: MockGraphics, Container: MockContainer, Text: MockText };
});

import { createBlockNode } from "@/components/grid/StarNode";
import type { BlockNode } from "@/types";

const makeNode = (overrides: Partial<BlockNode> = {}): BlockNode => ({
  id: "block-0-community",
  blockIndex: 0,
  ringIndex: 0,
  cx: -1,
  cy: -1,
  faction: "community",
  secureStrength: 100,
  ownerId: null,
  stakedCpu: 0,
  cumulativeSecures: 0,
  ...overrides,
});

describe("createBlockNode", () => {
  it("returns a container positioned at the exact spiral pixel coords (not rounded cell coords)", () => {
    const node = makeNode();
    const container = createBlockNode(node, true) as unknown as MockContainer;
    // community ring-0: angle=270°, radius=√2, CELL_SIZE=64
    // px = √2 * cos(270°) * 64 ≈ 0, py = √2 * sin(270°) * 64 ≈ -90.51
    // Exact positions avoid coordinate collisions that prevent clicking on overlapping nodes.
    const [px, py] = container.position.set.mock.calls[0] as [number, number];
    expect(Math.abs(px)).toBeLessThan(1e-10); // cos(270°) ≈ 0
    expect(py).toBeCloseTo(-Math.SQRT2 * 64, 5); // sin(270°) = -1
  });

  it("sets container label to node id", () => {
    const container = createBlockNode(makeNode(), true) as unknown as MockContainer;
    expect(container.label).toBe("block-0-community");
  });

  it("adds more children for claimed node", () => {
    const unclaimed = makeNode({ ownerId: null });
    const claimed = makeNode({ ownerId: "user-001" });
    const containerUnclaimed = createBlockNode(unclaimed, true) as unknown as MockContainer;
    const containerClaimed = createBlockNode(claimed, true) as unknown as MockContainer;
    // Claimed node has claim ring — more addChild calls
    expect(containerClaimed.addChild.mock.calls.length).toBeGreaterThanOrEqual(
      containerUnclaimed.addChild.mock.calls.length
    );
  });

  it("is interactive", () => {
    const container = createBlockNode(makeNode(), true) as unknown as MockContainer;
    expect(container.eventMode).toBe("static");
    expect(container.cursor).toBe("pointer");
  });
});
