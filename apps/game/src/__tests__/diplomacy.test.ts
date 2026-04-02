import { describe, it, expect } from 'vitest';
import {
  getClarityLevel,
  getOpinionChange,
  getAttitude,
} from '@/lib/diplomacy';

describe('getClarityLevel', () => {
  it('returns 0 for no exchanges', () => {
    expect(getClarityLevel(0)).toBe(0);
  });

  it('returns 1 for 1-3 exchanges', () => {
    expect(getClarityLevel(2)).toBe(1);
  });

  it('returns 2 for 5-10 exchanges', () => {
    expect(getClarityLevel(7)).toBe(2);
  });

  it('returns 3 for 15+ exchanges', () => {
    expect(getClarityLevel(15)).toBe(3);
  });

  it('returns 4 for sustained relationship (30+)', () => {
    expect(getClarityLevel(30)).toBe(4);
  });
});

describe('getAttitude', () => {
  it('returns hostile for very negative opinion', () => {
    expect(getAttitude(-150)).toBe('hostile');
  });

  it('returns neutral for zero opinion', () => {
    expect(getAttitude(0)).toBe('neutral');
  });

  it('returns friendly for positive opinion', () => {
    expect(getAttitude(75)).toBe('friendly');
  });

  it('returns allied for high opinion', () => {
    expect(getAttitude(120)).toBe('allied');
  });
});

describe('getOpinionChange', () => {
  it('returns positive change for haiku exchange', () => {
    expect(getOpinionChange('haiku_exchange')).toBeGreaterThan(0);
  });

  it('returns positive change for proximity', () => {
    expect(getOpinionChange('proximity_tick')).toBeGreaterThan(0);
  });
});
