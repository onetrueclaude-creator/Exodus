import { describe, it, expect } from "vitest";
import { applyAnchorSprings, integrate, step, DEFAULT_PHYSICS, type PhysicsBody } from "./orbitalPhysics";

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

// Models the subagent drag mechanism in OrbitalCanvas: while dragging, the body is
// pinned (physics frozen) and its position + anchor are set to the cursor; on release
// it's unpinned and the anchor spring must hold it at the DROP spot, not snap back.
describe("subagent drag (re-anchor) mechanism", () => {
  it("a pinned body stays frozen, then settles at its NEW anchor after release", () => {
    // Start anchored at the spawn seat (200,0).
    const b = body({ x: 200, y: 0, anchor: { x: 200, y: 0 }, anchorStrength: 0.6, pinned: true });
    // --- drag: pinned, position + anchor moved to the drop point (-120, 80) ---
    b.x = -120;
    b.y = 80;
    b.vx = 0;
    b.vy = 0;
    b.anchor = { x: -120, y: 80 };
    // While pinned, the physics tick must not move it at all.
    for (let i = 0; i < 50; i++) step([b], [], 1 / 30, { ...DEFAULT_PHYSICS, anchorK: 0.8 });
    expect(b.x).toBe(-120);
    expect(b.y).toBe(80);
    // --- release: unpin and let it settle ---
    b.pinned = false;
    for (let i = 0; i < 3000; i++) step([b], [], 1 / 30, { ...DEFAULT_PHYSICS, anchorK: 0.8 });
    // It holds near the DROP anchor (a small inward offset from gravity is expected),
    // and nowhere near the original spawn seat — the drag "sticks".
    expect(Math.hypot(b.x - -120, b.y - 80)).toBeLessThan(20);
    expect(Math.hypot(b.x - 200, b.y - 0)).toBeGreaterThan(150);
  });
});
