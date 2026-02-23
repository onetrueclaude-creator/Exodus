export type ResearchCategory = 'security' | 'infrastructure' | 'social' | 'diplomacy';

export interface ResearchItem {
  id: string;
  category: ResearchCategory;
  name: string;
  description: string;
  tier: number;
  energyCost: number;
  prerequisiteIds: string[];
  effect: string;
}

export interface ResearchProgress {
  researchId: string;
  energyInvested: number;
  completed: boolean;
}
