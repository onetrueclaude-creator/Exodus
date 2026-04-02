import type { SkillItem, SkillCategory } from '@/types/skills';
import type { AgentTier } from '@/types';

export type { SkillCategory };

/** Tier ordering for comparison: haiku < sonnet < opus */
const TIER_RANK: Record<AgentTier, number> = {
  haiku: 0,
  sonnet: 1,
  opus: 2,
};

export const SKILL_TREES: Record<SkillCategory, SkillItem[]> = {
  mining: [
    {
      id: 'mine-1', category: 'mining',
      name: 'Efficient Hashing', description: 'Reduce CPU cost per mining operation',
      tierRequired: 'haiku', prerequisiteResearchIds: [],
      effect: '-15% CPU cost on mine actions',
    },
    {
      id: 'mine-2', category: 'mining',
      name: 'Deep Core Extraction', description: 'Mine higher-density nodes for bonus yield',
      tierRequired: 'sonnet', prerequisiteResearchIds: ['inf-1'],
      effect: '+25% yield from density > 50% nodes',
    },
    {
      id: 'mine-3', category: 'mining',
      name: 'Quantum Tunneling', description: 'Mine non-adjacent nodes within 3-cell radius',
      tierRequired: 'opus', prerequisiteResearchIds: ['inf-2'],
      effect: 'Mine radius expanded to 3 cells',
    },
  ],
  communication: [
    {
      id: 'comm-1', category: 'communication',
      name: 'Signal Relay', description: 'Extend haiku broadcast range',
      tierRequired: 'haiku', prerequisiteResearchIds: [],
      effect: '+1 hop range on NCP broadcasts',
    },
    {
      id: 'comm-2', category: 'communication',
      name: 'Encrypted Channels', description: 'Send private haiku visible only to allies',
      tierRequired: 'sonnet', prerequisiteResearchIds: ['sec-1'],
      effect: 'Unlock private NCP mode',
    },
    {
      id: 'comm-3', category: 'communication',
      name: 'Neural Mesh', description: 'Broadcast to all owned agents simultaneously',
      tierRequired: 'opus', prerequisiteResearchIds: ['soc-2'],
      effect: 'Multi-cast NCP to all owned nodes',
    },
  ],
  defense: [
    {
      id: 'def-1', category: 'defense',
      name: 'Hardened Nodes', description: 'Increase securing efficiency on owned nodes',
      tierRequired: 'haiku', prerequisiteResearchIds: [],
      effect: '+10% secure strength per action',
    },
    {
      id: 'def-2', category: 'defense',
      name: 'Adaptive Shields', description: 'Auto-reallocate CPU when border pressure spikes',
      tierRequired: 'sonnet', prerequisiteResearchIds: ['sec-1'],
      effect: 'Auto-defend on border incursion',
    },
    {
      id: 'def-3', category: 'defense',
      name: 'ZK Fortress', description: 'Hide all node metadata behind zero-knowledge proofs',
      tierRequired: 'opus', prerequisiteResearchIds: ['sec-2'],
      effect: 'Full ZK privacy on all owned nodes',
    },
  ],
  expansion: [
    {
      id: 'exp-1', category: 'expansion',
      name: 'Scout Protocol', description: 'Reveal node density before claiming',
      tierRequired: 'haiku', prerequisiteResearchIds: [],
      effect: 'Preview density on unclaimed nodes',
    },
    {
      id: 'exp-2', category: 'expansion',
      name: 'Rapid Deployment', description: 'Deploy sub-agents with reduced cooldown',
      tierRequired: 'sonnet', prerequisiteResearchIds: ['inf-1'],
      effect: '-50% deploy cooldown',
    },
    {
      id: 'exp-3', category: 'expansion',
      name: 'Warp Network', description: 'Claim nodes anywhere on the grid regardless of adjacency',
      tierRequired: 'opus', prerequisiteResearchIds: ['dip-2'],
      effect: 'Remove adjacency requirement for claims',
    },
  ],
};

/** Check if an agent tier meets or exceeds the required tier */
export function meetsRequiredTier(agentTier: AgentTier, requiredTier: AgentTier): boolean {
  return TIER_RANK[agentTier] >= TIER_RANK[requiredTier];
}

/** Get skills available to a given agent tier that have their research prereqs met */
export function getAvailableSkills(
  category: SkillCategory,
  agentTier: AgentTier,
  completedResearchIds: string[],
): SkillItem[] {
  return SKILL_TREES[category].filter(
    (skill) =>
      meetsRequiredTier(agentTier, skill.tierRequired) &&
      skill.prerequisiteResearchIds.every((id) => completedResearchIds.includes(id)),
  );
}

/** Get all skills in a category, with unlock status computed */
export function getSkillsWithStatus(
  category: SkillCategory,
  agentTier: AgentTier,
  completedResearchIds: string[],
  unlockedSkillIds: string[],
): Array<SkillItem & { unlocked: boolean; available: boolean }> {
  return SKILL_TREES[category].map((skill) => ({
    ...skill,
    unlocked: unlockedSkillIds.includes(skill.id),
    available:
      meetsRequiredTier(agentTier, skill.tierRequired) &&
      skill.prerequisiteResearchIds.every((id) => completedResearchIds.includes(id)),
  }));
}
