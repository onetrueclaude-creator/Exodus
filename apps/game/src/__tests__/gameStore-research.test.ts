import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

describe('GameStore research state', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts with empty research progress and completed lists', () => {
    const { researchProgress, completedResearch } = useGameStore.getState();
    expect(researchProgress).toEqual({});
    expect(completedResearch).toEqual([]);
  });

  it('allocates energy to a research item', () => {
    useGameStore.setState({ energy: 100 });
    useGameStore.getState().allocateResearchEnergy('sec-1', 10);

    const { researchProgress, energy } = useGameStore.getState();
    expect(researchProgress['sec-1']).toEqual({
      researchId: 'sec-1',
      energyInvested: 10,
      completed: false,
    });
    expect(energy).toBe(90);
  });

  it('accumulates energy across multiple allocations', () => {
    useGameStore.setState({ energy: 100 });
    useGameStore.getState().allocateResearchEnergy('sec-1', 10);
    useGameStore.getState().allocateResearchEnergy('sec-1', 10);

    const { researchProgress } = useGameStore.getState();
    expect(researchProgress['sec-1'].energyInvested).toBe(20);
  });

  it('completes research when energy meets cost', () => {
    useGameStore.setState({ energy: 100 });
    useGameStore.getState().allocateResearchEnergy('sec-1', 50); // sec-1 costs 50

    const { researchProgress, completedResearch } = useGameStore.getState();
    expect(researchProgress['sec-1'].completed).toBe(true);
    expect(completedResearch).toContain('sec-1');
  });

  it('refuses allocation when not enough energy', () => {
    useGameStore.setState({ energy: 5 });
    const result = useGameStore.getState().allocateResearchEnergy('sec-1', 10);

    expect(result).toBe(false);
    expect(useGameStore.getState().energy).toBe(5);
    expect(useGameStore.getState().researchProgress).toEqual({});
  });

  it('does not over-invest beyond research cost', () => {
    useGameStore.setState({ energy: 200 });
    useGameStore.getState().allocateResearchEnergy('sec-1', 30);
    useGameStore.getState().allocateResearchEnergy('sec-1', 30); // total 60, but cost is 50

    const { researchProgress, energy } = useGameStore.getState();
    // Should cap at 50 (the cost), refunding 10
    expect(researchProgress['sec-1'].energyInvested).toBe(50);
    expect(researchProgress['sec-1'].completed).toBe(true);
    expect(energy).toBe(150); // 200 - 50 = 150
  });
});

describe('GameStore skills state', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts with empty unlocked skills', () => {
    expect(useGameStore.getState().unlockedSkills).toEqual([]);
  });

  it('unlocks a skill', () => {
    useGameStore.getState().unlockSkill('mine-1');
    expect(useGameStore.getState().unlockedSkills).toContain('mine-1');
  });

  it('does not duplicate unlocked skills', () => {
    useGameStore.getState().unlockSkill('mine-1');
    useGameStore.getState().unlockSkill('mine-1');
    expect(useGameStore.getState().unlockedSkills.filter((id) => id === 'mine-1')).toHaveLength(1);
  });
});
