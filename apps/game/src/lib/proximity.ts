import type { Agent, FogLevel, GridPosition } from '@/types';
import { getFogRadius, getFogLevel } from './fog';

export function getDistance(a: GridPosition, b: GridPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getConnectionStrength(distance: number, threshold: number): number {
  if (distance >= threshold) return 0;
  if (distance <= 0) return 1;
  return 1 - distance / threshold;
}

const CONNECTION_THRESHOLD = 300;

export interface VisibleAgent {
  agent: Agent;
  distance: number;
  fogLevel: FogLevel;
  connectionStrength: number;
}

export function getVisibleAgents(viewer: Agent, agents: Agent[]): VisibleAgent[] {
  const radius = getFogRadius(viewer.tier);

  return agents
    .filter(a => a.id !== viewer.id)
    .map(agent => {
      const distance = getDistance(viewer.position, agent.position);
      return {
        agent,
        distance,
        fogLevel: getFogLevel(distance, viewer.tier),
        connectionStrength: getConnectionStrength(distance, CONNECTION_THRESHOLD),
      };
    })
    .filter(v => v.fogLevel !== 'hidden');
}
