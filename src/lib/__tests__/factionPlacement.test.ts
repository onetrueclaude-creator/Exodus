import { describe, it, expect } from 'vitest';
import {
  computeFactionSpawnPoint,
  FACTION_ARM_ORIGINS,
  FACTION_ARM_STEPS,
  NODE_GRID_SPACING,
  type Faction,
} from '@/lib/factionPlacement';
import type { Agent } from '@/types/agent';

/** Helper to create a minimal agent at a given position */
function agentAt(x: number, y: number, userId = 'user-1'): Agent {
  return {
    id: `agent-${x}-${y}`,
    userId,
    position: { x, y },
    tier: 'sonnet',
    isPrimary: false,
    planets: [],
    createdAt: Date.now(),
    borderRadius: 90,
    borderPressure: 0,
    cpuPerTurn: 3,
    miningRate: 5,
    energyLimit: 100,
    stakedCpu: 0,
  };
}

describe('computeFactionSpawnPoint', () => {
  describe('faction arm directions', () => {
    it('returns origin (0,10) for community faction when no agents exist', () => {
      const pos = computeFactionSpawnPoint('community', []);
      expect(pos).toEqual({ x: 0, y: 10 });
    });

    it('returns origin (10,0) for machines faction when no agents exist', () => {
      const pos = computeFactionSpawnPoint('machines', []);
      expect(pos).toEqual({ x: 10, y: 0 });
    });

    it('returns origin (0,-10) for founders faction when no agents exist', () => {
      const pos = computeFactionSpawnPoint('founders', []);
      expect(pos).toEqual({ x: 0, y: -10 });
    });

    it('returns origin (-10,0) for professional faction when no agents exist', () => {
      const pos = computeFactionSpawnPoint('professional', []);
      expect(pos).toEqual({ x: -10, y: 0 });
    });
  });

  describe('skipping claimed slots', () => {
    it('skips the origin when an agent with userId occupies it', () => {
      const agents = [agentAt(0, 10)];
      const pos = computeFactionSpawnPoint('community', agents);
      // Community arm goes north: (0,10) claimed → next is (0,20)
      expect(pos).toEqual({ x: 0, y: 20 });
    });

    it('skips multiple consecutive claimed slots', () => {
      const agents = [
        agentAt(0, 10),
        agentAt(0, 20),
        agentAt(0, 30),
      ];
      const pos = computeFactionSpawnPoint('community', agents);
      expect(pos).toEqual({ x: 0, y: 40 });
    });

    it('skips claimed slots on the machines (east) arm', () => {
      const agents = [agentAt(10, 0), agentAt(20, 0)];
      const pos = computeFactionSpawnPoint('machines', agents);
      expect(pos).toEqual({ x: 30, y: 0 });
    });

    it('skips claimed slots on the founders (south) arm', () => {
      const agents = [agentAt(0, -10)];
      const pos = computeFactionSpawnPoint('founders', agents);
      expect(pos).toEqual({ x: 0, y: -20 });
    });

    it('skips claimed slots on the professional (west) arm', () => {
      const agents = [agentAt(-10, 0), agentAt(-20, 0), agentAt(-30, 0)];
      const pos = computeFactionSpawnPoint('professional', agents);
      expect(pos).toEqual({ x: -40, y: 0 });
    });
  });

  describe('ignores agents without userId', () => {
    it('treats agents with empty userId as unclaimed', () => {
      const agents = [agentAt(0, 10, '')];
      const pos = computeFactionSpawnPoint('community', agents);
      // Empty userId means the slot is unclaimed
      expect(pos).toEqual({ x: 0, y: 10 });
    });
  });

  describe('walking far outward', () => {
    it('can find a slot 10 positions out on the arm', () => {
      const agents: Agent[] = [];
      for (let i = 1; i <= 10; i++) {
        agents.push(agentAt(0, i * 10));
      }
      const pos = computeFactionSpawnPoint('community', agents);
      expect(pos).toEqual({ x: 0, y: 110 });
    });
  });

  describe('only considers agents on the arm path', () => {
    it('ignores agents at off-arm positions', () => {
      // These agents are not on the community arm (0, y)
      const agents = [agentAt(10, 10), agentAt(5, 15)];
      const pos = computeFactionSpawnPoint('community', agents);
      // Origin should still be available
      expect(pos).toEqual({ x: 0, y: 10 });
    });
  });

  describe('constants', () => {
    it('exports NODE_GRID_SPACING as 10', () => {
      expect(NODE_GRID_SPACING).toBe(10);
    });

    it('exports correct faction arm origins', () => {
      expect(FACTION_ARM_ORIGINS.community).toEqual({ x: 0, y: 10 });
      expect(FACTION_ARM_ORIGINS.machines).toEqual({ x: 10, y: 0 });
      expect(FACTION_ARM_ORIGINS.founders).toEqual({ x: 0, y: -10 });
      expect(FACTION_ARM_ORIGINS.professional).toEqual({ x: -10, y: 0 });
    });

    it('exports correct faction arm steps', () => {
      expect(FACTION_ARM_STEPS.community).toEqual({ x: 0, y: 10 });
      expect(FACTION_ARM_STEPS.machines).toEqual({ x: 10, y: 0 });
      expect(FACTION_ARM_STEPS.founders).toEqual({ x: 0, y: -10 });
      expect(FACTION_ARM_STEPS.professional).toEqual({ x: -10, y: 0 });
    });
  });
});
