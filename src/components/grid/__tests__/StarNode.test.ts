import { describe, it, expect } from 'vitest';
import { determineFaction } from '../StarNode';

describe('StarNode', () => {
  describe('determineFaction', () => {
    it('returns origin for position (0,0)', () => {
      expect(determineFaction({ x: 0, y: 0 }, true, 'free_community')).toBe('origin');
    });

    it('returns unclaimed when no userId', () => {
      expect(determineFaction({ x: 60, y: 0 }, false, 'free_community')).toBe('unclaimed');
    });

    it('returns mapped faction for claimed non-origin nodes', () => {
      const result = determineFaction({ x: 0, y: -60 }, true, 'free_community');
      expect(['community', 'machines', 'founders', 'professional']).toContain(result);
    });
  });
});
