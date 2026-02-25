import { create } from 'zustand';
import type { Agent, HaikuMessage, GridPosition, DiplomaticState, Planet } from '@/types';
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE, TIER_CLAIM_COST } from '@/types/agent';
import type { AgentTier } from '@/types';
import type { Faction } from '@/lib/spiral/SpiralClassifier';

interface Camera {
  position: GridPosition;
  zoom: number;
}

export type GameTab = 'network' | 'account' | 'researches' | 'skills';
export type DockPanelId = 'chat' | 'terminal' | 'deploy' | 'stats' | 'timeRewind' | 'nodes';

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
  cpuTokens: number;
  minerals: number;
  agntcBalance: number;
  securedChains: number;
  cpuStakedActive: number;  // tokens spent by Secure sub-agents this block
  cpuStakedTotal: number;   // all-time cumulative Secure token spend
  devPoints: number;
  researchPoints: number;
  storageSize: number;
  subgridAgntcPerBlock: number;
  subgridDevPerBlock: number;
  subgridResearchPerBlock: number;
  subgridStoragePerBlock: number;

  // Resource deltas (flash indicators)
  resourceDeltas: Record<string, { value: number; ts: number }>;

  // Turn system
  turn: number;
  turnInterval: number | null; // setInterval ID

  // Chain connection
  chainMode: 'testnet' | 'mock';
  testnetBlocks: number;
  isInitializing: boolean;

  // Chain status (from testnet API)
  poolRemaining: number;
  totalMined: number;
  stateRoot: string;
  nextBlockIn: number;

  // Subscription restriction
  maxDeployTier: AgentTier; // highest tier this user can deploy (from subscription)

  // Spiral faction (determines fog/color in galaxy grid)
  userFaction: Faction;

  // UI
  activeTab: GameTab;
  empireColor: number;
  activeDockPanel: DockPanelId | null;
  focusRequest: { nodeId: string; ts: number } | null;

  // Actions
  addAgent: (agent: Agent) => void;
  createAgent: (tier: AgentTier, position: GridPosition, name?: string, parentAgentId?: string) => string | null;
  claimNode: (slotId: string, tier: AgentTier, parentAgentId?: string) => boolean;
  tick: () => void;           // advance one turn — apply net resource production
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
  setCpuTokens: (value: number) => void;
  setCpuStaked: (active: number, total: number) => void;
  setDevPoints: (value: number) => void;
  setResearchPoints: (value: number) => void;
  setStorageSize: (value: number) => void;
  setSubgridProjection: (agntc: number, dev: number, research: number, storage: number) => void;
  syncAgentFromChain: (agent: Agent) => void;
  setChainMode: (mode: 'testnet' | 'mock', blocks?: number) => void;
  setChainStatus: (status: { poolRemaining: number; totalMined: number; stateRoot: string; nextBlockIn: number; blocks: number }) => void;
  setInitializing: (v: boolean) => void;
  setEmpireColor: (color: number) => void;
  setActiveDockPanel: (panel: DockPanelId | null) => void;
  switchAgent: (agentId: string) => void;
  requestFocus: (nodeId: string) => void;
  clearFocusRequest: () => void;
  setMaxDeployTier: (tier: AgentTier) => void;
  setUserFaction: (faction: Faction) => void;
  cpuTokensEarnedHistory: number[]; // last N CPU Token awards, for estimating per-turn rate
  addCpuEnergy: (amount: number) => void;
  recordEnergyEarned: (amount: number) => void;
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
  cpuTokens: 1000,
  minerals: 50,
  agntcBalance: 50,
  securedChains: 0,
  cpuStakedActive: 0,
  cpuStakedTotal: 0,
  devPoints: 0,
  researchPoints: 0,
  storageSize: 0,
  subgridAgntcPerBlock: 0,
  subgridDevPerBlock: 0,
  subgridResearchPerBlock: 0,
  subgridStoragePerBlock: 0,
  resourceDeltas: {} as Record<string, { value: number; ts: number }>,
  turn: 0,
  turnInterval: null as number | null,
  chainMode: 'mock' as 'testnet' | 'mock',
  testnetBlocks: 0,
  isInitializing: true,
  poolRemaining: 0,
  totalMined: 0,
  stateRoot: '',
  nextBlockIn: 60,
  maxDeployTier: 'haiku' as AgentTier, // default: Community tier (haiku only)
  userFaction: 'free_community' as Faction,
  activeTab: 'network' as GameTab,
  empireColor: 0x8b5cf6, // default: purple (Opus)
  activeDockPanel: null as DockPanelId | null,
  focusRequest: null as { nodeId: string; ts: number } | null,
  cpuTokensEarnedHistory: [] as number[],
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  addAgent: (agent) =>
    set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),

  createAgent: (tier, position, name, parentAgentId) => {
    const cost = TIER_CPU_COST[tier] * 5;
    const state = useGameStore.getState();
    if (state.cpuTokens < cost) return null;

    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const agent: Agent = {
      id,
      userId: state.currentUserId || 'unknown',
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
      cpuTokens: s.cpuTokens - cost,
    }));

    return id;
  },

  claimNode: (slotId, tier, parentAgentId) => {
    const state = useGameStore.getState();
    const slot = state.agents[slotId];
    if (!slot || slot.userId) return false;

    const energyCost = TIER_CLAIM_COST[tier];
    const mineralCost = Math.ceil(TIER_CLAIM_COST[tier] * 0.3);
    if (state.cpuTokens < energyCost || state.minerals < mineralCost) return false;

    const claimed: Agent = {
      ...slot,
      userId: state.currentUserId || 'unknown',
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
      cpuTokens: s.cpuTokens - energyCost,
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

  addHaiku: (haiku) => {
    set((s) => ({ haiku: [...s.haiku, haiku] }))
    import('@/lib/persistSocial').then(({ persistHaiku }) => persistHaiku(haiku))
  },

  addPlanet: (planet) => {
    set((s) => ({ planets: { ...s.planets, [planet.id]: planet } }))
    import('@/lib/persistSocial').then(({ persistPlanet }) => persistPlanet(planet))
  },

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

  setCurrentUser: (userId, agentId) =>
    set({ currentUserId: userId, currentAgentId: agentId }),

  setCamera: (position, zoom) =>
    set({ camera: { position, zoom } }),

  updateDiplomacy: (state) => {
    const key = [state.agentA, state.agentB].sort().join('-');
    set((s) => ({ diplomacy: { ...s.diplomacy, [key]: state } }));
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateResources: (energy, minerals, agntc) =>
    set({ cpuTokens: energy, minerals, agntcBalance: agntc }),

  spendEnergy: (amount, _reason) => {
    const s = useGameStore.getState();
    if (s.cpuTokens < amount) return false;
    set({
      cpuTokens: s.cpuTokens - amount,
      resourceDeltas: {
        ...s.resourceDeltas,
        cpuTokens: { value: -amount, ts: Date.now() },
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

  setCpuTokens: (value) => set({ cpuTokens: value }),
  setCpuStaked: (active, total) => set({ cpuStakedActive: active, cpuStakedTotal: total }),
  setDevPoints: (value) => set({ devPoints: value }),
  setResearchPoints: (value) => set({ researchPoints: value }),
  setStorageSize: (value) => set({ storageSize: value }),
  setSubgridProjection: (agntc, dev, research, storage) => set({
    subgridAgntcPerBlock: agntc,
    subgridDevPerBlock: dev,
    subgridResearchPerBlock: research,
    subgridStoragePerBlock: storage,
  }),

  /**
   * Advance one turn. Calculate net resource production:
   *   netEnergy = baseIncome + sum(miningRate) - sum(cpuPerTurn)
   *   minerals grow slowly (+1 per claimed agent per turn)
   *   agntcCost = sum of border pressure costs (0.1 AGNTC per pressure point per turn)
   *   borderRadius grows by (pressure * 0.5) per turn, capped at 3x base radius
   *   baseIncome = 1000 (simulation grant — represents testnet faucet)
   */
  tick: () =>
    set((s) => {
      if (!s.currentUserId) return s;
      const ownAgents = Object.values(s.agents).filter(
        (a) => a.userId === s.currentUserId,
      );
      // No homenode deployed yet — don't tick energy (no costs, no income)
      if (ownAgents.length === 0) return s;
      const baseIncome = 1000; // simulation testnet faucet
      const totalMining = ownAgents.reduce((sum, a) => sum + (a.miningRate ?? 0), 0);
      const totalCpuCost = ownAgents.reduce((sum, a) => sum + a.cpuPerTurn, 0);
      const netEnergy = baseIncome + totalMining - totalCpuCost;
      const mineralGain = ownAgents.length; // 1 mineral per claimed system per turn
      // Border pressure costs AGNTC — 0.1 AGNTC per pressure point per turn
      const totalPressureCost = ownAgents.reduce(
        (sum, a) => sum + (a.borderPressure ?? 0) * 0.1, 0,
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
        cpuTokens: Math.max(0, s.cpuTokens + netEnergy),
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

  syncAgentFromChain: (agent) =>
    set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),

  setChainMode: (mode, blocks) =>
    set({ chainMode: mode, ...(blocks !== undefined ? { testnetBlocks: blocks } : {}) }),

  setChainStatus: (status) =>
    set({
      poolRemaining: status.poolRemaining,
      totalMined: status.totalMined,
      stateRoot: status.stateRoot,
      nextBlockIn: status.nextBlockIn,
      testnetBlocks: status.blocks,
    }),

  setInitializing: (v) => set({ isInitializing: v }),

  setEmpireColor: (color) => set({ empireColor: color }),

  setActiveDockPanel: (panel) =>
    set((s) => ({
      activeDockPanel: panel === null ? null : (s.activeDockPanel === panel ? null : panel),
    })),

  switchAgent: (agentId) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent || agent.userId !== s.currentUserId) return s;
      return { currentAgentId: agentId };
    }),

  requestFocus: (nodeId) =>
    set({ focusRequest: { nodeId, ts: Date.now() } }),

  clearFocusRequest: () => set({ focusRequest: null }),

  setMaxDeployTier: (tier) => set({ maxDeployTier: tier }),

  setUserFaction: (faction) => set({ userFaction: faction }),

  addCpuEnergy: (amount) =>
    set((s) => ({ cpuTokens: Math.max(0, s.cpuTokens + amount) })),

  recordEnergyEarned: (amount) =>
    set((s) => ({
      cpuTokensEarnedHistory: [...s.cpuTokensEarnedHistory.slice(-19), amount],
    })),

  reset: () => {
    const state = useGameStore.getState();
    if (state.turnInterval) clearInterval(state.turnInterval);
    set({ ...initialState, turnInterval: null });
  },
}));
