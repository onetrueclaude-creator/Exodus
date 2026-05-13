import type { NodeTier } from '@/lib/nodeTier';

export type SkillCategory = 'mining' | 'communication' | 'defense' | 'expansion';

export interface SkillItem {
  id: string;
  category: SkillCategory;
  name: string;
  description: string;
  tierRequired: NodeTier;
  prerequisiteResearchIds: string[];
  effect: string;
}
