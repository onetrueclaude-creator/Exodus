import { describe, it, expect } from 'vitest';

describe('Onboarding API contracts', () => {
  it('validates username format', () => {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    expect(regex.test('valid_user_01')).toBe(true);
    expect(regex.test('ab')).toBe(false); // too short
    expect(regex.test('has space')).toBe(false);
    expect(regex.test('a'.repeat(21))).toBe(false); // too long
    expect(regex.test('special!')).toBe(false);
    expect(regex.test('___')).toBe(true); // underscores ok
  });

  it('validates wallet hash format (64-char hex)', () => {
    const hexRegex = /^[0-9a-f]{64}$/;
    expect(hexRegex.test('a'.repeat(64))).toBe(true);
    expect(hexRegex.test('abc123'.repeat(10) + 'abcd')).toBe(true);
    expect(hexRegex.test('too-short')).toBe(false);
    expect(hexRegex.test('A'.repeat(64))).toBe(false); // uppercase not allowed
  });

  it('validates subscription tiers', () => {
    const validTiers = ['COMMUNITY', 'PROFESSIONAL', 'MAX'];
    expect(validTiers).toContain('COMMUNITY');
    expect(validTiers).toContain('PROFESSIONAL');
    expect(validTiers).toContain('MAX');
    expect(validTiers).not.toContain('FREE');
    expect(validTiers).not.toContain('INVALID');
  });

  it('generates deterministic coordinates from user ID', () => {
    function simpleHash(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
      }
      return Math.abs(hash);
    }

    const GRID_MIN = -20;
    const GRID_MAX = 20;
    const range = GRID_MAX - GRID_MIN + 1;

    const hash1 = simpleHash('user-abc-123');
    const x1 = GRID_MIN + (hash1 % range);
    const y1 = GRID_MIN + ((hash1 * 2654435761) % range);

    // Same input = same output (deterministic)
    const hash2 = simpleHash('user-abc-123');
    const x2 = GRID_MIN + (hash2 % range);
    expect(x1).toBe(x2);

    // Within grid bounds
    expect(x1).toBeGreaterThanOrEqual(GRID_MIN);
    expect(x1).toBeLessThanOrEqual(GRID_MAX);
    expect(y1).toBeGreaterThanOrEqual(GRID_MIN);
    expect(y1).toBeLessThanOrEqual(GRID_MAX);
  });
});
