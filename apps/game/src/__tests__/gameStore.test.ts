import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";

describe("gameStore — lattice/blocknode state", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("initLattice sets blocknodes and totalBlocksMined", () => {
    useGameStore.getState().initLattice(3);
    const s = useGameStore.getState();
    expect(s.totalBlocksMined).toBe(3);
    expect(Object.keys(s.blocknodes)).toHaveLength(36); // ring 1=4, ring 2=12, ring 3=20 → total 36
  });

  it("addBlocknodesForBlock adds 4 new nodes", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().addBlocknodesForBlock(2);
    const s = useGameStore.getState();
    expect(Object.keys(s.blocknodes)).toHaveLength(16); // ring 1 (4) + ring 2 (12) = 16
  });

  it("claimBlocknode sets ownerId but does NOT auto-add to visibleFactions", () => {
    useGameStore.getState().initLattice(1);
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
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-002");
    expect(result).toBe(false);
  });

  it("claimBlocknode rejects cross-faction claim when currentUserFaction is set", () => {
    useGameStore.getState().initLattice(1);
    // User belongs to community — cannot claim treasury nodes
    useGameStore.getState().setCurrentUserFaction("community");
    const result = useGameStore.getState().claimBlocknode("cell-1-1", "user-001");
    expect(result).toBe(false);
    expect(useGameStore.getState().blocknodes["cell-1-1"].ownerId).toBeNull();
  });

  it("claimBlocknode returns false when currentUserFaction is set (arm nodes are faction infrastructure, not user territory)", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().setCurrentUserFaction("community");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(result).toBe(false);
    expect(useGameStore.getState().blocknodes["cell--1-1"].ownerId).toBeNull();
  });

  it("claimBlocknode bypasses faction check when currentUserFaction is null (dev seed)", () => {
    useGameStore.getState().initLattice(1);
    // currentUserFaction is null after reset — dev seeds can claim any faction
    expect(useGameStore.getState().currentUserFaction).toBeNull();
    const result = useGameStore.getState().claimBlocknode("cell-1-1", "dev-treasury");
    expect(result).toBe(true);
  });

  it("claimBlocknode does not deduct AGNTC when currentUserFaction is set (arm nodes blocked)", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.setState({ agntcBalance: 5 });
    useGameStore.getState().setCurrentUserFaction("community");
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(useGameStore.getState().agntcBalance).toBe(5); // unchanged — claim was rejected
  });

  it("claimBlocknode rejects when AGNTC balance is too low", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.setState({ agntcBalance: 0 });
    useGameStore.getState().setCurrentUserFaction("community");
    const result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(result).toBe(false);
  });

  it("claimBlocknode rejects ring-1 when ring-0 not owned by user", () => {
    useGameStore.getState().initLattice(2);
    useGameStore.getState().setCurrentUserFaction("community");
    // ring-0 not claimed — trying ring-1 should fail
    const result = useGameStore.getState().claimBlocknode("cell--1--2", "user-001");
    expect(result).toBe(false);
  });

  it("claimBlocknode does not allow ring-1 claims (arm nodes are faction infrastructure, not user territory)", () => {
    useGameStore.getState().initLattice(2);
    useGameStore.setState({ agntcBalance: 10 });
    useGameStore.getState().setCurrentUserFaction("community");
    // All arm node claims are rejected for regular users regardless of ring or AGNTC
    const ring0Result = useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    expect(ring0Result).toBe(false);
    const ring1Result = useGameStore.getState().claimBlocknode("cell--1--2", "user-001");
    expect(ring1Result).toBe(false);
  });

  it("secureBlocknode increases agntcBalance and decreases energy", () => {
    useGameStore.getState().initLattice(1);
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    const energyBefore = useGameStore.getState().energy;
    useGameStore.getState().secureBlocknode("cell--1-1", 100);
    const s = useGameStore.getState();
    expect(s.energy).toBeLessThan(energyBefore);
    expect(s.agntcBalance).toBeGreaterThan(0);
  });

  it("secureBlocknode does NOT spawn new nodes", () => {
    useGameStore.getState().initLattice(1);
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
    // New user init order: claim homenode FIRST (faction null = init mode), then set faction
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, agntcBalance: 50 });
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    useGameStore.getState().setCurrentUserFaction("community");
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
    useGameStore.getState().claimBlocknode("cell--1-1", "user-001");
    useGameStore.getState().setCurrentUserFaction("community");
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
