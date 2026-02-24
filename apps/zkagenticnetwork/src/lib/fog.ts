import type { AgentTier, FogLevel } from '@/types';

const FOG_RADII: Record<AgentTier, number> = {
  opus: 600,
  sonnet: 400,
  haiku: 250,
};

export function getFogRadius(tier: AgentTier): number {
  return FOG_RADII[tier];
}

export function getFogLevel(distance: number, viewerTier: AgentTier): FogLevel {
  const radius = getFogRadius(viewerTier);
  const ratio = distance / radius;

  if (ratio <= 0.4) return 'clear';
  if (ratio <= 0.7) return 'hazy';
  if (ratio <= 1.0) return 'fogged';
  return 'hidden';
}
