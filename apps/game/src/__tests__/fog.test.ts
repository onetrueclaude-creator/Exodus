import { describe, it, expect } from 'vitest';
import { getFogLevel, getFogRadius } from '@/lib/fog';

describe('getFogRadius', () => {
  it('returns wider radius for lattice (L7) than cortex (L4) than synapse (L1)', () => {
    expect(getFogRadius(7)).toBeGreaterThan(getFogRadius(4));
    expect(getFogRadius(4)).toBeGreaterThan(getFogRadius(1));
  });
});

describe('getFogLevel', () => {
  it('returns clear for nearby agents', () => {
    expect(getFogLevel(50, 7)).toBe('clear');
  });

  it('returns hazy for medium distance', () => {
    const radius = getFogRadius(7);
    expect(getFogLevel(radius * 0.7, 7)).toBe('hazy');
  });

  it('returns fogged for far agents', () => {
    const radius = getFogRadius(7);
    expect(getFogLevel(radius * 0.95, 7)).toBe('fogged');
  });

  it('returns hidden for agents beyond radius', () => {
    const radius = getFogRadius(7);
    expect(getFogLevel(radius + 100, 7)).toBe('hidden');
  });
});
