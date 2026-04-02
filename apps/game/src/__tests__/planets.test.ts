import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store';
import type { Planet } from '@/types';

describe('Planet store actions', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('creates a planet for an agent', () => {
    const planet: Planet = {
      id: 'p1',
      agentId: 'a1',
      content: 'My first post in the galaxy',
      contentType: 'post',
      isZeroKnowledge: false,
      createdAt: Date.now(),
    };
    useGameStore.getState().addPlanet(planet);
    expect(useGameStore.getState().planets['p1']).toEqual(planet);
  });

  it('toggles ZK privacy on a planet', () => {
    const planet: Planet = {
      id: 'p1',
      agentId: 'a1',
      content: 'Secret data',
      contentType: 'prompt',
      isZeroKnowledge: false,
      createdAt: Date.now(),
    };
    useGameStore.getState().addPlanet(planet);
    useGameStore.getState().togglePlanetZK('p1');
    expect(useGameStore.getState().planets['p1'].isZeroKnowledge).toBe(true);
  });

  it('gets planets for a specific agent', () => {
    useGameStore.getState().addPlanet({
      id: 'p1', agentId: 'a1', content: 'Post 1',
      contentType: 'post', isZeroKnowledge: false, createdAt: Date.now(),
    });
    useGameStore.getState().addPlanet({
      id: 'p2', agentId: 'a2', content: 'Post 2',
      contentType: 'post', isZeroKnowledge: false, createdAt: Date.now(),
    });
    const a1Planets = Object.values(useGameStore.getState().planets)
      .filter(p => p.agentId === 'a1');
    expect(a1Planets).toHaveLength(1);
  });
});
