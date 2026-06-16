import { describe, it, expect } from "vitest";
import { buildScene } from "./orbitalScene";
import type { SeatInput } from "../types/orbital";

const seats: SeatInput[] = [
  { id: "core", faction: "singularity", isSingularity: true, activity: 0 },
  { id: "p1", faction: "community", activity: 90 },
  { id: "p2", faction: "professional", activity: 50 },
  { id: "p2-a", faction: "professional", parentId: "p2", activity: 0 },
];

describe("buildScene", () => {
  it("places the singularity at the origin", () => {
    const s = buildScene(seats, { radialScale: 24 });
    const core = s.nodes.find((n) => n.id === "core")!;
    expect(core.kind).toBe("singularity");
    expect(core).toMatchObject({ x: 0, y: 0 });
  });
  it("ranks players by activity (p1 inner of p2)", () => {
    const s = buildScene(seats, { radialScale: 24 });
    const p1 = s.nodes.find((n) => n.id === "p1")!;
    const p2 = s.nodes.find((n) => n.id === "p2")!;
    expect(Math.hypot(p1.x, p1.y)).toBeLessThan(Math.hypot(p2.x, p2.y));
  });
  it("orbits subagents near their parent (within nearest-neighbour spacing)", () => {
    const s = buildScene(seats, { radialScale: 24 });
    const p2 = s.nodes.find((n) => n.id === "p2")!;
    const sub = s.nodes.find((n) => n.id === "p2-a")!;
    expect(sub.kind).toBe("subagent");
    expect(Math.hypot(sub.x - p2.x, sub.y - p2.y)).toBeLessThan(24); // < radialScale
  });
  it("emits a permanent family edge parent→subagent", () => {
    const s = buildScene(seats, { radialScale: 24 });
    const fam = s.edges.filter((e) => e.kind === "family");
    expect(fam.length).toBe(1);
    expect(fam[0].alpha).toBeGreaterThan(0.5);
  });
});
