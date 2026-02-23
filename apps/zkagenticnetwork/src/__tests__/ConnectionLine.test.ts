import { describe, it, expect, vi, type MockedFunction } from "vitest";

/** Shape of the mock Graphics returned by pixi.js mock */
interface MockGraphicsInstance {
  setStrokeStyle: MockedFunction<() => MockGraphicsInstance>;
  moveTo: MockedFunction<() => MockGraphicsInstance>;
  lineTo: MockedFunction<() => MockGraphicsInstance>;
  stroke: MockedFunction<() => MockGraphicsInstance>;
}

vi.mock("pixi.js", () => {
  function MockGraphics(this: MockGraphicsInstance) {
    this.setStrokeStyle = vi.fn().mockReturnThis();
    this.moveTo = vi.fn().mockReturnThis();
    this.lineTo = vi.fn().mockReturnThis();
    this.stroke = vi.fn().mockReturnThis();
  }
  return { Graphics: MockGraphics };
});

import { createBlocknodeConnections } from "@/components/grid/ConnectionLine";
import type { BlockNode } from "@/types";

const makeNode = (overrides: Partial<BlockNode>): BlockNode => ({
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

/** Cast a Graphics return value to the mock shape for test assertions */
const asMock = (g: ReturnType<typeof createBlocknodeConnections>) =>
  g as unknown as MockGraphicsInstance;

describe("createBlocknodeConnections", () => {
  it("returns a Graphics object", () => {
    const node = makeNode({});
    const result = createBlocknodeConnections(node, [], true);
    expect(result).toBeDefined();
  });

  it("draws lines to same-faction neighbors only", () => {
    const source = makeNode({ id: "block-0-community", cx: -1, cy: -1, faction: "community" });
    const sameFaction = makeNode({
      id: "block-1-community",
      cx: -2,
      cy: -2,
      faction: "community",
      ringIndex: 1,
    });
    const diffFaction = makeNode({ id: "block-0-treasury", cx: 1, cy: -1, faction: "treasury" });

    const g = asMock(createBlocknodeConnections(source, [sameFaction, diffFaction], true));

    // Should draw exactly 1 line (to sameFaction only)
    expect(g.moveTo).toHaveBeenCalledTimes(1);
    expect(g.lineTo).toHaveBeenCalledTimes(1);
  });

  it("does not draw line to self", () => {
    const source = makeNode({ id: "block-0-community" });
    const g = asMock(createBlocknodeConnections(source, [source], true));
    expect(g.moveTo).not.toHaveBeenCalled();
  });

  it("draws no lines when no neighbors", () => {
    const source = makeNode({});
    const g = asMock(createBlocknodeConnections(source, [], true));
    expect(g.moveTo).not.toHaveBeenCalled();
  });

  it("uses lower alpha when not visible", () => {
    const source = makeNode({ id: "block-0-community", faction: "community" });
    const neighbor = makeNode({ id: "block-1-community", faction: "community", ringIndex: 1 });

    const gVisible = asMock(createBlocknodeConnections(source, [neighbor], true));
    const gHidden = asMock(createBlocknodeConnections(source, [neighbor], false));

    // Both should draw, but with different alphas
    expect(gVisible.setStrokeStyle).toHaveBeenCalledWith(expect.objectContaining({ alpha: 0.4 }));
    expect(gHidden.setStrokeStyle).toHaveBeenCalledWith(expect.objectContaining({ alpha: 0.08 }));
  });
});
