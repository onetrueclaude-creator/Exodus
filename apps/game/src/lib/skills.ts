import type { SkillItem, SkillCategory } from '@/types/skills';
import { getNodeTier, type NodeTier } from '@/lib/nodeTier';

export type { SkillCategory };

/** Tier ordering for comparison: synapse < cortex < lattice < nexus */
const TIER_RANK: Record<NodeTier, number> = {
  synapse: 0,
  cortex: 1,
  lattice: 2,
  nexus: 3,
};

export const SKILL_TREES: Record<SkillCategory, SkillItem[]> = {
  mining: [
    {
      id: 'mine-1', category: 'mining',
      name: 'Efficient Hashing', description: 'Reduce CPU cost per mining operation',
      tierRequired: 'synapse', prerequisiteResearchIds: [],
      effect: '-15% CPU cost on mine actions',
    },
    {
      id: 'mine-2', category: 'mining',
      name: 'Deep Core Extraction', description: 'Mine higher-density nodes for bonus yield',
      tierRequired: 'cortex', prerequisiteResearchIds: ['inf-1'],
      effect: '+25% yield from density > 50% nodes',
    },
    {
      id: 'mine-3', category: 'mining',
      name: 'Quantum Tunneling', description: 'Mine non-adjacent nodes within 3-cell radius',
      tierRequired: 'lattice', prerequisiteResearchIds: ['inf-2'],
      effect: 'Mine radius expanded to 3 cells',
    },
  ],
  communication: [
    {
      id: 'comm-1', category: 'communication',
      name: 'Signal Relay', description: 'Extend haiku broadcast range',
      tierRequired: 'synapse', prerequisiteResearchIds: [],
      effect: '+1 hop range on NCP broadcasts',
    },
    {
      id: 'comm-2', category: 'communication',
      name: 'Encrypted Channels', description: 'Send private haiku visible only to allies',
      tierRequired: 'cortex', prerequisiteResearchIds: ['sec-1'],
      effect: 'Unlock private NCP mode',
    },
    {
      id: 'comm-3', category: 'communication',
      name: 'Neural Mesh', description: 'Broadcast to all owned agents simultaneously',
      tierRequired: 'lattice', prerequisiteResearchIds: ['soc-2'],
      effect: 'Multi-cast NCP to all owned nodes',
    },
  ],
  defense: [
    {
      id: 'def-1', category: 'defense',
      name: 'Hardened Nodes', description: 'Increase securing efficiency on owned nodes',
      tierRequired: 'synapse', prerequisiteResearchIds: [],
      effect: '+10% secure strength per action',
    },
    {
      id: 'def-2', category: 'defense',
      name: 'Adaptive Shields', description: 'Auto-reallocate CPU when border pressure spikes',
      tierRequired: 'cortex', prerequisiteResearchIds: ['sec-1'],
      effect: 'Auto-defend on border incursion',
    },
    {
      id: 'def-3', category: 'defense',
      name: 'ZK Fortress', description: 'Hide all node metadata behind zero-knowledge proofs',
      tierRequired: 'lattice', prerequisiteResearchIds: ['sec-2'],
      effect: 'Full ZK privacy on all owned nodes',
    },
  ],
  expansion: [
    {
      id: 'exp-1', category: 'expansion',
      name: 'Scout Protocol', description: 'Reveal node density before claiming',
      tierRequired: 'synapse', prerequisiteResearchIds: [],
      effect: 'Preview density on unclaimed nodes',
    },
    {
      id: 'exp-2', category: 'expansion',
      name: 'Rapid Deployment', description: 'Deploy sub-agents with reduced cooldown',
      tierRequired: 'cortex', prerequisiteResearchIds: ['inf-1'],
      effect: '-50% deploy cooldown',
    },
    {
      id: 'exp-3', category: 'expansion',
      name: 'Warp Network', description: 'Claim nodes anywhere on the grid regardless of adjacency',
      tierRequired: 'lattice', prerequisiteResearchIds: ['dip-2'],
      effect: 'Remove adjacency requirement for claims',
    },
  ],
};

/** Check if a node tier meets or exceeds the required tier */
export function meetsRequiredTier(agentTier: NodeTier, requiredTier: NodeTier): boolean {
  return TIER_RANK[agentTier] >= TIER_RANK[requiredTier];
}

/** Get skills available to a given node tier that have their research prereqs met */
export function getAvailableSkills(
  category: SkillCategory,
  agentTier: NodeTier,
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
  agentTier: NodeTier,
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

// Re-export for callers that derive tier from level
export { getNodeTier };
