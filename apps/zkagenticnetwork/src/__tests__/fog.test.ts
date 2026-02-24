import { describe, it, expect } from 'vitest';
import { getFogLevel, getFogRadius } from '@/lib/fog';
import type { AgentTier } from '@/types';

describe('getFogRadius', () => {
  it('returns wider radius for opus', () => {
    expect(getFogRadius('opus')).toBeGreaterThan(getFogRadius('sonnet'));
    expect(getFogRadius('sonnet')).toBeGreaterThan(getFogRadius('haiku'));
  });
});

describe('getFogLevel', () => {
  it('returns clear for nearby agents', () => {
    expect(getFogLevel(50, 'opus')).toBe('clear');
  });

  it('returns hazy for medium distance', () => {
    const radius = getFogRadius('opus');
    expect(getFogLevel(radius * 0.7, 'opus')).toBe('hazy');
  });

  it('returns fogged for far agents', () => {
    const radius = getFogRadius('opus');
    expect(getFogLevel(radius * 0.95, 'opus')).toBe('fogged');
  });

  it('returns hidden for agents beyond radius', () => {
    const radius = getFogRadius('opus');
    expect(getFogLevel(radius + 100, 'opus')).toBe('hidden');
  });
});
