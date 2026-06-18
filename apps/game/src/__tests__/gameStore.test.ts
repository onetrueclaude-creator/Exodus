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

  it("claimBlocknode sets ownerId but does NOT auto-add to visibleTiers", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserTier("community");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(result).toBe(true);
    const state = useGameStore.getState();
    expect(state.blocknodes["cell--1-1"].ownerId).toBe("user-001");
    // visibleTiers must NOT be auto-populated — player must call revealTier explicitly
    expect(state.visibleTiers).toEqual([]);
  });

  it("revealTier adds tier to visibleTiers", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().revealTier("community");
    expect(useGameStore.getState().visibleTiers).toContain("community");
  });

  it("revealTier is idempotent — does not duplicate", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().revealTier("community");
    useGameStore.getState().revealTier("community");
    expect(useGameStore.getState().visibleTiers.filter((f) => f === "community").length).toBe(1);
  });

  it("claimBlocknode returns false for already claimed node", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserTier("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-002");
    expect(result).toBe(false);
  });

  it("claimBlocknode succeeds when currentUserTier is set (open grid — any cell claimable)", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserTier("community");
    const result = useGameStore.getState().claimBlocknode("cell-1-1", "user-001");
    expect(result).toBe(true);
    expect(useGameStore.getState().blocknodes["cell-1-1"].ownerId).toBe("user-001");
    expect(useGameStore.getState().blocknodes["cell-1-1"].tier).toBe("community");
  });

  it("claimBlocknode tags the cell with the claimant's tier", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserTier("community");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(result).toBe(true);
    expect(useGameStore.getState().blocknodes["cell--1-1"].tier).toBe("community");
  });

  it("claimBlocknode returns false when currentUserTier is null (cannot tag tier)", () => {
    useGameStore.getState().initLattice(1);
    // currentUserTier is null after reset — cannot claim without tier
    expect(useGameStore.getState().currentUserTier).toBeNull();
    const result = useGameStore.getState().claimBlocknode("cell-1-1", "user-001");
    expect(result).toBe(false);
  });

  it("claimBlocknode does not deduct AGNTC (no AGNTC gate on claimBlocknode)", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.setState({ agntcBalance: 5 });
    useGameStore.getState().setCurrentUserTier("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    // claimBlocknode does not touch AGNTC balance
    expect(useGameStore.getState().agntcBalance).toBe(5);
  });

  it("claimBlocknode can claim any ring when tier is set (ring adjacency not enforced)", () => {
    useGameStore.getState().initLattice(2);
    useGameStore.getState().setCurrentUserTier("community");
    const ring0Result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(ring0Result).toBe(true);
    const ring1Result = useGameStore.getState().claimBlocknode("cell--1--2", "user-001");
    expect(ring1Result).toBe(true);
  });

  it("secureBlocknode increases agntcBalance and decreases energy", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserTier("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    const energyBefore = useGameStore.getState().energy;
    useGameStore.getState().secureBlocknode("cell--1-1", 100);
    const s = useGameStore.getState();
    expect(s.energy).toBeLessThan(energyBefore);
    expect(s.agntcBalance).toBeGreaterThan(0);
  });

  it("secureBlocknode does NOT spawn new nodes", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserTier("community");
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
    // New user init order: set tier FIRST (required to tag cell), then claim homenode
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, agntcBalance: 50 });
    useGameStore.getState().setCurrentUserTier("community");
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

  it("mineGridNode returns false when cell is in another tier's territory", () => {
    // (2,1) is treasury territory (NE: cx>0, cy>0) — community player can't mine there
    const result = useGameStore.getState().mineGridNode(2, 1);
    expect(result).toBe(false);
  });

  it("mineGridNode returns false when cell not adjacent to homenode or owned territory", () => {
    useGameStore.getState().reset();
    useGameStore.getState().initLattice(3);
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, agntcBalance: 50 });
    useGameStore.getState().setCurrentUserTier("community");
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

describe("gameStore — CPU regen (subscription-based)", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, cpuRegenPerTurn: 100 });
  });

  it("tick adds cpuRegenPerTurn to energy", () => {
    useGameStore.getState().tick();
    expect(useGameStore.getState().energy).toBe(1100); // 1000 + 100 regen
  });

  it("tick aggregates per-node miningCpu/securingCpu from agents", () => {
    // Add an agent owned by user-001 with preset miningCpu=100, securingCpu=200
    useGameStore.setState({
      agents: {
        "agent-001": {
          id: "agent-001",
          userId: "user-001",
          level: 1,
          miningCpu: 100,
          securingCpu: 200,
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
    useGameStore.getState().tick();
    const s = useGameStore.getState();
    // absolute preset values are summed directly
    expect(s.miningCpuPerBlock).toBe(100);
    expect(s.securingCpuPerBlock).toBe(200);
  });

  it("energy grows from subscription regen only (no node maintenance deduction)", () => {
    const before = useGameStore.getState().energy;
    useGameStore.getState().tick();
    expect(useGameStore.getState().energy).toBe(before + 100);
  });

});

describe("claimBlocknode — open grid", () => {
  beforeEach(() => {
    useGameStore.setState({
      blocknodes: buildAllCells(2),
      currentUserId: "u-1",
      currentUserTier: "community",
    });
  });

  it("claims an unclaimed cell and tags it with the claimant's tier", () => {
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    expect(ok).toBe(true);
    const cell = useGameStore.getState().blocknodes["cell-1-1"];
    expect(cell.ownerId).toBe("u-1");
    expect(cell.tier).toBe("community");
  });

  it("fails when cell is already owned", () => {
    useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-2");
    expect(ok).toBe(false);
  });

  it("no longer gated by currentUserTier === null (drops the old arm-node restriction)", () => {
    useGameStore.setState({ currentUserTier: "community" });
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    expect(ok).toBe(true);
  });

  it("fails when claimant's currentUserTier is null (cannot tag tier)", () => {
    useGameStore.setState({ currentUserTier: null });
    const ok = useGameStore.getState().claimBlocknode("cell-1-1", "u-1");
    expect(ok).toBe(false);
  });
});

describe("setNodeMiningSecuring", () => {
  beforeEach(() => {
    useGameStore.setState({
      currentUserId: "u-1",
      currentUserTier: "community",
      agents: {
        "agent-1": {
          id: "agent-1",
          userId: "u-1",
          level: 1,
          miningCpu: 0,
          securingCpu: 0,
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

  it("updates mining and securing when values are valid presets", () => {
    const ok = useGameStore.getState().setNodeMiningSecuring("agent-1", 200, 500);
    expect(ok).toBe(true);
    const a = useGameStore.getState().agents["agent-1"];
    expect(a.miningCpu).toBe(200);
    expect(a.securingCpu).toBe(500);
  });

  it("rejects values not in the preset list", () => {
    expect(useGameStore.getState().setNodeMiningSecuring("agent-1", 150, 100)).toBe(false);
    expect(useGameStore.getState().agents["agent-1"].miningCpu).toBe(0); // unchanged
  });

  it("rejects unknown agent id", () => {
    expect(useGameStore.getState().setNodeMiningSecuring("nope", 100, 100)).toBe(false);
  });
});

describe("beginNodeLevelUp — Ogame-style upfront cost", () => {
  beforeEach(() => {
    useGameStore.setState({
      currentUserId: "u-1",
      turn: 5,
      energy: 1000,
      agents: {
        "agent-1": {
          id: "agent-1",
          userId: "u-1",
          level: 3,
          miningCpu: 0,
          securingCpu: 0,
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

  it("deducts CPU cost atomically and sets the timer", () => {
    // getLevelUpCost(3) = floor(200 * 1.8^2) = 648
    const ok = useGameStore.getState().beginNodeLevelUp("agent-1");
    expect(ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.energy).toBe(1000 - 648);
    expect(s.agents["agent-1"].levelingUntilTurn).toBe(5 + 3); // turn + level
  });

  it("returns false when energy < cost and does not deduct", () => {
    useGameStore.setState({ energy: 100 }); // L3 cost is 648, this is short
    const ok = useGameStore.getState().beginNodeLevelUp("agent-1");
    expect(ok).toBe(false);
    expect(useGameStore.getState().energy).toBe(100); // unchanged
    expect(useGameStore.getState().agents["agent-1"].levelingUntilTurn).toBeNull();
  });

  it("returns false when the node is already leveling", () => {
    useGameStore.getState().beginNodeLevelUp("agent-1"); // first call succeeds
    const energyAfterFirst = useGameStore.getState().energy;
    const ok = useGameStore.getState().beginNodeLevelUp("agent-1"); // second is rejected
    expect(ok).toBe(false);
    expect(useGameStore.getState().energy).toBe(energyAfterFirst); // no double charge
  });
});

describe("cancelNodeLevelUp — no refund", () => {
  beforeEach(() => {
    useGameStore.setState({
      currentUserId: "u-1",
      turn: 5,
      energy: 1000,
      agents: {
        "agent-1": {
          id: "agent-1",
          userId: "u-1",
          level: 3,
          miningCpu: 0,
          securingCpu: 0,
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

  it("clears the timer without restoring spent CPU", () => {
    useGameStore.getState().beginNodeLevelUp("agent-1"); // pays 648
    const energyAfterPay = useGameStore.getState().energy;
    useGameStore.getState().cancelNodeLevelUp("agent-1");
    expect(useGameStore.getState().agents["agent-1"].levelingUntilTurn).toBeNull();
    expect(useGameStore.getState().energy).toBe(energyAfterPay); // still down 648
  });
});

describe("tick — income / expenditure model", () => {
  beforeEach(() => {
    useGameStore.setState({
      currentUserId: "u-1",
      currentUserTier: "community",
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
          miningCpu: 100,
          securingCpu: 200,
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

  it("energy = pool + subscription regen + node output − mining − securing", () => {
    // income = 100 (regen) + 10 (L1 node) = 110
    // expenditure = 100 (mining) + 200 (securing) = 300
    // net = -190; pool 1000 → 810
    useGameStore.getState().tick();
    expect(useGameStore.getState().energy).toBe(1000 + 110 - 300);
  });

  it("clamps energy at 0 when expenditure > pool + income", () => {
    useGameStore.setState({ energy: 50 });
    useGameStore.getState().tick();
    // 50 + 110 - 300 = -140 → clamped to 0
    expect(useGameStore.getState().energy).toBe(0);
  });

  it("aggregates per-node mining and securing into the legacy scalar fields", () => {
    useGameStore.getState().tick();
    expect(useGameStore.getState().miningCpuPerBlock).toBe(100);
    expect(useGameStore.getState().securingCpuPerBlock).toBe(200);
  });

  it("does NOT lock allocation while leveling (Self-Dev lockout is gone)", () => {
    useGameStore.setState((s) => ({
      agents: {
        ...s.agents,
        "agent-1": { ...s.agents["agent-1"], levelingUntilTurn: 10 },
      },
    }));
    useGameStore.getState().tick();
    // Even while leveling, mining/securing still drain and node still produces.
    expect(useGameStore.getState().miningCpuPerBlock).toBe(100);
    expect(useGameStore.getState().securingCpuPerBlock).toBe(200);
  });

  it("resolves level-up when timer reaches next turn", () => {
    useGameStore.setState((s) => ({
      turn: 0,
      agents: {
        ...s.agents,
        "agent-1": { ...s.agents["agent-1"], level: 3, levelingUntilTurn: 1 },
      },
    }));
    useGameStore.getState().tick();
    const a = useGameStore.getState().agents["agent-1"];
    expect(a.level).toBe(4);
    expect(a.levelingUntilTurn).toBeNull();
  });
});
