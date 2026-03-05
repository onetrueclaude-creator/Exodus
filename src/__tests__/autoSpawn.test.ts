import { describe, it, expect } from 'vitest';
import { computeFactionSpawnPoint } from '@/lib/factionPlacement';
import { computeSpawnSequence } from '@/lib/spawnAnimation';
import type { Agent } from '@/types';

function makeAgent(id: string, x: number, y: number, userId = ''): Agent {
  return {
    id,
    position: { x, y },
    tier: 'sonnet',
    userId,
    username: undefined,
    density: 50,
    storageSlots: 4,
    isPrimary: false,
    planets: [],
    createdAt: Date.now(),
    borderRadius: 90,
    borderPressure: 0,
    cpuPerTurn: 3,
    miningRate: 1,
    energyLimit: 100,
    stakedCpu: 0,
    cpuDistribution: { secure: 25, develop: 25, research: 25, storage: 25 },
  } as Agent;
}

describe('Full auto-spawn flow', () => {
  it('computes spawn point then animation sequence', () => {
    const agents: Agent[] = [
      makeAgent('fm-s', 0, -10, 'faction-master'),
    ];
    const spawnCoord = computeFactionSpawnPoint('founders', agents);
    expect(spawnCoord).toEqual({ x: 0, y: -20 });
    const seq = computeSpawnSequence(spawnCoord, { x: 0, y: 0 }, 0.5, 2.0);
    expect(seq.phases).toHaveLength(3);
    expect(seq.spawnCoord).toEqual(spawnCoord);
  });

  it('handles Machines faction spawn', () => {
    const agents: Agent[] = [
      makeAgent('fm-e', 10, 0, 'faction-master'),
    ];
    const spawnCoord = computeFactionSpawnPoint('machines', agents);
    expect(spawnCoord).toEqual({ x: 20, y: 0 });
  });
});
