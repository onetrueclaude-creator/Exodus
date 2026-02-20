import { describe, it, expect } from 'vitest';
import {
  RESEARCH_TREES,
  getAvailableResearch,
  calculateResearchProgress,
  type ResearchCategory,
} from '@/lib/research';

describe('Research trees', () => {
  it('has 4 categories', () => {
    const categories = Object.keys(RESEARCH_TREES);
    expect(categories).toEqual(['security', 'infrastructure', 'social', 'diplomacy']);
  });

  it('each category has at least one tier-1 research', () => {
    for (const [cat, items] of Object.entries(RESEARCH_TREES)) {
      const tier1 = items.filter(r => r.tier === 1);
      expect(tier1.length).toBeGreaterThan(0);
    }
  });
});

describe('getAvailableResearch', () => {
  it('returns tier 1 research when nothing is completed', () => {
    const available = getAvailableResearch('security', []);
    expect(available.every(r => r.tier === 1)).toBe(true);
  });
});

describe('calculateResearchProgress', () => {
  it('returns 0 for new research', () => {
    const progress = calculateResearchProgress(0, 100);
    expect(progress).toBe(0);
  });

  it('returns 100 when fully funded', () => {
    const progress = calculateResearchProgress(100, 100);
    expect(progress).toBe(100);
  });

  it('returns partial progress', () => {
    const progress = calculateResearchProgress(50, 100);
    expect(progress).toBe(50);
  });
});
