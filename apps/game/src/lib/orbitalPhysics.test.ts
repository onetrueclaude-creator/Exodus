import { describe, it, expect } from "vitest";
import { applyAnchorSprings, integrate, type PhysicsBody } from "./orbitalPhysics";

function body(over: Partial<PhysicsBody>): PhysicsBody {
  return { x: 0, y: 0, vx: 0, vy: 0, mass: 1, pinned: false, ...over } as PhysicsBody;
}

describe("applyAnchorSprings", () => {
  it("pulls a body toward its anchor over time", () => {
    const b = body({ x: 100, y: 0, anchor: { x: 0, y: 0 }, anchorStrength: 0.5 });
    for (let i = 0; i < 2500; i++) {
      applyAnchorSprings([b], 1 / 30, 1);
      integrate([b], 1 / 30, 0.86);
    }
    expect(Math.hypot(b.x, b.y)).toBeLessThan(2); // converged near anchor (gentle spring; ~1000 steps to reach <2)
    expect(Number.isFinite(b.x)).toBe(true);
  });
  it("ignores pinned and anchorless bodies", () => {
    const p = body({ x: 50, y: 0, pinned: true, anchor: { x: 0, y: 0 } });
    const n = body({ x: 50, y: 0 }); // no anchor
    applyAnchorSprings([p, n], 1 / 30, 1);
    expect(p.vx).toBe(0);
    expect(n.vx).toBe(0);
  });
});
