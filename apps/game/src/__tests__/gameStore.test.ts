import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";
import { buildAllCells } from "@/lib/lattice";

describe("gameStore — lattice/blocknode state", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("initLattice sets blocknodes and totalBlocksMined", () => {
    useGameStore.getState().initLattice(3);
    const s = useGameStore.getState();
    expect(s.totalBlocksMined).toBe(3);
    expect(Object.keys(s.blocknodes)).toHaveLength(48); // ring 1=8, ring 2=16, ring 3=24 → total 48
  });

  it("addBlocknodesForBlock adds 4 new nodes", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().addBlocknodesForBlock(2);
    const s = useGameStore.getState();
    expect(Object.keys(s.blocknodes)).toHaveLength(24); // ring 1 (8) + ring 2 (16) = 24
  });

  it("claimBlocknode sets ownerId but does NOT auto-add to visibleFactions", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserFaction("community");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(result).toBe(true);
    const state = useGameStore.getState();
    expect(state.blocknodes["cell--1-1"].ownerId).toBe("user-001");
    // visibleFactions must NOT be auto-populated — player must call revealFaction explicitly
    expect(state.visibleFactions).toEqual([]);
  });

  it("revealFaction adds faction to visibleFactions", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().revealFaction("community");
    expect(useGameStore.getState().visibleFactions).toContain("community");
  });

  it("revealFaction is idempotent — does not duplicate", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().revealFaction("community");
    useGameStore.getState().revealFaction("community");
    expect(useGameStore.getState().visibleFactions.filter((f) => f === "community").length).toBe(1);
  });

  it("claimBlocknode returns false for already claimed node", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserFaction("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-002");
    expect(result).toBe(false);
  });

  it("claimBlocknode succeeds when currentUserFaction is set (open grid — any cell claimable)", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserFaction("community");
    const result = useGameStore.getState().claimBlocknode("cell-1-1", "user-001");
    expect(result).toBe(true);
    expect(useGameStore.getState().blocknodes["cell-1-1"].ownerId).toBe("user-001");
    expect(useGameStore.getState().blocknodes["cell-1-1"].faction).toBe("community");
  });

  it("claimBlocknode tags the cell with the claimant's faction", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserFaction("community");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(result).toBe(true);
    expect(useGameStore.getState().blocknodes["cell--1-1"].faction).toBe("community");
  });

  it("claimBlocknode returns false when currentUserFaction is null (cannot tag faction)", () => {
    useGameStore.getState().initLattice(1);
    // currentUserFaction is null after reset — cannot claim without faction
    expect(useGameStore.getState().currentUserFaction).toBeNull();
    const result = useGameStore.getState().claimBlocknode("cell-1-1", "user-001");
    expect(result).toBe(false);
  });

  it("claimBlocknode does not deduct AGNTC (no AGNTC gate on claimBlocknode)", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.setState({ agntcBalance: 5 });
    useGameStore.getState().setCurrentUserFaction("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    // claimBlocknode does not touch AGNTC balance
    expect(useGameStore.getState().agntcBalance).toBe(5);
  });

  it("claimBlocknode can claim any ring when faction is set (ring adjacency not enforced)", () => {
    useGameStore.getState().initLattice(2);
    useGameStore.getState().setCurrentUserFaction("community");
    const ring0Result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(ring0Result).toBe(true);
    const ring1Result = useGameStore.getState().claimBlocknode("cell--1--2", "user-001");
    expect(ring1Result).toBe(true);
  });

  it("secureBlocknode increases agntcBalance and decreases energy", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserFaction("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    const energyBefore = useGameStore.getState().energy;
    useGameStore.getState().secureBlocknode("cell--1-1", 100);
    const s = useGameStore.getState();
    expect(s.energy).toBeLessThan(energyBefore);
    expect(s.agntcBalance).toBeGreaterThan(0);
  });

  it("secureBlocknode does NOT spawn new nodes", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserFaction("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    const nodesBefore = Object.keys(useGameStore.getState().blocknodes).length;
    // Stake large amount — used to trigger ring spawn, should not any more
    useGameStore.getState().secureBlocknode("cell--1-1", 9999);
    expect(Object.keys(useGameStore.getState().blocknodes).length).toBe(nodesBefore);
  });

  it("tick adds passive CPU regen", () => {
    useGameStore.setState({ currentUserId: "user-001", energy: 500, cpuRegenPerTurn: 100 });
    useGameStore.getState().tick();
    const s = useGameStore.getState();
    // 500 + 100 regen = 600
    expect(s.energy).toBe(600);
  });
});

describe("gameStore — devRevealAll (dev mode fog bypass)", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("defaults to false", () => {
    expect(useGameStore.getState().devRevealAll).toBe(false);
  });

  it("setDevRevealAll(true) enables reveal-all mode", () => {
    useGameStore.getState().setDevRevealAll(true);
    expect(useGameStore.getState().devRevealAll).toBe(true);
  });

  it("setDevRevealAll toggles back to false", () => {
    useGameStore.getState().setDevRevealAll(true);
    useGameStore.getState().setDevRevealAll(false);
    expect(useGameStore.getState().devRevealAll).toBe(false);
  });

  it("reset() restores devRevealAll to false", () => {
    useGameStore.getState().setDevRevealAll(true);
    useGameStore.getState().reset();
    expect(useGameStore.getState().devRevealAll).toBe(false);
  });
});

describe("gameStore — empireColor (subscription tier color)", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("defaults to Community white 0xffffff", () => {
    expect(useGameStore.getState().empireColor).toBe(0xffffff);
  });

  it("setEmpireColor updates to amber (founders)", () => {
    useGameStore.getState().setEmpireColor(0xf59e0b);
    expect(useGameStore.getState().empireColor).toBe(0xf59e0b);
  });

  it("setEmpireColor updates to professional cyan", () => {
    useGameStore.getState().setEmpireColor(0x06b6d4);
    expect(useGameStore.getState().empireColor).toBe(0x06b6d4);
  });

  it("reset() restores empireColor to default Community white", () => {
    useGameStore.getState().setEmpireColor(0xf59e0b);
    useGameStore.getState().reset();
    expect(useGameStore.getState().empireColor).toBe(0xffffff);
  });
});

// Genesis cells land at quadrant corners adjacent to origin:
// NW=(-1,-1), NE=(1,-1), SE=(1,1), SW=(-1,1)
// Cell (0,-2) is adjacent to community arm (-1,-1) at Chebyshev distance 1 — community Voronoi territory.

describe("gameStore — grid node territory (mineGridNode / claimGridNode)", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().initLattice(1);
    // New user init order: set faction FIRST (required to tag cell), then claim homenode
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, agntcBalance: 50 });
    useGameStore.getState().setCurrentUserFaction("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
  });

  it("mineGridNode mines a cell adjacent to homenode", () => {
    // (-2,1) is adjacent to community genesis (-1,1) — community territory
    const result = useGameStore.getState().mineGridNode(-2, 1);
    expect(result).toBe(true);
    expect(useGameStore.getState().gridNodes["grid--2-1"].state).toBe("mined");
    expect(useGameStore.getState().energy).toBe(990); // 1000 - MINE_GRID_CPU_COST(10)
  });

  it("mineGridNode returns false for homenode cell position", () => {
    // (-1,1) is the community genesis — cannot be mined as territory
    const result = useGameStore.getState().mineGridNode(-1, 1);
    expect(result).toBe(false);
  });

  it("mineGridNode returns false when energy is insufficient", () => {
    useGameStore.setState({ energy: 5 }); // less than MINE_GRID_CPU_COST (10)
    const result = useGameStore.getState().mineGridNode(-2, 1);
    expect(result).toBe(false);
    expect(useGameStore.getState().energy).toBe(5); // unchanged
  });

  it("mineGridNode returns false when cell is out of mineable range", () => {
    const result = useGameStore.getState().mineGridNode(100, 100);
    expect(result).toBe(false);
  });

  it("mineGridNode returns false when cell is in another faction's territory", () => {
    // (2,1) is treasury territory (NE: cx>0, cy>0) — community player can't mine there
    const result = useGameStore.getState().mineGridNode(2, 1);
    expect(result).toBe(false);
  });

  it("mineGridNode returns false when cell not adjacent to homenode or owned territory", () => {
    useGameStore.getState().reset();
    useGameStore.getState().initLattice(3);
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, agntcBalance: 50 });
    useGameStore.getState().setCurrentUserFaction("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    // (-3,3): within community quadrant but NOT adjacent to any owned node
    const result = useGameStore.getState().mineGridNode(-3, 3);
    expect(result).toBe(false);
  });

  it("mineGridNode returns false when already mined", () => {
    useGameStore.getState().mineGridNode(-2, 1);
    const result = useGameStore.getState().mineGridNode(-2, 1);
    expect(result).toBe(false);
  });

  it("claimGridNode claims a mined cell and deducts AGNTC", () => {
    useGameStore.getState().mineGridNode(-2, 1);
    const result = useGameStore.getState().claimGridNode(-2, 1);
    expect(result).toBe(true);
    const node = useGameStore.getState().gridNodes["grid--2-1"];
    expect(node.state).toBe("claimed");
    expect(node.ownerId).toBe("user-001");
    expect(useGameStore.getState().agntcBalance).toBe(49); // 50 - CLAIM_GRID_AGNTC_COST(1)
  });

  it("claimGridNode returns false for un-mined cell", () => {
    const result = useGameStore.getState().claimGridNode(-2, 1);
    expect(result).toBe(false);
  });

  it("claimGridNode returns false when AGNTC balance is insufficient", () => {
    useGameStore.getState().mineGridNode(-2, 1);
    useGameStore.setState({ agntcBalance: 0 });
    const result = useGameStore.getState().claimGridNode(-2, 1);
    expect(result).toBe(false);
    expect(useGameStore.getState().gridNodes["grid--2-1"].state).toBe("mined"); // unchanged
  });

  it("claimed grid node enables mining of adjacent cells", () => {
    useGameStore.getState().mineGridNode(-2, 1);
    useGameStore.getState().claimGridNode(-2, 1);
    // (-3,1) is adjacent to claimed (-2,1) but out of mineableRange with initLattice(1)
    const result = useGameStore.getState().mineGridNode(-3, 1);
    expect(result).toBe(false); // out of range
  });
});

describe("gameStore — CPU regen and allocation", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, cpuRegenPerTurn: 100 });
  });

  it("tick adds cpuRegenPerTurn to energy", () => {
    useGameStore.getState().tick();
    expect(useGameStore.getState().energy).toBe(1100); // 1000 + 100 regen
  });

  it("tick deducts mining + securing commitments from energy", () => {
    useGameStore.getState().setCpuAllocation(50, 30);
    useGameStore.getState().tick();
    // 1000 + 100 regen - 50 mining - 30 securing = 1020
    expect(useGameStore.getState().energy).toBe(1020);
  });

  it("energy does not go below 0", () => {
    useGameStore.setState({ energy: 10, cpuRegenPerTurn: 0 });
    useGameStore.getState().setCpuAllocation(500, 500);
    useGameStore.getState().tick();
    expect(useGameStore.getState().energy).toBe(0);
  });

  it("setCpuAllocation updates both fields", () => {
    useGameStore.getState().setCpuAllocation(200, 100);
    const s = useGameStore.getState();
    expect(s.miningCpuPerBlock).toBe(200);
    expect(s.securingCpuPerBlock).toBe(100);
  });
});

describe("claimBlocknode — open grid", () => {
  beforeEach(() => {
    useGameStore.setState({
      blocknodes: buildAllCells(2),
      currentUserId: "u-1",
      currentUserFaction: "community",
    });
  });

  it("claims an unclaimed cell and tags it with the claimant's faction", () => {
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    expect(ok).toBe(true);
    const cell = useGameStore.getState().blocknodes["cell-1-1"];
    expect(cell.ownerId).toBe("u-1");
    expect(cell.faction).toBe("community");
  });

  it("fails when cell is already owned", () => {
    useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-2");
    expect(ok).toBe(false);
  });

  it("no longer gated by currentUserFaction === null (drops the old arm-node restriction)", () => {
    useGameStore.setState({ currentUserFaction: "community" });
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    expect(ok).toBe(true);
  });

  it("fails when claimant's currentUserFaction is null (cannot tag faction)", () => {
    useGameStore.setState({ currentUserFaction: null });
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    expect(ok).toBe(false);
  });
});

describe("setNodeAllocation", () => {
  beforeEach(() => {
    useGameStore.setState({
      currentUserId: "u-1",
      currentUserFaction: "community",
      agents: {
        "agent-1": {
          id: "agent-1",
          userId: "u-1",
          level: 1,
          miningAlloc: 50,
          securingAlloc: 50,
          selfDevAlloc: 0,
          levelingUntilTurn: null,
          position: { x: 0, y: 0 },
          isPrimary: true,
          planets: [],
          createdAt: 0,
          username: "test",
          borderRadius: 64,
          borderPressure: 0,
          cpuPerTurn: 10,
          miningRate: 1,
          energyLimit: 50,
          stakedCpu: 0,
        },
      },
    });
  });

  it("updates allocation when percentages sum to 100", () => {
    const ok = useGameStore.getState().setNodeAllocation("agent-1", 25, 50, 25);
    expect(ok).toBe(true);
    const agent = useGameStore.getState().agents["agent-1"];
    expect(agent.miningAlloc).toBe(25);
    expect(agent.securingAlloc).toBe(50);
    expect(agent.selfDevAlloc).toBe(25);
  });

  it("rejects allocation that doesn't sum to 100", () => {
    const ok = useGameStore.getState().setNodeAllocation("agent-1", 50, 50, 25);
    expect(ok).toBe(false);
    const agent = useGameStore.getState().agents["agent-1"];
    expect(agent.miningAlloc).toBe(50); // unchanged
  });

  it("rejects unknown agent id", () => {
    expect(useGameStore.getState().setNodeAllocation("agent-nonexistent", 50, 25, 25)).toBe(false);
  });
});

describe("beginNodeLevelUp / cancelNodeLevelUp", () => {
  beforeEach(() => {
    useGameStore.setState({
      currentUserId: "u-1",
      turn: 5,
      agents: {
        "agent-1": {
          id: "agent-1",
          userId: "u-1",
          level: 3,
          miningAlloc: 50,
          securingAlloc: 50,
          selfDevAlloc: 0,
          levelingUntilTurn: null,
          position: { x: 0, y: 0 },
          isPrimary: true,
          planets: [],
          createdAt: 0,
          username: "test",
          borderRadius: 64,
          borderPressure: 0,
          cpuPerTurn: 20,
          miningRate: 1,
          energyLimit: 50,
          stakedCpu: 0,
        },
      },
    });
  });

  it("beginNodeLevelUp sets levelingUntilTurn = currentTurn + level", () => {
    useGameStore.getState().beginNodeLevelUp("agent-1");
    const agent = useGameStore.getState().agents["agent-1"];
    expect(agent.levelingUntilTurn).toBe(5 + 3); // turn 5 + 3-turn upgrade from L3
  });

  it("cancelNodeLevelUp clears the timer without refunding", () => {
    useGameStore.getState().beginNodeLevelUp("agent-1");
    useGameStore.getState().cancelNodeLevelUp("agent-1");
    expect(useGameStore.getState().agents["agent-1"].levelingUntilTurn).toBeNull();
  });
});

describe("tick — per-node aggregation", () => {
  beforeEach(() => {
    useGameStore.setState({
      currentUserId: "u-1",
      currentUserFaction: "community",
      turn: 0,
      energy: 1000,
      minerals: 100,
      agntcBalance: 50,
      cpuRegenPerTurn: 100,
      miningCpuPerBlock: 0,
      securingCpuPerBlock: 0,
      agents: {
        "agent-1": {
          id: "agent-1",
          userId: "u-1",
          level: 1, // generates 10 CPU/turn at L1
          miningAlloc: 60,
          securingAlloc: 40,
          selfDevAlloc: 0,
          levelingUntilTurn: null,
          position: { x: 0, y: 0 },
          isPrimary: true,
          planets: [],
          createdAt: 0,
          username: "test",
          borderRadius: 64,
          borderPressure: 0,
          cpuPerTurn: 10,
          miningRate: 1,
          energyLimit: 50,
          stakedCpu: 0,
        },
      },
    });
  });

  it("aggregates mining and securing from a single node", () => {
    useGameStore.getState().tick();
    const s = useGameStore.getState();
    // L1 node generates 10 CPU/turn at 60/40 split → 6 mining, 4 securing
    expect(s.miningCpuPerBlock).toBe(6);
    expect(s.securingCpuPerBlock).toBe(4);
  });

  it("snaps allocation to (0,0,100) while leveling", () => {
    useGameStore.setState((s) => ({
      agents: {
        ...s.agents,
        "agent-1": { ...s.agents["agent-1"], levelingUntilTurn: 10 },
      },
    }));
    useGameStore.getState().tick();
    const s = useGameStore.getState();
    expect(s.miningCpuPerBlock).toBe(0);
    expect(s.securingCpuPerBlock).toBe(0);
  });

  it("resolves level-up when timer reaches current turn", () => {
    useGameStore.setState((s) => ({
      turn: 0,
      agents: {
        ...s.agents,
        "agent-1": { ...s.agents["agent-1"], level: 3, levelingUntilTurn: 1 },
      },
    }));
    useGameStore.getState().tick();
    const agent = useGameStore.getState().agents["agent-1"];
    expect(agent.level).toBe(4);
    expect(agent.levelingUntilTurn).toBeNull();
  });

  it("does not resolve level-up when timer is in the future", () => {
    useGameStore.setState((s) => ({
      turn: 0,
      agents: {
        ...s.agents,
        "agent-1": { ...s.agents["agent-1"], level: 3, levelingUntilTurn: 5 },
      },
    }));
    useGameStore.getState().tick();
    const agent = useGameStore.getState().agents["agent-1"];
    expect(agent.level).toBe(3);
    expect(agent.levelingUntilTurn).toBe(5);
  });

  it("energy grows only from subscription regen", () => {
    const before = useGameStore.getState().energy;
    useGameStore.getState().tick();
    const after = useGameStore.getState().energy;
    expect(after).toBe(before + 100); // cpuRegenPerTurn only, no node maintenance
  });
});
