import { describe, it, expect } from 'vitest';
import {
  SKILL_TREES,
  getAvailableSkills,
  getSkillsWithStatus,
  meetsRequiredTier,
  type SkillCategory,
} from '@/lib/skills';

describe('Skill trees', () => {
  it('has 4 categories', () => {
    const categories = Object.keys(SKILL_TREES);
    expect(categories).toEqual(['mining', 'communication', 'defense', 'expansion']);
  });

  it('each category has 3 skills (one per node tier)', () => {
    for (const [, items] of Object.entries(SKILL_TREES)) {
      expect(items).toHaveLength(3);
      const tiers = items.map((s) => s.tierRequired);
      expect(tiers).toContain('synapse');
      expect(tiers).toContain('cortex');
      expect(tiers).toContain('lattice');
    }
  });

  it('all skills have unique ids', () => {
    const allIds = Object.values(SKILL_TREES).flat().map((s) => s.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe('meetsRequiredTier', () => {
  it('synapse meets synapse', () => {
    expect(meetsRequiredTier('synapse', 'synapse')).toBe(true);
  });

  it('synapse does not meet cortex', () => {
    expect(meetsRequiredTier('synapse', 'cortex')).toBe(false);
  });

  it('lattice meets all tiers', () => {
    expect(meetsRequiredTier('lattice', 'synapse')).toBe(true);
    expect(meetsRequiredTier('lattice', 'cortex')).toBe(true);
    expect(meetsRequiredTier('lattice', 'lattice')).toBe(true);
  });

  it('cortex meets synapse and cortex but not lattice', () => {
    expect(meetsRequiredTier('cortex', 'synapse')).toBe(true);
    expect(meetsRequiredTier('cortex', 'cortex')).toBe(true);
    expect(meetsRequiredTier('cortex', 'lattice')).toBe(false);
  });
});

describe('getAvailableSkills', () => {
  it('returns only synapse skills for synapse agent with no research', () => {
    const available = getAvailableSkills('mining', 'synapse', []);
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('mine-1');
  });

  it('returns synapse + cortex skills for cortex agent with prereqs met', () => {
    const available = getAvailableSkills('mining', 'cortex', ['inf-1']);
    expect(available).toHaveLength(2);
    expect(available.map((s) => s.id)).toEqual(['mine-1', 'mine-2']);
  });

  it('returns all skills for lattice agent with all prereqs met', () => {
    const available = getAvailableSkills('mining', 'lattice', ['inf-1', 'inf-2']);
    expect(available).toHaveLength(3);
  });

  it('blocks skills when research prereqs are missing', () => {
    const available = getAvailableSkills('mining', 'lattice', []);
    // Only mine-1 (no prereqs) should be available
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('mine-1');
  });
});

describe('getSkillsWithStatus', () => {
  it('marks unlocked skills correctly', () => {
    const skills = getSkillsWithStatus('mining', 'lattice', ['inf-1', 'inf-2'], ['mine-1']);
    const mine1 = skills.find((s) => s.id === 'mine-1')!;
    expect(mine1.unlocked).toBe(true);
    expect(mine1.available).toBe(true);

    const mine2 = skills.find((s) => s.id === 'mine-2')!;
    expect(mine2.unlocked).toBe(false);
    expect(mine2.available).toBe(true);
  });

  it('marks unavailable skills when tier too low', () => {
    const skills = getSkillsWithStatus('mining', 'synapse', [], []);
    const mine2 = skills.find((s) => s.id === 'mine-2')!;
    expect(mine2.available).toBe(false);
    expect(mine2.unlocked).toBe(false);
  });

  it('returns all skills in category regardless of availability', () => {
    const skills = getSkillsWithStatus('defense', 'synapse', [], []);
    expect(skills).toHaveLength(3);
  });
});
