import { create } from 'zustand';
import type { Agent, HaikuMessage, GridPosition, DiplomaticState, Planet } from '@/types';
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE, TIER_CLAIM_COST } from '@/types/agent';
import type { AgentTier } from '@/types';

interface Camera {
  position: GridPosition;
  zoom: number;
}

export type GameTab = 'network' | 'account' | 'researches' | 'skills';

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

  // UI
  activeTab: GameTab;

  // Actions
  addAgent: (agent: Agent) => void;
  createAgent: (tier: AgentTier, position: GridPosition, name?: string, parentAgentId?: string) => string | null;
  claimNode: (slotId: string, tier: AgentTier) => boolean;
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
  syncAgentFromChain: (agent: Agent) => void;
  setChainMode: (mode: 'testnet' | 'mock', blocks?: number) => void;
  setChainStatus: (status: { poolRemaining: number; totalMined: number; stateRoot: string; nextBlockIn: number; blocks: number }) => void;
  setInitializing: (v: boolean) => void;
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
  turn: 0,
  turnInterval: null as number | null,
  chainMode: 'mock' as 'testnet' | 'mock',
  testnetBlocks: 0,
  isInitializing: true,
  poolRemaining: 0,
  totalMined: 0,
  stateRoot: '',
  nextBlockIn: 60,
  activeTab: 'network' as GameTab,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  addAgent: (agent) =>
    set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),

  createAgent: (tier, position, name, parentAgentId) => {
    const cost = TIER_CPU_COST[tier] * 5;
    const state = useGameStore.getState();
    if (state.energy < cost) return null;

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
      energy: s.energy - cost,
    }));

    return id;
  },

  claimNode: (slotId, tier) => {
    const state = useGameStore.getState();
    const slot = state.agents[slotId];
    if (!slot || slot.userId) return false;

    const energyCost = TIER_CLAIM_COST[tier];
    const mineralCost = Math.ceil(TIER_CLAIM_COST[tier] * 0.3);
    if (state.energy < energyCost || state.minerals < mineralCost) return false;

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

  addHaiku: (haiku) =>
    set((s) => ({ haiku: [...s.haiku, haiku] })),

  addPlanet: (planet) =>
    set((s) => ({ planets: { ...s.planets, [planet.id]: planet } })),

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
    set({ energy, minerals, agntcBalance: agntc }),

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

  reset: () => {
    const state = useGameStore.getState();
    if (state.turnInterval) clearInterval(state.turnInterval);
    set({ ...initialState, turnInterval: null });
  },
}));
