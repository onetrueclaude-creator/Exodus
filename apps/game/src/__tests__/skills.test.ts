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

  it('each category has 3 skills (one per tier)', () => {
    for (const [, items] of Object.entries(SKILL_TREES)) {
      expect(items).toHaveLength(3);
      const tiers = items.map((s) => s.tierRequired);
      expect(tiers).toContain('haiku');
      expect(tiers).toContain('sonnet');
      expect(tiers).toContain('opus');
    }
  });

  it('all skills have unique ids', () => {
    const allIds = Object.values(SKILL_TREES).flat().map((s) => s.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe('meetsRequiredTier', () => {
  it('haiku meets haiku', () => {
    expect(meetsRequiredTier('haiku', 'haiku')).toBe(true);
  });

  it('haiku does not meet sonnet', () => {
    expect(meetsRequiredTier('haiku', 'sonnet')).toBe(false);
  });

  it('opus meets all tiers', () => {
    expect(meetsRequiredTier('opus', 'haiku')).toBe(true);
    expect(meetsRequiredTier('opus', 'sonnet')).toBe(true);
    expect(meetsRequiredTier('opus', 'opus')).toBe(true);
  });

  it('sonnet meets haiku and sonnet but not opus', () => {
    expect(meetsRequiredTier('sonnet', 'haiku')).toBe(true);
    expect(meetsRequiredTier('sonnet', 'sonnet')).toBe(true);
    expect(meetsRequiredTier('sonnet', 'opus')).toBe(false);
  });
});

describe('getAvailableSkills', () => {
  it('returns only haiku skills for haiku agent with no research', () => {
    const available = getAvailableSkills('mining', 'haiku', []);
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('mine-1');
  });

  it('returns haiku + sonnet skills for sonnet agent with prereqs met', () => {
    const available = getAvailableSkills('mining', 'sonnet', ['inf-1']);
    expect(available).toHaveLength(2);
    expect(available.map((s) => s.id)).toEqual(['mine-1', 'mine-2']);
  });

  it('returns all skills for opus agent with all prereqs met', () => {
    const available = getAvailableSkills('mining', 'opus', ['inf-1', 'inf-2']);
    expect(available).toHaveLength(3);
  });

  it('blocks skills when research prereqs are missing', () => {
    const available = getAvailableSkills('mining', 'opus', []);
    // Only mine-1 (no prereqs) should be available
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('mine-1');
  });
});

describe('getSkillsWithStatus', () => {
  it('marks unlocked skills correctly', () => {
    const skills = getSkillsWithStatus('mining', 'opus', ['inf-1', 'inf-2'], ['mine-1']);
    const mine1 = skills.find((s) => s.id === 'mine-1')!;
    expect(mine1.unlocked).toBe(true);
    expect(mine1.available).toBe(true);

    const mine2 = skills.find((s) => s.id === 'mine-2')!;
    expect(mine2.unlocked).toBe(false);
    expect(mine2.available).toBe(true);
  });

  it('marks unavailable skills when tier too low', () => {
    const skills = getSkillsWithStatus('mining', 'haiku', [], []);
    const mine2 = skills.find((s) => s.id === 'mine-2')!;
    expect(mine2.available).toBe(false);
    expect(mine2.unlocked).toBe(false);
  });

  it('returns all skills in category regardless of availability', () => {
    const skills = getSkillsWithStatus('defense', 'haiku', [], []);
    expect(skills).toHaveLength(3);
  });
});
