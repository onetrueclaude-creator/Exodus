import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store";
import type { Agent, HaikuMessage, Planet, DiplomaticState } from "@/types";
import { TIER_BASE_BORDER, TIER_MINING_RATE, TIER_CLAIM_COST } from "@/types/agent";
import { getNodeCpuPerTurn } from "@/lib/nodeTier";

/* ── Helpers ──────────────────────────────────────────── */

// L7 (lattice) base CPU: getNodeCpuPerTurn(7) = floor((5 + 7*5) * 1.5) = floor(60) = 60
const L7_CPU = getNodeCpuPerTurn(7);

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "a1",
    userId: "u1",
    position: { x: 0, y: 0 },
    level: 7,
    miningCpu: 0,
    securingCpu: 0,
    levelingUntilTurn: null,
    isPrimary: true,
    planets: [],
    createdAt: Date.now(),
    borderRadius: TIER_BASE_BORDER.lattice,
    borderPressure: 0,
    cpuPerTurn: L7_CPU,
    miningRate: TIER_MINING_RATE.lattice,
    energyLimit: L7_CPU * 5,
    stakedCpu: 0,
    ...overrides,
  };
}

function makeHaiku(overrides: Partial<HaikuMessage> = {}): HaikuMessage {
  return {
    id: "h1",
    senderAgentId: "a1",
    text: "Test line one here\nSecond line is longer still\nThird line five again",
    syllables: [5, 7, 5],
    position: { x: 0, y: 0 },
    timestamp: Date.now(),
    ...overrides,
  };
}

/* ── Store Tests ──────────────────────────────────────── */

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  /* ── Initial state ── */

  it("initializes with empty state", () => {
    const state = useGameStore.getState();
    expect(state.agents).toEqual({});
    expect(state.haiku).toEqual([]);
    expect(state.planets).toEqual({});
    expect(state.diplomacy).toEqual({});
    expect(state.currentUserId).toBeNull();
    expect(state.currentAgentId).toBeNull();
    expect(state.energy).toBe(1000);
    expect(state.minerals).toBe(50);
    expect(state.agntcBalance).toBe(50);
    expect(state.turn).toBe(0);
    expect(state.chainMode).toBe("mock");
    expect(state.activeTab).toBe("network");
  });

  /* ── Agent CRUD ── */

  it("adds an agent", () => {
    const agent = makeAgent();
    useGameStore.getState().addAgent(agent);
    expect(useGameStore.getState().agents["a1"]).toEqual(agent);
  });

  it("moves an agent", () => {
    useGameStore.getState().addAgent(makeAgent());
    useGameStore.getState().moveAgent("a1", { x: 50, y: 75 });
    expect(useGameStore.getState().agents["a1"].position).toEqual({ x: 50, y: 75 });
  });

  it("does not move a non-existent agent", () => {
    useGameStore.getState().moveAgent("nonexistent", { x: 50, y: 75 });
    expect(useGameStore.getState().agents).toEqual({});
  });

  it("syncs agent from chain (overwrite)", () => {
    useGameStore.getState().addAgent(makeAgent());
    const updated = makeAgent({ position: { x: 100, y: 200 } });
    useGameStore.getState().syncAgentFromChain(updated);
    expect(useGameStore.getState().agents["a1"].position).toEqual({ x: 100, y: 200 });
  });

  /* ── createAgent ── */

  describe("createAgent", () => {
    beforeEach(() => {
      useGameStore.getState().setCurrentUser("u1", "a1");
    });

    it("creates an agent and deducts energy", () => {
      const state = useGameStore.getState();
      const energyBefore = state.energy;
      const id = state.createAgent("cortex", { x: 10, y: 20 });
      expect(id).toBeTruthy();
      const after = useGameStore.getState();
      expect(after.agents[id!]).toBeDefined();
      expect(after.agents[id!].level).toBe(4); // cortex starts at L4
      expect(after.agents[id!].position).toEqual({ x: 10, y: 20 });
      // createAgent deducts getNodeCpuPerTurn(startLevel) * 5
      const l4Cpu = getNodeCpuPerTurn(4);
      expect(after.energy).toBe(energyBefore - l4Cpu * 5);
    });

    it("returns null if not enough energy", () => {
      useGameStore.setState({ energy: 0 });
      const id = useGameStore.getState().createAgent("lattice", { x: 0, y: 0 });
      expect(id).toBeNull();
    });

    it("sets correct tier-specific stats", () => {
      const id = useGameStore.getState().createAgent("synapse", { x: 5, y: 5 })!;
      const agent = useGameStore.getState().agents[id];
      expect(agent.borderRadius).toBe(TIER_BASE_BORDER.synapse);
      expect(agent.cpuPerTurn).toBe(getNodeCpuPerTurn(1)); // synapse starts at L1
      expect(agent.miningRate).toBe(TIER_MINING_RATE.synapse);
    });

    it("assigns parent agent ID when provided", () => {
      const id = useGameStore
        .getState()
        .createAgent("cortex", { x: 0, y: 0 }, undefined, "parent-1")!;
      expect(useGameStore.getState().agents[id].parentAgentId).toBe("parent-1");
    });
  });

  /* ── claimNode ── */

  describe("claimNode", () => {
    beforeEach(() => {
      useGameStore.getState().setCurrentUser("u1", "a1");
      // Add an unclaimed node (userId is empty string)
      useGameStore.getState().addAgent(makeAgent({
        id: "unclaimed-1", userId: "",
        level: 1, miningCpu: 0, securingCpu: 0, levelingUntilTurn: null,
      }));
    });

    it("claims an unclaimed node", () => {
      const result = useGameStore.getState().claimNode("unclaimed-1", "synapse");
      expect(result).toBe(true);
      const claimed = useGameStore.getState().agents["unclaimed-1"];
      expect(claimed.userId).toBe("u1");
      expect(claimed.level).toBe(1); // claimNode always starts at L1
      expect(claimed.borderRadius).toBe(64); // fixed L1 border radius
    });

    it("deducts energy and minerals on claim", () => {
      const before = useGameStore.getState();
      const eBefore = before.energy;
      const mBefore = before.minerals;
      useGameStore.getState().claimNode("unclaimed-1", "synapse");
      const after = useGameStore.getState();
      // Fixed L1 claim cost: energy=10, minerals=3
      expect(after.energy).toBe(eBefore - 10);
      expect(after.minerals).toBe(mBefore - 3);
    });

    it("fails if node is already claimed", () => {
      useGameStore.getState().addAgent(makeAgent({ id: "owned", userId: "u2" }));
      const result = useGameStore.getState().claimNode("owned", "synapse");
      expect(result).toBe(false);
    });

    it("fails if not enough energy", () => {
      useGameStore.setState({ energy: 0 });
      const result = useGameStore.getState().claimNode("unclaimed-1", "synapse");
      expect(result).toBe(false);
    });

    it("fails if not enough minerals", () => {
      useGameStore.setState({ minerals: 0 });
      const result = useGameStore.getState().claimNode("unclaimed-1", "synapse");
      expect(result).toBe(false);
    });

    it("sets parentAgentId when provided", () => {
      const result = useGameStore.getState().claimNode("unclaimed-1", "synapse", "parent-lattice");
      expect(result).toBe(true);
      expect(useGameStore.getState().agents["unclaimed-1"].parentAgentId).toBe("parent-lattice");
    });

    it("leaves parentAgentId undefined when not provided", () => {
      const result = useGameStore.getState().claimNode("unclaimed-1", "synapse");
      expect(result).toBe(true);
      expect(useGameStore.getState().agents["unclaimed-1"].parentAgentId).toBeUndefined();
    });

    it("homenode flow: claim + setPrimary bootstraps game state", () => {
      // Simulate new user with userId but no currentAgentId
      useGameStore.getState().reset();
      useGameStore.setState({ currentUserId: "new-user" });
      useGameStore.getState().addAgent(makeAgent({
        id: "slot-first", userId: "",
        level: 1, miningCpu: 0, securingCpu: 0, levelingUntilTurn: null,
      }));

      // Claim with synapse (L1 — everyone starts at L1)
      const success = useGameStore.getState().claimNode("slot-first", "synapse");
      expect(success).toBe(true);

      // Set as primary — this also sets currentAgentId
      useGameStore.getState().setPrimary("slot-first");
      const state = useGameStore.getState();
      expect(state.currentAgentId).toBe("slot-first");
      expect(state.agents["slot-first"].isPrimary).toBe(true);
      expect(state.agents["slot-first"].userId).toBe("new-user");
      expect(state.agents["slot-first"].level).toBe(1);
    });
  });

  /* ── CPU Distribution ── */

  describe("setBorderPressure", () => {
    it("sets border pressure and updates cpuPerTurn", () => {
      useGameStore.getState().addAgent(makeAgent());
      useGameStore.getState().setBorderPressure("a1", 6);
      const agent = useGameStore.getState().agents["a1"];
      expect(agent.borderPressure).toBe(6);
      expect(agent.cpuPerTurn).toBe(L7_CPU + 6); // base (L7) + pressure
    });

    it("clamps pressure to 0-20 range", () => {
      useGameStore.getState().addAgent(makeAgent());
      useGameStore.getState().setBorderPressure("a1", 25);
      expect(useGameStore.getState().agents["a1"].borderPressure).toBe(20);
      useGameStore.getState().setBorderPressure("a1", -5);
      expect(useGameStore.getState().agents["a1"].borderPressure).toBe(0);
    });
  });

  describe("setMiningRate", () => {
    it("sets mining rate and updates cpuPerTurn for extra mining", () => {
      useGameStore.getState().addAgent(makeAgent());
      const baseMining = TIER_MINING_RATE.lattice;
      const boostedRate = baseMining * 2;
      useGameStore.getState().setMiningRate("a1", boostedRate);
      const agent = useGameStore.getState().agents["a1"];
      expect(agent.miningRate).toBe(boostedRate);
      // base cpuPerTurn (L7) + extra mining = L7_CPU + baseMining
      expect(agent.cpuPerTurn).toBe(L7_CPU + baseMining);
    });

    it("clamps mining rate to 0-50", () => {
      useGameStore.getState().addAgent(makeAgent());
      useGameStore.getState().setMiningRate("a1", 100);
      expect(useGameStore.getState().agents["a1"].miningRate).toBe(50);
    });
  });

  describe("setEnergyLimit", () => {
    it("sets energy limit", () => {
      useGameStore.getState().addAgent(makeAgent());
      useGameStore.getState().setEnergyLimit("a1", 100);
      expect(useGameStore.getState().agents["a1"].energyLimit).toBe(100);
    });

    it("clamps energy limit to 1-200", () => {
      useGameStore.getState().addAgent(makeAgent());
      useGameStore.getState().setEnergyLimit("a1", 0);
      expect(useGameStore.getState().agents["a1"].energyLimit).toBe(1);
      useGameStore.getState().setEnergyLimit("a1", 999);
      expect(useGameStore.getState().agents["a1"].energyLimit).toBe(200);
    });
  });

  describe("setStakedCpu", () => {
    it("sets staked CPU and updates cpuPerTurn", () => {
      useGameStore.getState().addAgent(makeAgent());
      useGameStore.getState().setStakedCpu("a1", 10);
      const agent = useGameStore.getState().agents["a1"];
      expect(agent.stakedCpu).toBe(10);
      expect(agent.cpuPerTurn).toBe(L7_CPU + 10); // base (L7) + staked
    });

    it("clamps staked CPU to 0-30", () => {
      useGameStore.getState().addAgent(makeAgent());
      useGameStore.getState().setStakedCpu("a1", 50);
      expect(useGameStore.getState().agents["a1"].stakedCpu).toBe(30);
    });
  });

  /* ── setPrimary ── */

  describe("setPrimary", () => {
    it("sets an agent as primary and unsets previous primary", () => {
      const a1 = makeAgent({ id: "a1", isPrimary: true });
      const a2 = makeAgent({ id: "a2", isPrimary: false });
      useGameStore.getState().addAgent(a1);
      useGameStore.getState().addAgent(a2);
      useGameStore.getState().setCurrentUser("u1", "a1");

      useGameStore.getState().setPrimary("a2");
      expect(useGameStore.getState().agents["a1"].isPrimary).toBe(false);
      expect(useGameStore.getState().agents["a2"].isPrimary).toBe(true);
      expect(useGameStore.getState().currentAgentId).toBe("a2");
    });

    it("does not set primary for agents owned by other users", () => {
      useGameStore.getState().addAgent(makeAgent({ id: "foreign", userId: "u2" }));
      useGameStore.getState().setCurrentUser("u1", "a1");
      useGameStore.getState().setPrimary("foreign");
      expect(useGameStore.getState().agents["foreign"].isPrimary).toBe(true); // unchanged from makeAgent default
    });
  });

  /* ── Haiku ── */

  it("adds a haiku message", () => {
    useGameStore.getState().addHaiku(makeHaiku());
    expect(useGameStore.getState().haiku).toHaveLength(1);
  });

  it("accumulates multiple haiku messages", () => {
    useGameStore.getState().addHaiku(makeHaiku({ id: "h1" }));
    useGameStore.getState().addHaiku(makeHaiku({ id: "h2" }));
    expect(useGameStore.getState().haiku).toHaveLength(2);
  });

  /* ── Planets ── */

  describe("planets", () => {
    it("adds a planet", () => {
      const planet: Planet = {
        id: "p1",
        agentId: "a1",
        content: "Hello world",
        contentType: "post",
        isZeroKnowledge: false,
        createdAt: Date.now(),
      };
      useGameStore.getState().addPlanet(planet);
      expect(useGameStore.getState().planets["p1"]).toEqual(planet);
    });

    it("toggles ZK flag on a planet", () => {
      useGameStore.getState().addPlanet({
        id: "p1",
        agentId: "a1",
        content: "test",
        contentType: "post",
        isZeroKnowledge: false,
        createdAt: Date.now(),
      });
      useGameStore.getState().togglePlanetZK("p1");
      expect(useGameStore.getState().planets["p1"].isZeroKnowledge).toBe(true);
      useGameStore.getState().togglePlanetZK("p1");
      expect(useGameStore.getState().planets["p1"].isZeroKnowledge).toBe(false);
    });

    it("does not toggle ZK on non-existent planet", () => {
      useGameStore.getState().togglePlanetZK("nonexistent");
      expect(useGameStore.getState().planets).toEqual({});
    });
  });

  /* ── Diplomacy ── */

  it("updates diplomacy with sorted key", () => {
    const state: DiplomaticState = {
      agentA: "b-agent",
      agentB: "a-agent",
      exchangeCount: 3,
      opinion: 0,
      clarityLevel: 0,
      lastExchange: Date.now(),
    };
    useGameStore.getState().updateDiplomacy(state);
    const key = "a-agent-b-agent"; // sorted
    expect(useGameStore.getState().diplomacy[key]).toEqual(state);
  });

  /* ── Navigation ── */

  it("sets the current user", () => {
    useGameStore.getState().setCurrentUser("u1", "a1");
    expect(useGameStore.getState().currentUserId).toBe("u1");
    expect(useGameStore.getState().currentAgentId).toBe("a1");
  });

  it("updates camera position", () => {
    useGameStore.getState().setCamera({ x: 500, y: 300 }, 1.5);
    expect(useGameStore.getState().camera).toEqual({ position: { x: 500, y: 300 }, zoom: 1.5 });
  });

  it("switches active tab", () => {
    useGameStore.getState().setActiveTab("account");
    expect(useGameStore.getState().activeTab).toBe("account");
    useGameStore.getState().setActiveTab("researches");
    expect(useGameStore.getState().activeTab).toBe("researches");
  });

  it("updates resources", () => {
    useGameStore.getState().updateResources(500, 100, 25);
    const s = useGameStore.getState();
    expect(s.energy).toBe(500);
    expect(s.minerals).toBe(100);
    expect(s.agntcBalance).toBe(25);
  });

  /* ── Chain connection ── */

  it("sets chain mode", () => {
    useGameStore.getState().setChainMode("testnet", 42);
    expect(useGameStore.getState().chainMode).toBe("testnet");
    expect(useGameStore.getState().testnetBlocks).toBe(42);
  });

  it("sets initializing flag", () => {
    useGameStore.getState().setInitializing(false);
    expect(useGameStore.getState().isInitializing).toBe(false);
  });

  /* ── Tick (turn system) ── */

  describe("tick", () => {
    beforeEach(() => {
      useGameStore.getState().setCurrentUser("u1", "a1");
      useGameStore.getState().addAgent(makeAgent({ id: "a1", userId: "u1" }));
    });

    it("advances turn counter", () => {
      useGameStore.getState().tick();
      expect(useGameStore.getState().turn).toBe(1);
    });

    it("increases energy by subscription regen + per-node production", () => {
      useGameStore.setState({ cpuRegenPerTurn: 100, miningCpuPerBlock: 0, securingCpuPerBlock: 0 });
      const before = useGameStore.getState().energy;
      useGameStore.getState().tick();
      const after = useGameStore.getState().energy;
      // regen(100) + getNodeCpuPerTurn(7)=60, no mining/securing expenditure
      expect(after).toBe(before + 160);
    });

    it("increases minerals by 1 per owned agent", () => {
      const before = useGameStore.getState().minerals;
      useGameStore.getState().tick();
      expect(useGameStore.getState().minerals).toBe(before + 1);
    });

    it("does not tick if no current user", () => {
      useGameStore.getState().reset();
      useGameStore.getState().tick();
      expect(useGameStore.getState().turn).toBe(0);
    });
  });

  /* ── Reset ── */

  it("resets to initial state", () => {
    useGameStore.getState().addAgent(makeAgent());
    useGameStore.getState().setCurrentUser("u1", "a1");
    useGameStore.getState().setActiveTab("account");
    useGameStore.getState().reset();

    const s = useGameStore.getState();
    expect(s.agents).toEqual({});
    expect(s.currentUserId).toBeNull();
    expect(s.activeTab).toBe("network");
  });
});
