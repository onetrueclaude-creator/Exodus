import { describe, it, expect } from 'vitest';
import { getDistance, getConnectionStrength, getVisibleAgents } from '@/lib/proximity';
import type { Agent } from '@/types';

describe('getDistance', () => {
  it('calculates euclidean distance', () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('returns 0 for same position', () => {
    expect(getDistance({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0);
  });
});

describe('getConnectionStrength', () => {
  it('returns 1.0 for overlapping agents', () => {
    expect(getConnectionStrength(0, 300)).toBe(1);
  });

  it('returns 0 beyond threshold', () => {
    expect(getConnectionStrength(500, 300)).toBe(0);
  });

  it('returns fractional for in-between', () => {
    const strength = getConnectionStrength(150, 300);
    expect(strength).toBeGreaterThan(0);
    expect(strength).toBeLessThan(1);
  });
});

describe('getVisibleAgents', () => {
  it('filters agents by fog radius', () => {
    const viewer: Agent = {
      id: 'v', userId: 'u', position: { x: 0, y: 0 },
      tier: 'opus', isPrimary: true, planets: [], createdAt: 0, borderRadius: 130, borderPressure: 0, cpuPerTurn: 8, miningRate: 12, energyLimit: 40, stakedCpu: 0,
    };
    const near: Agent = {
      id: 'n', userId: 'u2', position: { x: 50, y: 50 },
      tier: 'haiku', isPrimary: true, planets: [], createdAt: 0, borderRadius: 60, borderPressure: 0, cpuPerTurn: 1, miningRate: 2, energyLimit: 5, stakedCpu: 0,
    };
    const far: Agent = {
      id: 'f', userId: 'u3', position: { x: 9000, y: 9000 },
      tier: 'haiku', isPrimary: true, planets: [], createdAt: 0, borderRadius: 60, borderPressure: 0, cpuPerTurn: 1, miningRate: 2, energyLimit: 5, stakedCpu: 0,
    };
    const visible = getVisibleAgents(viewer, [near, far]);
    expect(visible.some(v => v.agent.id === 'n')).toBe(true);
    expect(visible.some(v => v.agent.id === 'f')).toBe(false);
  });
});
