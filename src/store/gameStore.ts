import { create } from 'zustand';
import type { Agent, HaikuMessage, GridPosition, DiplomaticState, Planet } from '@/types';

interface Camera {
  position: GridPosition;
  zoom: number;
}

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

  // Actions
  addAgent: (agent: Agent) => void;
  moveAgent: (agentId: string, position: GridPosition) => void;
  addHaiku: (haiku: HaikuMessage) => void;
  addPlanet: (planet: Planet) => void;
  togglePlanetZK: (planetId: string) => void;
  setCurrentUser: (userId: string, agentId: string) => void;
  setCamera: (position: GridPosition, zoom: number) => void;
  updateDiplomacy: (state: DiplomaticState) => void;
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
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  addAgent: (agent) =>
    set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),

  moveAgent: (agentId, position) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: { ...s.agents[agentId], position },
      },
    })),

  addHaiku: (haiku) =>
    set((s) => ({ haiku: [...s.haiku, haiku] })),

  addPlanet: (planet) =>
    set((s) => ({ planets: { ...s.planets, [planet.id]: planet } })),

  togglePlanetZK: (planetId) =>
    set((s) => ({
      planets: {
        ...s.planets,
        [planetId]: {
          ...s.planets[planetId],
          isZeroKnowledge: !s.planets[planetId].isZeroKnowledge,
        },
      },
    })),

  setCurrentUser: (userId, agentId) =>
    set({ currentUserId: userId, currentAgentId: agentId }),

  setCamera: (position, zoom) =>
    set({ camera: { position, zoom } }),

  updateDiplomacy: (state) => {
    const key = [state.agentA, state.agentB].sort().join('-');
    set((s) => ({ diplomacy: { ...s.diplomacy, [key]: state } }));
  },

  reset: () => set(initialState),
}));
