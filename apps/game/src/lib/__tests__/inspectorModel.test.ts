import { describe, it, expect } from "vitest";
import { inspectorModelFor, shortId } from "@/lib/inspectorModel";
import { SINGULARITY_ID } from "@/lib/orbitalSeats";
import { TIER_TINT } from "@/types";
import type { Agent } from "@/types";

/** Minimal Agent factory — only the fields inspectorModel reads matter. */
function agent(partial: Partial<Agent> & { id: string }): Agent {
  return {
    userId: "owner-default",
    position: { x: 0, y: 0 },
    level: 1,
    miningCpu: 0,
    securingCpu: 0,
    levelingUntilTurn: null,
    isPrimary: false,
    planets: [],
    createdAt: 0,
    borderRadius: 0,
    borderPressure: 0,
    cpuPerTurn: 0,
    miningRate: 0,
    energyLimit: 0,
    stakedCpu: 0,
    ...partial,
  };
}

describe("shortId", () => {
  it("truncates long ids to 8 chars and leaves short ids intact", () => {
    expect(shortId("abcdefghijklmnop")).toBe("abcdefgh");
    expect(shortId("short")).toBe("short");
  });
});

describe("inspectorModelFor", () => {
  it("returns null for a null focus or an unknown id", () => {
    expect(inspectorModelFor(null, {})).toBeNull();
    expect(inspectorModelFor("ghost", {})).toBeNull();
  });

  it("returns the Singularity protocol-core card for the synthetic core id", () => {
    const m = inspectorModelFor(SINGULARITY_ID, {});
    expect(m?.kind).toBe("singularity");
    if (m?.kind === "singularity") {
      expect(m.title).toBe("Singularity");
      expect(m.subtitle).toContain("protocol core");
      expect(m.subtitle).toContain("gateway");
      expect(m.subtitle).toContain("accumulator");
      expect(m.tint).toBe(TIER_TINT.singularity);
    }
  });

  it("maps a self homenode → 'Your Homenode' with tier, crown, tint and self flag", () => {
    const agents: Record<string, Agent> = {
      me: agent({ id: "me", userId: "u-mine", isSelf: true, tier: "founder", activity: 100 }),
    };
    const m = inspectorModelFor("me", agents);
    expect(m?.kind).toBe("player");
    if (m && m.kind !== "singularity") {
      expect(m.title).toBe("Your Homenode");
      expect(m.isSelf).toBe(true);
      expect(m.tier).toBe("founder");
      expect(m.crown).toBe("\u{1F451}"); // 👑 for founder
      expect(m.tint).toBe(TIER_TINT.founder);
      expect(m.tierLabel).toBe("Founder");
      expect(m.owner).toBe("u-mine");
      expect(m.activity).toBe(100);
    }
  });

  it("classifies a node with a parent as a subagent and shows its short id", () => {
    const agents: Record<string, Agent> = {
      parent: agent({ id: "parent", userId: "u1", activity: 50 }),
      "sub-1234567890": agent({
        id: "sub-1234567890",
        userId: "u1",
        parentAgentId: "parent",
        tier: "community",
      }),
    };
    const m = inspectorModelFor("sub-1234567890", agents);
    expect(m?.kind).toBe("subagent");
    if (m && m.kind !== "singularity") {
      expect(m.title).toBe("sub-1234"); // first 8 chars
      expect(m.isSelf).toBe(false);
    }
  });

  it("recomputes rank/band consistently with the seat→rank pipeline (highest activity = rank 1)", () => {
    const agents: Record<string, Agent> = {
      high: agent({ id: "high", userId: "a", activity: 90 }),
      mid: agent({ id: "mid", userId: "b", activity: 40 }),
      low: agent({ id: "low", userId: "c", activity: 5 }),
    };
    const high = inspectorModelFor("high", agents);
    const low = inspectorModelFor("low", agents);
    if (high && high.kind !== "singularity") {
      expect(high.rank).toBe(1);
      expect(high.band).toBe(1); // rank 1 → innermost band
    }
    if (low && low.kind !== "singularity") {
      expect(low.rank).toBe(3);
    }
  });

  it("falls back to the staked+securing proxy for activity when no chain activity is present", () => {
    const agents: Record<string, Agent> = {
      p: agent({ id: "p", userId: "o", stakedCpu: 3, securingCpu: 4 }), // no `activity`
    };
    const m = inspectorModelFor("p", agents);
    if (m && m.kind !== "singularity") {
      expect(m.activity).toBe(7);
    }
  });
});
