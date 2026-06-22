import { create } from "zustand";
import type { Agent, HaikuMessage, GridPosition, DiplomaticState, Planet } from "@/types";
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE, TIER_CLAIM_COST } from "@/types/agent";
import type { AgentTier } from "@/types";
import type { Tier, BlockNode, GridNode } from "@/types";
import type { ResearchProgress } from "@/types/research";
import { RESEARCH_TREES } from "@/lib/research";
import { buildCellsForRing, buildAllCells } from "@/lib/lattice";
import { getNodeCpuPerTurn, getNodeTier as getNodeTierFromStore, getLevelUpCost, MINING_PRESETS } from "@/lib/nodeTier";
import { EDGE_FADE_BLOCKS } from "@/lib/orbitalEdges";

/** CPU Energy deducted per turn for each owned blocknode (maintenance cost) */
export const NODE_CPU_PER_TURN = 1;

/** AGNTC cost to spawn one new node in the user's tier arm */
export const SPAWN_NODE_AGNTC_COST = 1;

/** CPU energy to mine one grid cell (off-arm territory node) */
export const MINE_GRID_CPU_COST = 10;

/** AGNTC cost to claim a mined grid cell */
export const CLAIM_GRID_AGNTC_COST = 1;

export type GameTab = "network" | "account" | "researches" | "skills";
export type DockPanelId = "chat" | "terminal" | "deploy" | "stats" | "timeRewind" | "nodes";

interface GameState {
  // Entities
  agents: Record<string, Agent>;
  haiku: HaikuMessage[];
  diplomacy: Record<string, DiplomaticState>; // key: "agentA-agentB" sorted
  planets: Record<string, Planet>;

  // Current user
  currentUserId: string | null;
  currentAgentId: string | null;

  // Resources
  energy: number;
  minerals: number;
  agntcBalance: number;
  securedChains: number;
  minedChains: number;

  // CPU allocation (per-block commitments)
  miningCpuPerBlock: number;
  securingCpuPerBlock: number;
  cpuRegenPerTurn: number;

  // Resource deltas (flash indicators)
  resourceDeltas: Record<string, { value: number; ts: number }>;

  // Turn system
  turn: number;
  turnInterval: number | null; // setInterval ID

  // Chain connection
  chainMode: "testnet" | "mock";
  testnetBlocks: number;
  isInitializing: boolean;

  // Chain status (from testnet API)
  poolRemaining: number;
  totalMined: number;
  stateRoot: string;
  nextBlockIn: number;
  epochRing: number;
  hardness: number;

  // Wallet state (from chain sync)
  walletSecuringRate: number;
  walletMiningRate: number;
  walletEffectiveStake: number;

  // Neural Lattice / blocknode state (arm nodes — tier infrastructure)
  blocknodes: Record<string, BlockNode>;
  // Grid node territory (user-claimable cells off the arm)
  gridNodes: Record<string, GridNode>;
  visibleTiers: Tier[];
  totalBlocksMined: number;

  // Tier territory — null = no restriction (dev seed / uninitialized)
  currentUserTier: Tier | null;

  // Subscription restriction
  maxDeployTier: AgentTier; // highest tier this user can deploy (from subscription)

  // Research & Skills
  researchProgress: Record<string, ResearchProgress>;
  completedResearch: string[];
  unlockedSkills: string[];

  // UI
  activeTab: GameTab;
  empireColor: number;
  activeDockPanel: DockPanelId | null;
  focusRequest: { nodeId: string; ts: number } | null;
  /** Persisted sub-agent drag drop-positions keyed by agent id — survives
   *  OrbitalCanvas unmount (tab switches) so dragged sub-agents don't snap back. */
  subagentDragPositions: Record<string, { x: number; y: number }>;
  /** Currently inspected orbital node (drives the NodeInspector toast). Synthetic
   *  ids (e.g. the Singularity core) are allowed — this is decoupled from `agents`. */
  focusedNodeId: string | null;
  /** Decaying interaction "link" edges (e.g. homenode → Singularity ops). Rendered
   *  in the orbital edge layer and faded out via orbitalEdges.edgeAlpha. */
  interactionEdges: Array<{ from: string; to: string; bornAt: number }>;
  /** Recent player↔player AGNTC transfers, synced from GET /api/transactions.
   *  `from`/`to` are owner pubkey hex; `block` is the chain block the tx landed
   *  in (used to fade the on-screen transaction edge over a block window). */
  transactionEdges: Array<{ from: string; to: string; block: number }>;

  // Actions
  addAgent: (agent: Agent) => void;
  createAgent: (
    tier: AgentTier,
    position: GridPosition,
    name?: string,
    parentAgentId?: string
  ) => string | null;
  claimNode: (slotId: string, tier: AgentTier, parentAgentId?: string) => boolean;
  tick: () => void; // advance one turn — apply net resource production
  startTurnTimer: () => void; // start auto-ticking every 10 seconds
  stopTurnTimer: () => void;
  moveAgent: (agentId: string, position: GridPosition) => void;
  setBorderPressure: (agentId: string, pressure: number) => void;
  setMiningRate: (agentId: string, rate: number) => void;
  setEnergyLimit: (agentId: string, limit: number) => void;
  setStakedCpu: (agentId: string, staked: number) => void;
  setPrimary: (agentId: string) => void;
  addHaiku: (haiku: HaikuMessage) => void;
  addPlanet: (planet: Planet) => void;
  togglePlanetZK: (planetId: string) => void;
  setCurrentUser: (userId: string, agentId: string) => void;
  updateDiplomacy: (state: DiplomaticState) => void;
  setActiveTab: (tab: GameTab) => void;
  updateResources: (energy: number, minerals: number, agntc: number) => void;
  spendEnergy: (amount: number, reason: string) => boolean;
  addSecuredChain: () => void;
  flashDelta: (key: string, value: number) => void;
  syncAgentFromChain: (agent: Agent) => void;
  setChainMode: (mode: "testnet" | "mock", blocks?: number) => void;
  setChainStatus: (status: {
    poolRemaining: number;
    totalMined: number;
    stateRoot: string;
    nextBlockIn: number;
    blocks: number;
    epochRing?: number;
    hardness?: number;
  }) => void;
  setWalletState: (state: {
    securedChains: number;
    minedChains: number;
    securingRate: number;
    miningRate: number;
    effectiveStake: number;
  }) => void;
  /** Set the spendable AGNTC balance ABSOLUTELY from chain truth (in AGNTC, not
   *  micro). Overwrites the optimistic local value on each sync — local mutations
   *  are relative deltas that the next chain sync reconciles. */
  setSyncedAgntcBalance: (agntc: number) => void;
  setNodeMiningSecuring: (agentId: string, mining: number, securing: number) => boolean;
  beginNodeLevelUp: (agentId: string) => boolean;
  cancelNodeLevelUp: (agentId: string) => void;
  setCpuRegen: (regen: number) => void;
  setInitializing: (v: boolean) => void;
  setEmpireColor: (color: number) => void;
  setActiveDockPanel: (panel: DockPanelId | null) => void;
  switchAgent: (agentId: string) => void;
  requestFocus: (nodeId: string) => void;
  clearFocusRequest: () => void;
  setSubagentDragPosition: (id: string, pos: { x: number; y: number }) => void;
  /** Set (or clear with null) the inspected orbital node for the NodeInspector. */
  setFocusedNode: (nodeId: string | null) => void;
  /** Append a decaying interaction link edge (bornAt = current turn for fade math). */
  addInteractionEdge: (from: string, to: string) => void;
  /** Replace the synced player↔player transaction-edge list (from /api/transactions). */
  setTransactionEdges: (list: Array<{ from: string; to: string; block: number }>) => void;
  allocateResearchEnergy: (researchId: string, amount: number) => boolean;
  unlockSkill: (skillId: string) => void;
  setMaxDeployTier: (tier: AgentTier) => void;
  initLattice: (totalBlocks: number) => void;
  addBlocknodesForBlock: (blockIndex: number) => void;
  claimBlocknode: (nodeId: string, userId: string) => boolean;
  secureBlocknode: (nodeId: string, cpuAmount: number) => void;
  /** Mine a grid cell (costs CPU). Cell must be adjacent to tier arm or owned territory. */
  mineGridNode: (cx: number, cy: number) => boolean;
  /** Claim a mined grid cell as territory (costs AGNTC). */
  claimGridNode: (cx: number, cy: number) => boolean;
  setVisibleTiers: (tiers: Tier[]) => void;
  setCurrentUserTier: (tier: Tier | null) => void;
  revealTier: (tier: Tier) => void;
  devRevealAll: boolean;
  setDevRevealAll: (on: boolean) => void;
  syncBlocknodeFromSupabase: (node: BlockNode) => void;
  reset: () => void;
}

const initialState = {
  agents: {} as Record<string, Agent>,
  haiku: [] as HaikuMessage[],
  diplomacy: {} as Record<string, DiplomaticState>,
  planets: {} as Record<string, Planet>,
  currentUserId: null as string | null,
  currentAgentId: null as string | null,
  energy: 1000,
  minerals: 50,
  agntcBalance: 50,
  securedChains: 0,
  minedChains: 0,
  miningCpuPerBlock: 0,
  securingCpuPerBlock: 0,
  cpuRegenPerTurn: 100,
  resourceDeltas: {} as Record<string, { value: number; ts: number }>,
  turn: 0,
  turnInterval: null as number | null,
  chainMode: "mock" as "testnet" | "mock",
  testnetBlocks: 0,
  isInitializing: true,
  poolRemaining: 0,
  totalMined: 0,
  stateRoot: "",
  nextBlockIn: 60,
  epochRing: 0,
  hardness: 1,
  walletSecuringRate: 0,
  walletMiningRate: 0,
  walletEffectiveStake: 0,
  blocknodes: {} as Record<string, BlockNode>,
  gridNodes: {} as Record<string, GridNode>,
  visibleTiers: [] as Tier[],
  totalBlocksMined: 0,
  devRevealAll: false,
  currentUserTier: null as Tier | null,
  researchProgress: {} as Record<string, ResearchProgress>,
  completedResearch: [] as string[],
  unlockedSkills: [] as string[],
  maxDeployTier: "synapse" as AgentTier, // default: Community tier (synapse only)
  activeTab: "network" as GameTab,
  empireColor: 0xffffff, // default: Community tier white
  activeDockPanel: null as DockPanelId | null,
  focusRequest: null as { nodeId: string; ts: number } | null,
  subagentDragPositions: {} as Record<string, { x: number; y: number }>,
  focusedNodeId: null as string | null,
  interactionEdges: [] as Array<{ from: string; to: string; bornAt: number }>,
  transactionEdges: [] as Array<{ from: string; to: string; block: number }>,
};

/** Voronoi: returns the nearest tier arm node's tier for a given cell coordinate. */
function computeCellTier(
  cx: number,
  cy: number,
  blocknodes: Record<string, BlockNode>
): Tier | null {
  const nodes = Object.values(blocknodes);
  if (nodes.length === 0) return null;
  let minDist = Infinity;
  let nearest: Tier | null = null;
  for (const node of nodes) {
    const d = (node.cx - cx) ** 2 + (node.cy - cy) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = node.tier;
    }
  }
  return nearest;
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  addAgent: (agent) => set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),

  createAgent: (tier, position, name, parentAgentId) => {
    // Map tier → starting level: synapse→1, cortex→4, lattice→7, nexus→10
    const TIER_START_LEVEL: Record<AgentTier, number> = {
      synapse: 1, cortex: 4, lattice: 7, nexus: 10,
    };
    const startLevel = TIER_START_LEVEL[tier] ?? 1;
    const cpuCost = getNodeCpuPerTurn(startLevel) * 5;
    const state = useGameStore.getState();
    if (state.energy < cpuCost) return null;

    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const agent: Agent = {
      id,
      userId: state.currentUserId || "unknown",
      position,
      level: startLevel,
      miningCpu: 0,
      securingCpu: 0,
      levelingUntilTurn: null,
      isPrimary: false,
      planets: [],
      createdAt: Date.now(),
      username: name || `Agent-${id.slice(-4)}`,
      borderRadius: TIER_BASE_BORDER[tier],
      borderPressure: 0,
      cpuPerTurn: getNodeCpuPerTurn(startLevel),
      miningRate: TIER_MINING_RATE[tier],
      energyLimit: getNodeCpuPerTurn(startLevel) * 5,
      stakedCpu: 0,
      parentAgentId,
    };

    set((s) => ({
      agents: { ...s.agents, [id]: agent },
      energy: s.energy - cpuCost,
    }));

    return id;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  claimNode: (slotId, _tier, parentAgentId) => {
    const state = useGameStore.getState();
    let slot = state.agents[slotId];

    // Polymorphic lookup: if no agent exists with this id, fall back to blocknodes.
    // The deploy flow in AgentChat now targets unclaimed blocknodes (the cells actually
    // rendered on the lattice) and uses their ids — synthesize a slot from the blocknode
    // so the existing claim logic keeps working without a separate code path.
    if (!slot) {
      const blocknode = state.blocknodes[slotId];
      if (!blocknode || blocknode.ownerId) return false;
      slot = {
        id: slotId,
        userId: "",
        position: { x: blocknode.cx * 64, y: blocknode.cy * 64 },
        level: 1,
        miningCpu: 0,
        securingCpu: 0,
        levelingUntilTurn: null,
        isPrimary: false,
        planets: [],
        createdAt: 0,
        username: `Node ${blocknode.cx},${blocknode.cy}`,
        borderRadius: 0,
        borderPressure: 0,
        cpuPerTurn: 0,
        miningRate: 0,
        energyLimit: 0,
        stakedCpu: 0,
      };
    }
    if (slot.userId) return false;

    // Use fixed L1 claim cost (no longer tier-keyed)
    const energyCost = 10;
    const mineralCost = 3;
    if (state.energy < energyCost || state.minerals < mineralCost) return false;

    const claimed: Agent = {
      ...slot,
      userId: state.currentUserId || "unknown",
      level: 1,
      miningCpu: 0,
      securingCpu: 0,
      levelingUntilTurn: null,
      borderRadius: 64,                         // was TIER_BASE_BORDER[tier]
      borderPressure: 0,
      cpuPerTurn: 10,                           // was TIER_CPU_COST[tier]
      miningRate: 1,                            // was TIER_MINING_RATE[tier]
      energyLimit: 50,                          // was TIER_CPU_COST[tier] * 5
      stakedCpu: 0,
      createdAt: Date.now(),
      parentAgentId,
    };

    set((s) => {
      const existingBlocknode = s.blocknodes[slotId];
      return {
        agents: { ...s.agents, [slotId]: claimed },
        energy: s.energy - energyCost,
        minerals: s.minerals - mineralCost,
        // If this id maps to a blocknode, mark it owned in the same set() so the
        // map renders the new ownership and the cell can't be re-deployed to.
        ...(existingBlocknode && existingBlocknode.ownerId === null
          ? {
              blocknodes: {
                ...s.blocknodes,
                [slotId]: {
                  ...existingBlocknode,
                  ownerId: state.currentUserId || "unknown",
                  // Tag the cell with the claimant's tier so the BlockNodePanel
                  // shows the correct identity.
                  // Falls back to existing tag (null for unclaimed) if tier unset.
                  tier: state.currentUserTier ?? existingBlocknode.tier,
                },
              },
            }
          : {}),
      };
    });

    return true;
  },

  moveAgent: (agentId, position) =>
    set((s) => {
      if (!s.agents[agentId]) return s;
      return {
        agents: {
          ...s.agents,
          [agentId]: { ...s.agents[agentId], position },
        },
      };
    }),

  /**
   * Set border pressure (CPU/turn allocated to pushing borders).
   * Higher pressure = more effective border radius when competing.
   * This adds to the agent's per-turn CPU cost.
   * Borders never expand beyond star systems — pressure only matters
   * when competing against other users' borders.
   */
  setBorderPressure: (agentId, pressure) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      const clampedPressure = Math.max(0, Math.min(20, pressure));
      const baseCost = getNodeCpuPerTurn(agent.level);
      const baseMining = TIER_MINING_RATE[getNodeTierFromStore(agent.level)];
      const extraMining = Math.max(0, (agent.miningRate ?? baseMining) - baseMining);
      return {
        agents: {
          ...s.agents,
          [agentId]: {
            ...agent,
            borderPressure: clampedPressure,
            cpuPerTurn: baseCost + clampedPressure + extraMining + (agent.stakedCpu ?? 0),
          },
        },
      };
    }),

  /**
   * Adjust mining rate — extra mining above base tier rate costs 1 CPU per point.
   * cpuPerTurn = baseLevelCost + borderPressure + max(0, miningRate - baseMining)
   */
  setMiningRate: (agentId, rate) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      const clampedRate = Math.max(0, Math.min(50, rate));
      const baseCost = getNodeCpuPerTurn(agent.level);
      const baseMining = TIER_MINING_RATE[getNodeTierFromStore(agent.level)];
      const extraMining = Math.max(0, clampedRate - baseMining);
      return {
        agents: {
          ...s.agents,
          [agentId]: {
            ...agent,
            miningRate: clampedRate,
            cpuPerTurn: baseCost + agent.borderPressure + extraMining + (agent.stakedCpu ?? 0),
          },
        },
      };
    }),

  setEnergyLimit: (agentId, limit) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      const clampedLimit = Math.max(1, Math.min(200, limit));
      return {
        agents: {
          ...s.agents,
          [agentId]: { ...agent, energyLimit: clampedLimit },
        },
      };
    }),

  /**
   * Set CPU staked for blockchain security.
   * Staked CPU adds to the agent's per-turn cost (reduces available energy)
   * but contributes to securing the underlying blockchain network.
   * cpuPerTurn = baseTierCost + borderPressure + extraMining + stakedCpu
   */
  setStakedCpu: (agentId, staked) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      const clampedStake = Math.max(0, Math.min(30, staked));
      const baseCost = getNodeCpuPerTurn(agent.level);
      const baseMining = TIER_MINING_RATE[getNodeTierFromStore(agent.level)];
      const extraMining = Math.max(0, (agent.miningRate ?? baseMining) - baseMining);
      return {
        agents: {
          ...s.agents,
          [agentId]: {
            ...agent,
            stakedCpu: clampedStake,
            cpuPerTurn: baseCost + agent.borderPressure + extraMining + clampedStake,
          },
        },
      };
    }),

  /** Set an agent as the primary (homeworld). Unsets previous primary for the same user. */
  setPrimary: (agentId) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent || !s.currentUserId || agent.userId !== s.currentUserId) return s;
      const updated = { ...s.agents };
      for (const [id, a] of Object.entries(updated)) {
        if (a.userId === s.currentUserId && a.isPrimary) {
          updated[id] = { ...a, isPrimary: false };
        }
      }
      updated[agentId] = { ...updated[agentId], isPrimary: true };
      return { agents: updated, currentAgentId: agentId };
    }),

  addHaiku: (haiku) => set((s) => ({ haiku: [...s.haiku, haiku] })),

  addPlanet: (planet) => set((s) => ({ planets: { ...s.planets, [planet.id]: planet } })),

  togglePlanetZK: (planetId) =>
    set((s) => {
      if (!s.planets[planetId]) return s;
      return {
        planets: {
          ...s.planets,
          [planetId]: {
            ...s.planets[planetId],
            isZeroKnowledge: !s.planets[planetId].isZeroKnowledge,
          },
        },
      };
    }),

  setCurrentUser: (userId, agentId) => set({ currentUserId: userId, currentAgentId: agentId }),


  updateDiplomacy: (state) => {
    const key = [state.agentA, state.agentB].sort().join("-");
    set((s) => ({ diplomacy: { ...s.diplomacy, [key]: state } }));
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateResources: (energy, minerals, agntc) => set({ energy, minerals, agntcBalance: agntc }),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  spendEnergy: (amount, _reason) => {
    const s = useGameStore.getState();
    if (s.energy < amount) return false;
    set({
      energy: s.energy - amount,
      resourceDeltas: {
        ...s.resourceDeltas,
        energy: { value: -amount, ts: Date.now() },
      },
    });
    return true;
  },

  addSecuredChain: () =>
    set((s) => ({
      securedChains: s.securedChains + 1,
      resourceDeltas: {
        ...s.resourceDeltas,
        securedChains: { value: 1, ts: Date.now() },
      },
    })),

  flashDelta: (key, value) =>
    set((s) => ({
      resourceDeltas: {
        ...s.resourceDeltas,
        [key]: { value, ts: Date.now() },
      },
    })),

  tick: () =>
    set((s) => {
      if (!s.currentUserId) return s;
      const nextTurn = s.turn + 1;

      let income = s.cpuRegenPerTurn;
      let expenditure = 0;
      let totalMining = 0;
      let totalSecuring = 0;
      const updatedAgents: Record<string, Agent> = { ...s.agents };

      for (const agent of Object.values(s.agents)) {
        if (agent.userId !== s.currentUserId) continue;

        // Nodes always produce CPU (no Self-Dev lockout).
        income += getNodeCpuPerTurn(agent.level);

        // Mining/securing drain the pool every turn until the player changes them.
        expenditure += agent.miningCpu + agent.securingCpu;
        totalMining += agent.miningCpu;
        totalSecuring += agent.securingCpu;

        // Resolve level-up the moment the timer reaches the next turn.
        if (agent.levelingUntilTurn !== null && agent.levelingUntilTurn <= nextTurn) {
          updatedAgents[agent.id] = {
            ...agent,
            level: agent.level + 1,
            levelingUntilTurn: null,
          };
        }
      }

      const energy = Math.max(0, s.energy + income - expenditure);
      const minerals =
        s.minerals +
        Object.values(s.agents).filter((a) => a.userId === s.currentUserId).length;

      return {
        turn: nextTurn,
        energy,
        agents: updatedAgents,
        miningCpuPerBlock: totalMining,
        securingCpuPerBlock: totalSecuring,
        minerals,
        agntcBalance: s.agntcBalance,
      };
    }),

  startTurnTimer: () => {
    const state = useGameStore.getState();
    if (state.turnInterval) return; // already running
    const id = window.setInterval(() => {
      useGameStore.getState().tick();
    }, 10_000) as unknown as number;
    set({ turnInterval: id });
  },

  stopTurnTimer: () => {
    const state = useGameStore.getState();
    if (state.turnInterval) {
      clearInterval(state.turnInterval);
      set({ turnInterval: null });
    }
  },

  syncAgentFromChain: (agent) => set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),

  setChainMode: (mode, blocks) =>
    set({ chainMode: mode, ...(blocks !== undefined ? { testnetBlocks: blocks } : {}) }),

  setChainStatus: (status) =>
    set((s) => ({
      poolRemaining: status.poolRemaining,
      totalMined: status.totalMined,
      stateRoot: status.stateRoot,
      nextBlockIn: status.nextBlockIn,
      testnetBlocks: status.blocks,
      ...(status.epochRing !== undefined ? { epochRing: status.epochRing } : {}),
      ...(status.hardness !== undefined ? { hardness: status.hardness } : {}),
    })),

  setWalletState: (state) =>
    set((s) => {
      const securedDelta = state.securedChains - s.securedChains;
      const minedDelta = state.minedChains - s.minedChains;
      const hasDelta = securedDelta !== 0 || minedDelta !== 0;
      return {
        securedChains: state.securedChains,
        minedChains: state.minedChains,
        walletSecuringRate: state.securingRate,
        walletMiningRate: state.miningRate,
        walletEffectiveStake: state.effectiveStake,
        ...(hasDelta
          ? {
              resourceDeltas: {
                ...s.resourceDeltas,
                ...(securedDelta !== 0
                  ? { securedChains: { value: securedDelta, ts: Date.now() } }
                  : {}),
                ...(minedDelta !== 0
                  ? { minedChains: { value: minedDelta, ts: Date.now() } }
                  : {}),
              },
            }
          : {}),
      };
    }),

  setSyncedAgntcBalance: (agntc) => set({ agntcBalance: agntc }),

  setNodeMiningSecuring: (agentId, mining, securing) => {
    const validPresets: ReadonlyArray<number> = MINING_PRESETS;
    if (!validPresets.includes(mining) || !validPresets.includes(securing)) return false;
    const s = useGameStore.getState();
    if (!s.agents[agentId]) return false;
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          miningCpu: mining,
          securingCpu: securing,
        },
      },
    }));
    return true;
  },

  beginNodeLevelUp: (agentId) => {
    const s = useGameStore.getState();
    const agent = s.agents[agentId];
    if (!agent || agent.levelingUntilTurn !== null) return false;
    const cost = getLevelUpCost(agent.level);
    if (s.energy < cost) return false; // cannot afford
    set((state) => ({
      energy: state.energy - cost,
      agents: {
        ...state.agents,
        [agentId]: { ...agent, levelingUntilTurn: state.turn + agent.level },
      },
    }));
    return true;
  },

  cancelNodeLevelUp: (agentId) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent || agent.levelingUntilTurn === null) return s;
      return {
        agents: {
          ...s.agents,
          [agentId]: { ...agent, levelingUntilTurn: null },
        },
      };
    }),

  setCpuRegen: (regen) => set({ cpuRegenPerTurn: regen }),

  setInitializing: (v) => set({ isInitializing: v }),

  setEmpireColor: (color) => set({ empireColor: color }),

  setActiveDockPanel: (panel) =>
    set((s) => ({
      activeDockPanel: panel === null ? null : s.activeDockPanel === panel ? null : panel,
    })),

  switchAgent: (agentId) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent || agent.userId !== s.currentUserId) return s;
      return { currentAgentId: agentId };
    }),

  requestFocus: (nodeId) => set({ focusRequest: { nodeId, ts: Date.now() } }),

  clearFocusRequest: () => set({ focusRequest: null }),

  setSubagentDragPosition: (id, pos) =>
    set((s) => ({ subagentDragPositions: { ...s.subagentDragPositions, [id]: pos } })),

  setFocusedNode: (nodeId) => set({ focusedNodeId: nodeId }),

  addInteractionEdge: (from, to) =>
    set((s) => ({
      // Stamp with the current turn so the edge layer can fade it via edgeAlpha.
      // Drop edges older than the fade window + keep the list bounded.
      interactionEdges: [
        ...s.interactionEdges.filter((e) => s.turn - e.bornAt < EDGE_FADE_BLOCKS),
        { from, to, bornAt: s.turn },
      ].slice(-50),
    })),

  setTransactionEdges: (list) => set({ transactionEdges: list.slice(-50) }),

  allocateResearchEnergy: (researchId, amount) => {
    const s = useGameStore.getState();
    if (s.energy < amount) return false;
    const allItems = Object.values(RESEARCH_TREES).flat();
    const item = allItems.find((r) => r.id === researchId);
    if (!item) return false;

    const existing = s.researchProgress[researchId];
    const currentInvested = existing?.energyInvested ?? 0;
    // Cap investment at the research cost
    const remaining = item.energyCost - currentInvested;
    if (remaining <= 0) return false;
    const actualAmount = Math.min(amount, remaining);
    const newInvested = currentInvested + actualAmount;
    const completed = newInvested >= item.energyCost;

    set({
      energy: s.energy - actualAmount,
      researchProgress: {
        ...s.researchProgress,
        [researchId]: {
          researchId,
          energyInvested: newInvested,
          completed,
        },
      },
      completedResearch: completed && !s.completedResearch.includes(researchId)
        ? [...s.completedResearch, researchId]
        : s.completedResearch,
      resourceDeltas: {
        ...s.resourceDeltas,
        energy: { value: -actualAmount, ts: Date.now() },
      },
    });
    return true;
  },

  unlockSkill: (skillId) =>
    set((s) => ({
      unlockedSkills: s.unlockedSkills.includes(skillId)
        ? s.unlockedSkills
        : [...s.unlockedSkills, skillId],
    })),

  setMaxDeployTier: (tier) => set({ maxDeployTier: tier }),

  initLattice: (totalRings) =>
    set({
      blocknodes: buildAllCells(totalRings),
      totalBlocksMined: totalRings,
      visibleTiers: [],
    }),

  addBlocknodesForBlock: (ringIndex) =>
    set((s) => {
      const newCells = buildCellsForRing(ringIndex);
      return {
        blocknodes: { ...s.blocknodes, ...newCells },
        totalBlocksMined: Math.max(s.totalBlocksMined, ringIndex),
      };
    }),

  claimBlocknode: (nodeId, userId) => {
    const s = useGameStore.getState();
    const node = s.blocknodes[nodeId];
    if (!node || node.ownerId !== null) return false;
    if (s.currentUserTier === null) return false; // need tier to tag the cell
    set((state) => ({
      blocknodes: {
        ...state.blocknodes,
        [nodeId]: { ...node, ownerId: userId, tier: s.currentUserTier },
      },
      // visibleTiers NOT updated here — call revealTier() explicitly
    }));
    return true;
  },

  secureBlocknode: (nodeId, cpuAmount) =>
    set((s) => {
      const node = s.blocknodes[nodeId];
      if (!node) return s;
      const clampedCpu = Math.max(0, cpuAmount);
      const agntcEarned = node.secureStrength * clampedCpu * 0.001;
      const updatedNode: BlockNode = {
        ...node,
        stakedCpu: node.stakedCpu + clampedCpu,
        cumulativeSecures: node.cumulativeSecures + 1,
      };
      return {
        blocknodes: { ...s.blocknodes, [nodeId]: updatedNode },
        agntcBalance: Math.round((s.agntcBalance + agntcEarned) * 1000) / 1000,
        energy: Math.max(0, s.energy - clampedCpu),
        resourceDeltas: {
          ...s.resourceDeltas,
          agntc: { value: agntcEarned, ts: Date.now() },
          energy: { value: -clampedCpu, ts: Date.now() },
        },
      };
    }),

  mineGridNode: (cx, cy) => {
    const s = useGameStore.getState();
    const userId = s.currentUserId;
    const tier = s.currentUserTier;
    if (!userId || !tier) return false;

    const nodeId = `grid-${cx}-${cy}`;
    const existing = s.gridNodes[nodeId];
    // Node is only mineable if it hasn't been interacted with yet ("available" = not in map or explicitly available)
    if (existing && existing.state !== "available") return false;

    // Arm cells are tier infrastructure — not mineable territory
    const isArmCell = Object.values(s.blocknodes).some((n) => n.cx === cx && n.cy === cy);
    if (isArmCell) return false;

    // Grid expands one ring per block: range = totalBlocksMined + 1, min 1
    const mineableRange = Math.max(1, s.totalBlocksMined + 1);
    if (Math.abs(cx) > mineableRange || Math.abs(cy) > mineableRange) return false;

    // Must be in user's Voronoi tier territory
    const cellTier = computeCellTier(cx, cy, s.blocknodes);
    if (cellTier !== tier) return false;

    // Must be adjacent (Chebyshev ≤ 1) to a tier arm node OR an owned+claimed grid node
    const armNodes = Object.values(s.blocknodes).filter((n) => n.tier === tier);
    const adjacentToArm = armNodes.some(
      (n) => Math.abs(n.cx - cx) <= 1 && Math.abs(n.cy - cy) <= 1
    );
    const ownedGrid = Object.values(s.gridNodes).filter(
      (n) => n.ownerId === userId && n.state === "claimed"
    );
    const adjacentToOwned = ownedGrid.some(
      (n) => Math.abs(n.cx - cx) <= 1 && Math.abs(n.cy - cy) <= 1
    );
    if (!adjacentToArm && !adjacentToOwned) return false;

    if (s.energy < MINE_GRID_CPU_COST) return false;

    const gridNode: GridNode = {
      id: nodeId,
      cx,
      cy,
      state: "mined",
      ownerId: null,
      tier,
      mineCpuCost: MINE_GRID_CPU_COST,
    };
    set((state) => ({
      gridNodes: { ...state.gridNodes, [nodeId]: gridNode },
      energy: Math.max(0, state.energy - MINE_GRID_CPU_COST),
      resourceDeltas: {
        ...state.resourceDeltas,
        energy: { value: -MINE_GRID_CPU_COST, ts: Date.now() },
      },
    }));
    return true;
  },

  claimGridNode: (cx, cy) => {
    const s = useGameStore.getState();
    const userId = s.currentUserId;
    if (!userId) return false;
    const nodeId = `grid-${cx}-${cy}`;
    const node = s.gridNodes[nodeId];
    // Node must be mined (not claimed or available) and not yet owned
    if (!node || node.state !== "mined") return false;
    if (s.agntcBalance < CLAIM_GRID_AGNTC_COST) return false;
    set((state) => ({
      gridNodes: {
        ...state.gridNodes,
        [nodeId]: { ...node, state: "claimed", ownerId: userId },
      },
      agntcBalance: Math.round((state.agntcBalance - CLAIM_GRID_AGNTC_COST) * 1000) / 1000,
      resourceDeltas: {
        ...state.resourceDeltas,
        agntc: { value: -CLAIM_GRID_AGNTC_COST, ts: Date.now() },
      },
    }));
    return true;
  },

  setVisibleTiers: (tiers) => set({ visibleTiers: tiers }),

  setCurrentUserTier: (tier) => set({ currentUserTier: tier }),

  revealTier: (tier) =>
    set((s) => ({
      visibleTiers: s.visibleTiers.includes(tier)
        ? s.visibleTiers
        : [...s.visibleTiers, tier],
    })),

  setDevRevealAll: (on) => set({ devRevealAll: on }),

  syncBlocknodeFromSupabase: (node) =>
    set((s) => ({
      blocknodes: { ...s.blocknodes, [node.id]: node },
      // visibleTiers not auto-updated — controlled explicitly
    })),

  reset: () => {
    const state = useGameStore.getState();
    if (state.turnInterval) clearInterval(state.turnInterval);
    set({ ...initialState, turnInterval: null });
  },
}));
