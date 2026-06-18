import { describe, it, expect } from "vitest";
import { seatsFromAgents, SINGULARITY_ID } from "./orbitalSeats";

describe("seatsFromAgents", () => {
  it("seats claimed players, excludes unclaimed coordinate slots", () => {
    const seats = seatsFromAgents([
      { id: "p1", userId: "ownerA", activity: 10 },
      { id: "slot1", userId: "", activity: 0 }, // unclaimed → not seated
      { id: "p2", userId: "ownerB", activity: 5 },
    ]);
    const ids = seats.map((s) => s.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p2");
    expect(ids).not.toContain("slot1");
  });

  it("appends exactly one Singularity core and excludes the chain origin from players", () => {
    const seats = seatsFromAgents([
      { id: "origin", userId: "wallet0", activity: 99, isSingularity: true },
      { id: "p1", userId: "ownerA", activity: 10 },
    ]);
    const core = seats.filter((s) => s.isSingularity);
    expect(core).toHaveLength(1);
    expect(core[0].id).toBe(SINGULARITY_ID);
    expect(seats.map((s) => s.id)).not.toContain("origin"); // origin is the core, not a player
  });

  it("uses real chain activity, falling back to staked+securing proxy when absent", () => {
    const seats = seatsFromAgents([
      { id: "real", userId: "o", activity: 42, stakedCpu: 1 },
      { id: "proxy", userId: "o2", stakedCpu: 3, securingCpu: 4 }, // no activity field
    ]);
    const byId = Object.fromEntries(seats.map((s) => [s.id, s.activity]));
    expect(byId["real"]).toBe(42);
    expect(byId["proxy"]).toBe(7);
  });

  it("seats subagents (parentAgentId present) with a parent link", () => {
    const seats = seatsFromAgents([
      { id: "p1", userId: "o", activity: 10 },
      { id: "sub1", userId: "o", parentAgentId: "p1", activity: 0 },
    ]);
    const sub = seats.find((s) => s.id === "sub1");
    expect(sub?.parentId).toBe("p1");
  });

  it("does NOT assign a per-id (hashed) player tier to a subagent", () => {
    // Two subagents whose ids would hash to DIFFERENT player tiers if tierByHash
    // were applied. Tier-less subagents must instead share the fixed placeholder,
    // so neither carries a varied/hashed player Tier.
    const seats = seatsFromAgents([
      { id: "parent", userId: "o", activity: 10 },
      { id: "sub-aaaa", userId: "o", parentAgentId: "parent", activity: 0 },
      { id: "sub-zzzz", userId: "o", parentAgentId: "parent", activity: 0 },
    ]);
    const a = seats.find((s) => s.id === "sub-aaaa")!;
    const z = seats.find((s) => s.id === "sub-zzzz")!;
    // Both subagents resolve to the same (placeholder) tier — proof no per-id hash
    // was applied (tierByHash would very likely diverge for these two ids).
    expect(a.tier).toBe(z.tier);
  });

  it("ignores an explicit tier on a subagent (subagents are tier-less)", () => {
    const seats = seatsFromAgents([
      { id: "parent", userId: "o", activity: 10 },
      // even if the chain/store hands a tier to a child, the seat must drop it
      { id: "sub1", userId: "o", parentAgentId: "parent", activity: 0, tier: "founder" },
    ]);
    const sub = seats.find((s) => s.id === "sub1")!;
    expect(sub.tier).not.toBe("founder");
  });

  it("seats only the core when there are no claimed players", () => {
    const seats = seatsFromAgents([{ id: "slot1", userId: "" }, { id: "slot2", userId: "" }]);
    expect(seats).toHaveLength(1);
    expect(seats[0].id).toBe(SINGULARITY_ID);
  });

  it("carries isSelf and an explicit tier onto the seat (homenode marker)", () => {
    const seats = seatsFromAgents([
      { id: "me", userId: "owner", activity: 10, isSelf: true, tier: "founder" },
      { id: "other", userId: "owner2", activity: 5 }, // no explicit tier → hashed colour
    ]);
    const me = seats.find((s) => s.id === "me")!;
    expect(me.isSelf).toBe(true);
    expect(me.tier).toBe("founder");
    const other = seats.find((s) => s.id === "other")!;
    expect(other.isSelf).toBeFalsy();
    // hashed fallback still yields a valid player tier
    expect(["community", "professional", "founder"]).toContain(other.tier);
  });
});
