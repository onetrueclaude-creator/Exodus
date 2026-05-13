import type { FogLevel } from '@/types';
import { getNodeTier, type NodeTier } from '@/lib/nodeTier';

const FOG_RADII: Record<NodeTier, number> = {
  nexus: 800,
  lattice: 600,
  cortex: 400,
  synapse: 250,
};

export function getFogRadius(level: number): number {
  return FOG_RADII[getNodeTier(level)];
}

export function getFogLevel(distance: number, viewerLevel: number): FogLevel {
  const radius = getFogRadius(viewerLevel);
  const ratio = distance / radius;

  if (ratio <= 0.4) return 'clear';
  if (ratio <= 0.7) return 'hazy';
  if (ratio <= 1.0) return 'fogged';
  return 'hidden';
}
