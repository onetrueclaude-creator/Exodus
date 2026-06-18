import { describe, it, expect } from "vitest";
import { buildScene, SUBAGENT_ORBIT_FRACTION } from "./orbitalScene";
import { SUBAGENT_TINT, TIER_TINT } from "../types/orbital";
import type { SeatInput } from "../types/orbital";

const seats: SeatInput[] = [
  { id: "core", tier: "singularity", isSingularity: true, activity: 0 },
  { id: "p1", tier: "community", activity: 90 },
  { id: "p2", tier: "professional", activity: 50 },
  { id: "p2-a", tier: "professional", parentId: "p2", activity: 0 },
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
  it("orbits subagents at SUBAGENT_ORBIT_FRACTION × radialScale from their parent", () => {
    const c = 24;
    const s = buildScene(seats, { radialScale: c });
    const p2 = s.nodes.find((n) => n.id === "p2")!;
    const sub = s.nodes.find((n) => n.id === "p2-a")!;
    expect(sub.kind).toBe("subagent");
    // Spawn distance is the configured fraction of radialScale (bumped well away
    // from the homenode so a fresh subagent doesn't render on top of its parent).
    expect(Math.hypot(sub.x - p2.x, sub.y - p2.y)).toBeCloseTo(SUBAGENT_ORBIT_FRACTION * c, 5);
    expect(SUBAGENT_ORBIT_FRACTION).toBeGreaterThanOrEqual(1); // ≥ one ring out
  });

  it("renders subagents tier-less: neutral SUBAGENT_TINT, no player tier on the node", () => {
    const s = buildScene(seats, { radialScale: 24 });
    const sub = s.nodes.find((n) => n.id === "p2-a")!;
    expect(sub.tint).toBe(SUBAGENT_TINT);
    // never coloured by a player Tier, even though its seat had a placeholder tier
    expect(sub.tint).not.toBe(TIER_TINT.professional);
    expect(sub.tier).toBeUndefined();
  });

  it("respects an explicit subagentOrbitFraction override", () => {
    const s = buildScene(seats, { radialScale: 24, subagentOrbitFraction: 0.5 });
    const p2 = s.nodes.find((n) => n.id === "p2")!;
    const sub = s.nodes.find((n) => n.id === "p2-a")!;
    expect(Math.hypot(sub.x - p2.x, sub.y - p2.y)).toBeCloseTo(0.5 * 24, 5);
  });
  it("emits a permanent family edge parent→subagent", () => {
    const s = buildScene(seats, { radialScale: 24 });
    const fam = s.edges.filter((e) => e.kind === "family");
    expect(fam.length).toBe(1);
    expect(fam[0].alpha).toBeGreaterThan(0.5);
  });

  it("carries isSelf + tier through to the scene node (homenode marker)", () => {
    const withSelf: SeatInput[] = [
      { id: "core", tier: "singularity", isSingularity: true, activity: 0 },
      { id: "me", tier: "founder", isSelf: true, activity: 99 },
    ];
    const s = buildScene(withSelf, { radialScale: 24 });
    const me = s.nodes.find((n) => n.id === "me")!;
    expect(me.isSelf).toBe(true);
    expect(me.tier).toBe("founder");
    // the singularity core is never the player's self node
    const core = s.nodes.find((n) => n.id === "core")!;
    expect(core.isSelf).toBeFalsy();
  });
});
