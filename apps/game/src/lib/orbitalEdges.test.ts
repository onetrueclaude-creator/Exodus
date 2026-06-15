import { describe, it, expect } from "vitest";
import { edgeAlpha, EDGE_FADE_BLOCKS } from "./orbitalEdges";

describe("edgeAlpha", () => {
  it("is full at age 0 and zero at/after the fade window", () => {
    expect(EDGE_FADE_BLOCKS).toBe(30);
    expect(edgeAlpha(0, 0.6)).toBeCloseTo(0.6, 6);
    expect(edgeAlpha(15, 0.6)).toBeCloseTo(0.3, 6);
    expect(edgeAlpha(30, 0.6)).toBe(0);
    expect(edgeAlpha(99, 0.6)).toBe(0);
  });
  it("clamps negative ages to full", () => {
    expect(edgeAlpha(-3, 0.6)).toBeCloseTo(0.6, 6);
  });
});
