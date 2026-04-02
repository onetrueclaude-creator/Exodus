import type { AgentTier } from '@/types';

export type SkillCategory = 'mining' | 'communication' | 'defense' | 'expansion';

export interface SkillItem {
  id: string;
  category: SkillCategory;
  name: string;
  description: string;
  tierRequired: AgentTier;
  prerequisiteResearchIds: string[];
  effect: string;
}
