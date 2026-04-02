import type { ResearchItem, ResearchCategory } from '@/types/research';

export type { ResearchCategory };

export const RESEARCH_TREES: Record<ResearchCategory, ResearchItem[]> = {
  security: [
    {
      id: 'sec-1', category: 'security', tier: 1,
      name: 'Basic Encryption', description: 'Enable Zero-Knowledge privacy on data packets',
      energyCost: 50, prerequisiteIds: [],
      effect: 'Unlock ZK data packet toggle',
    },
    {
      id: 'sec-2', category: 'security', tier: 2,
      name: 'Border Shields', description: 'Hide network borders from distant agents',
      energyCost: 120, prerequisiteIds: ['sec-1'],
      effect: 'Network borders invisible beyond signal range',
    },
  ],
  infrastructure: [
    {
      id: 'inf-1', category: 'infrastructure', tier: 1,
      name: 'Expanded Storage', description: 'Increase data packet capacity per neural node',
      energyCost: 40, prerequisiteIds: [],
      effect: '+2 data packet slots per node',
    },
    {
      id: 'inf-2', category: 'infrastructure', tier: 2,
      name: 'Efficient Agents', description: 'Reduce cost to spawn sub-agents',
      energyCost: 100, prerequisiteIds: ['inf-1'],
      effect: '-25% AGNTC for sub-agent spawning',
    },
  ],
  social: [
    {
      id: 'soc-1', category: 'social', tier: 1,
      name: 'Signal Boost', description: 'Extend your fog of war visibility radius',
      energyCost: 60, prerequisiteIds: [],
      effect: '+20% fog radius',
    },
    {
      id: 'soc-2', category: 'social', tier: 2,
      name: 'Content Amplification', description: 'Your haiku visible from further away',
      energyCost: 110, prerequisiteIds: ['soc-1'],
      effect: 'Haiku reach doubled',
    },
  ],
  diplomacy: [
    {
      id: 'dip-1', category: 'diplomacy', tier: 1,
      name: 'Trust Protocols', description: 'Build network trust with other agents faster',
      energyCost: 45, prerequisiteIds: [],
      effect: '2x trust gain per packet exchange',
    },
    {
      id: 'dip-2', category: 'diplomacy', tier: 2,
      name: 'Relay Training', description: 'Deploy relays to improve connections passively',
      energyCost: 130, prerequisiteIds: ['dip-1'],
      effect: 'Unlock relay assignments',
    },
  ],
};

export function getAvailableResearch(
  category: ResearchCategory,
  completedIds: string[],
): ResearchItem[] {
  return RESEARCH_TREES[category].filter(
    (item) =>
      !completedIds.includes(item.id) &&
      item.prerequisiteIds.every((id) => completedIds.includes(id)),
  );
}

export function calculateResearchProgress(invested: number, cost: number): number {
  return Math.min(100, Math.round((invested / cost) * 100));
}
