import { create } from "zustand";
import type { Agent, HaikuMessage, GridPosition, DiplomaticState, Planet } from "@/types";
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE, TIER_CLAIM_COST } from "@/types/agent";
import type { AgentTier } from "@/types";
import type { FactionId, BlockNode, GridNode } from "@/types";
import type { ResearchProgress } from "@/types/research";
import { RESEARCH_TREES } from "@/lib/research";
import { buildBlocknodesForBlock, buildAllBlocknodes } from "@/lib/lattice";

/** CPU Energy deducted per turn for each owned blocknode (maintenance cost) */
export const NODE_CPU_PER_TURN = 1;

/** AGNTC cost to spawn one new node in the user's faction arm */
export const SPAWN_NODE_AGNTC_COST = 1;

/** CPU energy to mine one grid cell (off-arm territory node) */
export const MINE_GRID_CPU_COST = 10;

/** AGNTC cost to claim a mined grid cell */
export const CLAIM_GRID_AGNTC_COST = 1;

interface Camera {
  position: GridPosition;
  zoom: number;
}

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

  // Camera
  camera: Camera;

  // Resources
  energy: number;
  minerals: number;
  agntcBalance: number;
  securedChains: number;

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

  // Neural Lattice / blocknode state (arm nodes — faction infrastructure)
  blocknodes: Record<string, BlockNode>;
  // Grid node territory (user-claimable cells off the arm)
  gridNodes: Record<string, GridNode>;
  visibleFactions: FactionId[];
  totalBlocksMined: number;

  // Faction territory — null = no restriction (dev seed / uninitialized)
  currentUserFaction: FactionId | null;

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
  setCamera: (position: GridPosition, zoom: number) => void;
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
    securingRate: number;
    miningRate: number;
    effectiveStake: number;
  }) => void;
  setInitializing: (v: boolean) => void;
  setEmpireColor: (color: number) => void;
  setActiveDockPanel: (panel: DockPanelId | null) => void;
  switchAgent: (agentId: string) => void;
  requestFocus: (nodeId: string) => void;
  clearFocusRequest: () => void;
  allocateResearchEnergy: (researchId: string, amount: number) => boolean;
  unlockSkill: (skillId: string) => void;
  setMaxDeployTier: (tier: AgentTier) => void;
  initLattice: (totalBlocks: number) => void;
  addBlocknodesForBlock: (blockIndex: number) => void;
  claimBlocknode: (nodeId: string, userId: string) => boolean;
  secureBlocknode: (nodeId: string, cpuAmount: number) => void;
  /** Mine a grid cell (costs CPU). Cell must be adjacent to faction arm or owned territory. */
  mineGridNode: (cx: number, cy: number) => boolean;
  /** Claim a mined grid cell as territory (costs AGNTC). */
  claimGridNode: (cx: number, cy: number) => boolean;
  setVisibleFactions: (factions: FactionId[]) => void;
  setCurrentUserFaction: (faction: FactionId | null) => void;
  revealFaction: (faction: FactionId) => void;
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
  camera: { position: { x: 0, y: 0 }, zoom: 1 } as Camera,
  energy: 1000,
  minerals: 50,
  agntcBalance: 50,
  securedChains: 0,
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
  visibleFactions: [] as FactionId[],
  totalBlocksMined: 0,
  devRevealAll: false,
  currentUserFaction: null as FactionId | null,
  researchProgress: {} as Record<string, ResearchProgress>,
  completedResearch: [] as string[],
  unlockedSkills: [] as string[],
  maxDeployTier: "haiku" as AgentTier, // default: Community tier (haiku only)
  activeTab: "network" as GameTab,
  empireColor: 0xd946ef, // default: Max tier fuchsia (matches SUBSCRIPTION_EMPIRE_COLOR.MAX)
  activeDockPanel: null as DockPanelId | null,
  focusRequest: null as { nodeId: string; ts: number } | null,
};

/** Voronoi: returns the nearest faction arm node's faction for a given cell coordinate. */
function computeCellFaction(
  cx: number,
  cy: number,
  blocknodes: Record<string, BlockNode>
): FactionId | null {
  const nodes = Object.values(blocknodes);
  if (nodes.length === 0) return null;
  let minDist = Infinity;
  let nearest: FactionId | null = null;
  for (const node of nodes) {
    const d = (node.cx - cx) ** 2 + (node.cy - cy) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = node.faction;
    }
  }
  return nearest;
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  addAgent: (agent) => set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),

  createAgent: (tier, position, name, parentAgentId) => {
    const cost = TIER_CPU_COST[tier] * 5;
    const state = useGameStore.getState();
    if (state.energy < cost) return null;

    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const agent: Agent = {
      id,
      userId: state.currentUserId || "unknown",
      position,
      tier,
      isPrimary: false,
      planets: [],
      createdAt: Date.now(),
      username: name || `Agent-${id.slice(-4)}`,
      borderRadius: TIER_BASE_BORDER[tier],
      borderPressure: 0,
      cpuPerTurn: TIER_CPU_COST[tier],
      miningRate: TIER_MINING_RATE[tier],
      energyLimit: TIER_CPU_COST[tier] * 5,
      stakedCpu: 0,
      parentAgentId,
    };

    set((s) => ({
      agents: { ...s.agents, [id]: agent },
      energy: s.energy - cost,
    }));

    return id;
  },

  claimNode: (slotId, tier, parentAgentId) => {
    const state = useGameStore.getState();
    const slot = state.agents[slotId];
    if (!slot || slot.userId) return false;

    const energyCost = TIER_CLAIM_COST[tier];
    const mineralCost = Math.ceil(TIER_CLAIM_COST[tier] * 0.3);
    if (state.energy < energyCost || state.minerals < mineralCost) return false;

    const claimed: Agent = {
      ...slot,
      userId: state.currentUserId || "unknown",
      tier,
      borderRadius: TIER_BASE_BORDER[tier],
      borderPressure: 0,
      cpuPerTurn: TIER_CPU_COST[tier],
      miningRate: TIER_MINING_RATE[tier],
      energyLimit: TIER_CPU_COST[tier] * 5,
      stakedCpu: 0,
      createdAt: Date.now(),
      parentAgentId,
    };

    set((s) => ({
      agents: { ...s.agents, [slotId]: claimed },
      energy: s.energy - energyCost,
      minerals: s.minerals - mineralCost,
    }));

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
      const baseCost = TIER_CPU_COST[agent.tier];
      const baseMining = TIER_MINING_RATE[agent.tier];
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
   * cpuPerTurn = baseTierCost + borderPressure + max(0, miningRate - baseMining)
   */
  setMiningRate: (agentId, rate) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      const clampedRate = Math.max(0, Math.min(50, rate));
      const baseCost = TIER_CPU_COST[agent.tier];
      const baseMining = TIER_MINING_RATE[agent.tier];
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
      const baseCost = TIER_CPU_COST[agent.tier];
      const baseMining = TIER_MINING_RATE[agent.tier];
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

  setCamera: (position, zoom) => set({ camera: { position, zoom } }),

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

  /**
   * Advance one turn. Calculate net resource production:
   *   netEnergy = sum(miningRate) - sum(cpuPerTurn)
   *   minerals grow slowly (+1 per claimed agent per turn)
   *   agntcCost = sum of border pressure costs (0.1 AGNTC per pressure point per turn)
   *   borderRadius grows by (pressure * 0.5) per turn, capped at 3x base radius
   */
  tick: () =>
    set((s) => {
      if (!s.currentUserId) return s;
      const ownAgents = Object.values(s.agents).filter((a) => a.userId === s.currentUserId);
      const ownedNodes = Object.values(s.blocknodes).filter((n) => n.ownerId === s.currentUserId);
      const totalMining = ownAgents.reduce((sum, a) => sum + (a.miningRate ?? 0), 0);
      const totalCpuCost = ownAgents.reduce((sum, a) => sum + a.cpuPerTurn, 0);
      // Owned blocknodes cost NODE_CPU_PER_TURN each to maintain per turn
      const nodeMaintenance = ownedNodes.length * NODE_CPU_PER_TURN;
      const netEnergy = totalMining - totalCpuCost - nodeMaintenance;
      const mineralGain = ownAgents.length; // 1 mineral per claimed system per turn
      // Border pressure costs AGNTC — 0.1 AGNTC per pressure point per turn
      const totalPressureCost = ownAgents.reduce(
        (sum, a) => sum + (a.borderPressure ?? 0) * 0.1,
        0
      );

      // Territory expansion: border pressure grows borderRadius permanently
      // Rate: 0.5 radius units per pressure point per turn, capped at 3x base
      const updatedAgents = { ...s.agents };
      for (const a of ownAgents) {
        if (a.borderPressure > 0) {
          const maxRadius = TIER_BASE_BORDER[a.tier] * 3;
          const growth = a.borderPressure * 0.5;
          const newRadius = Math.min(maxRadius, a.borderRadius + growth);
          if (newRadius !== a.borderRadius) {
            updatedAgents[a.id] = { ...a, borderRadius: Math.round(newRadius * 10) / 10 };
          }
        }
      }

      return {
        turn: s.turn + 1,
        energy: Math.max(0, s.energy + netEnergy),
        minerals: s.minerals + mineralGain,
        agntcBalance: Math.round((s.agntcBalance - totalPressureCost) * 100) / 100,
        agents: updatedAgents,
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
      const delta = state.securedChains - s.securedChains;
      return {
        securedChains: state.securedChains,
        walletSecuringRate: state.securingRate,
        walletMiningRate: state.miningRate,
        walletEffectiveStake: state.effectiveStake,
        ...(delta !== 0
          ? { resourceDeltas: { ...s.resourceDeltas, securedChains: { value: delta, ts: Date.now() } } }
          : {}),
      };
    }),

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

  initLattice: (totalBlocks) =>
    set({
      blocknodes: buildAllBlocknodes(totalBlocks),
      totalBlocksMined: totalBlocks,
      visibleFactions: [],
    }),

  addBlocknodesForBlock: (blockIndex) =>
    set((s) => {
      const newNodes = buildBlocknodesForBlock(blockIndex);
      return {
        blocknodes: { ...s.blocknodes, ...newNodes },
        totalBlocksMined: Math.max(s.totalBlocksMined, blockIndex + 1),
      };
    }),

  claimBlocknode: (nodeId, userId) => {
    const s = useGameStore.getState();
    const node = s.blocknodes[nodeId];
    if (!node || node.ownerId !== null) return false;
    // Arm nodes are faction infrastructure — only assignable during init/dev-seed
    // (when currentUserFaction is null, before setCurrentUserFaction is called).
    // Regular users cannot claim arm nodes; they expand via mineGridNode/claimGridNode.
    if (s.currentUserFaction !== null) return false;
    set((state) => ({
      blocknodes: {
        ...state.blocknodes,
        [nodeId]: { ...node, ownerId: userId },
      },
      // visibleFactions NOT updated here — call revealFaction() explicitly
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
    const faction = s.currentUserFaction;
    if (!userId || !faction) return false;

    const nodeId = `grid-${cx}-${cy}`;
    const existing = s.gridNodes[nodeId];
    // Node is only mineable if it hasn't been interacted with yet ("available" = not in map or explicitly available)
    if (existing && existing.state !== "available") return false;

    // Arm cells are faction infrastructure — not mineable territory
    const isArmCell = Object.values(s.blocknodes).some((n) => n.cx === cx && n.cy === cy);
    if (isArmCell) return false;

    // Grid expands one ring per block: range = totalBlocksMined + 1, min 1
    const mineableRange = Math.max(1, s.totalBlocksMined + 1);
    if (Math.abs(cx) > mineableRange || Math.abs(cy) > mineableRange) return false;

    // Must be in user's Voronoi faction territory
    const cellFaction = computeCellFaction(cx, cy, s.blocknodes);
    if (cellFaction !== faction) return false;

    // Must be adjacent (Chebyshev ≤ 1) to a faction arm node OR an owned+claimed grid node
    const armNodes = Object.values(s.blocknodes).filter((n) => n.faction === faction);
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
      faction,
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

  setVisibleFactions: (factions) => set({ visibleFactions: factions }),

  setCurrentUserFaction: (faction) => set({ currentUserFaction: faction }),

  revealFaction: (faction) =>
    set((s) => ({
      visibleFactions: s.visibleFactions.includes(faction)
        ? s.visibleFactions
        : [...s.visibleFactions, faction],
    })),

  setDevRevealAll: (on) => set({ devRevealAll: on }),

  syncBlocknodeFromSupabase: (node) =>
    set((s) => ({
      blocknodes: { ...s.blocknodes, [node.id]: node },
      // visibleFactions not auto-updated — controlled explicitly
    })),

  reset: () => {
    const state = useGameStore.getState();
    if (state.turnInterval) clearInterval(state.turnInterval);
    set({ ...initialState, turnInterval: null });
  },
}));
