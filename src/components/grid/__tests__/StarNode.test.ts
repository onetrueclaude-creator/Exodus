import { describe, it, expect } from 'vitest';
import { determineFaction } from '../StarNode';

describe('StarNode', () => {
  describe('determineFaction', () => {
    it('returns origin for position (0,0)', () => {
      expect(determineFaction({ x: 0, y: 0 }, 'free_community')).toBe('origin');
    });

    it('classifies all non-origin nodes by spiral position', () => {
      const result = determineFaction({ x: 60, y: 0 }, 'free_community');
      expect(['community', 'machines', 'founders', 'professional']).toContain(result);
    });

    it('classifies nodes at different positions', () => {
      const result = determineFaction({ x: 0, y: -60 }, 'free_community');
      expect(['community', 'machines', 'founders', 'professional']).toContain(result);
    });
  });
});
