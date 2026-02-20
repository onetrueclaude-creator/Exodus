import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store';
import type { Agent, HaikuMessage } from '@/types';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('initializes with empty state', () => {
    const state = useGameStore.getState();
    expect(state.agents).toEqual({});
    expect(state.haiku).toEqual([]);
    expect(state.currentUserId).toBeNull();
  });

  it('adds an agent', () => {
    const agent: Agent = {
      id: 'a1',
      userId: 'u1',
      position: { x: 0, y: 0 },
      tier: 'opus',
      isPrimary: true,
      planets: [],
      createdAt: Date.now(),
    };
    useGameStore.getState().addAgent(agent);
    expect(useGameStore.getState().agents['a1']).toEqual(agent);
  });

  it('moves an agent', () => {
    const agent: Agent = {
      id: 'a1',
      userId: 'u1',
      position: { x: 0, y: 0 },
      tier: 'opus',
      isPrimary: true,
      planets: [],
      createdAt: Date.now(),
    };
    useGameStore.getState().addAgent(agent);
    useGameStore.getState().moveAgent('a1', { x: 50, y: 75 });
    expect(useGameStore.getState().agents['a1'].position).toEqual({ x: 50, y: 75 });
  });

  it('adds a haiku message', () => {
    const haiku: HaikuMessage = {
      id: 'h1',
      senderAgentId: 'a1',
      text: 'Test line one here\nSecond line is longer still\nThird line five again',
      syllables: [5, 7, 5],
      position: { x: 0, y: 0 },
      timestamp: Date.now(),
    };
    useGameStore.getState().addHaiku(haiku);
    expect(useGameStore.getState().haiku).toHaveLength(1);
  });

  it('sets the current user', () => {
    useGameStore.getState().setCurrentUser('u1', 'a1');
    expect(useGameStore.getState().currentUserId).toBe('u1');
    expect(useGameStore.getState().currentAgentId).toBe('a1');
  });

  it('updates camera position', () => {
    useGameStore.getState().setCamera({ x: 500, y: 300 }, 1.5);
    expect(useGameStore.getState().camera).toEqual({ position: { x: 500, y: 300 }, zoom: 1.5 });
  });
});
