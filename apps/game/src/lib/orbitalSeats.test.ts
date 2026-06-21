import { describe, it, expect } from "vitest";
import { seatsFromAgents, SINGULARITY_ID, OPEN_SEAT_COUNT } from "./orbitalSeats";

describe("seatsFromAgents", () => {
  it("seats claimed players and renders unclaimed slots as grey open seats", () => {
    const seats = seatsFromAgents([
      { id: "p1", userId: "ownerA", activity: 10 },
      { id: "slot1", userId: "", activity: 0 }, // unclaimed → grey open seat
      { id: "p2", userId: "ownerB", activity: 5 },
    ]);
    const ids = seats.map((s) => s.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p2");
    expect(ids).toContain("slot1");
    expect(seats.find((s) => s.id === "slot1")!.tier).toBe("unclaimed");
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

  it("carries the chain last_active_block onto a claimed seat (for the pulse)", () => {
    const seats = seatsFromAgents([
      { id: "p1", userId: "o", activity: 10, lastActiveBlock: 207 },
    ]);
    expect(seats.find((s) => s.id === "p1")!.lastActiveBlock).toBe(207);
  });

  it("seats subagents (parentAgentId present) with a parent link", () => {
    const seats = seatsFromAgents([
      { id: "p1", userId: "o", activity: 10 },
      { id: "sub1", userId: "o", parentAgentId: "p1", activity: 0 },
    ]);
    const sub = seats.find((s) => s.id === "sub1");
    expect(sub?.parentId).toBe("p1");
  });

  it("ignores an explicit tier on a subagent (subagents are tier-less)", () => {
    const seats = seatsFromAgents([
      { id: "parent", userId: "o", activity: 10 },
      { id: "sub1", userId: "o", parentAgentId: "parent", activity: 0, tier: "founder" },
    ]);
    expect(seats.find((s) => s.id === "sub1")!.tier).not.toBe("founder");
  });

  it("seats the core plus grey open seats when there are no claimed players", () => {
    const seats = seatsFromAgents([{ id: "slot1", userId: "" }, { id: "slot2", userId: "" }]);
    // 2 grey open seats + the Singularity core
    expect(seats).toHaveLength(3);
    expect(seats.filter((s) => s.tier === "unclaimed")).toHaveLength(2);
    expect(seats.some((s) => s.id === SINGULARITY_ID)).toBe(true);
  });

  it("caps grey open seats at OPEN_SEAT_COUNT", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `slot${i}`, userId: "" }));
    const seats = seatsFromAgents(many);
    expect(seats.filter((s) => s.tier === "unclaimed")).toHaveLength(OPEN_SEAT_COUNT);
  });

  it("makes the local node the unique Founder; other players get one consistent colour", () => {
    const seats = seatsFromAgents([
      { id: "me", userId: "owner", activity: 10, isSelf: true, tier: "founder" },
      { id: "other", userId: "owner2", activity: 5 },
    ]);
    const me = seats.find((s) => s.id === "me")!;
    expect(me.isSelf).toBe(true);
    expect(me.tier).toBe("founder");
    const other = seats.find((s) => s.id === "other")!;
    expect(other.isSelf).toBeFalsy();
    expect(other.tier).toBe("professional"); // consistent, non-random
    expect(other.tier).not.toBe("founder");
  });

  it("never assigns Founder to a non-self player (only the local node is Founder)", () => {
    const seats = seatsFromAgents([
      { id: "imposter", userId: "o", activity: 5, tier: "founder" }, // claims founder
    ]);
    expect(seats.find((s) => s.id === "imposter")!.tier).not.toBe("founder");
  });
});
