import { describe, it, expect } from 'vitest';
import {
  type FactionId,
  GLYPH_CONFIGS,
  mapSpiralFactionToId,
} from '../FactionGlyphs';

describe('FactionGlyphs', () => {
  describe('GLYPH_CONFIGS', () => {
    it('has entries for all 6 faction IDs', () => {
      const ids: FactionId[] = ['origin', 'community', 'machines', 'founders', 'professional', 'unclaimed'];
      for (const id of ids) {
        expect(GLYPH_CONFIGS[id]).toBeDefined();
        expect(GLYPH_CONFIGS[id].strokeColor).toBeTypeOf('number');
        expect(GLYPH_CONFIGS[id].glowColor).toBeTypeOf('number');
        // glowRadius >= 0 for all; unclaimed has 0
        expect(GLYPH_CONFIGS[id].glowRadius).toBeGreaterThanOrEqual(0);
      }
    });

    it('all factions have no glow (glow removed)', () => {
      const ids: FactionId[] = ['origin', 'community', 'machines', 'founders', 'professional', 'unclaimed'];
      for (const id of ids) {
        expect(GLYPH_CONFIGS[id].glowAlpha).toBe(0);
      }
    });

    it('community faction is teal', () => {
      expect(GLYPH_CONFIGS.community.strokeColor).toBe(0x0d9488);
    });

    it('origin is the largest glyph', () => {
      const originSize = GLYPH_CONFIGS.origin.size;
      for (const [id, cfg] of Object.entries(GLYPH_CONFIGS)) {
        if (id !== 'origin') {
          expect(originSize).toBeGreaterThanOrEqual(cfg.size);
        }
      }
    });

    it('unclaimed has no glow', () => {
      expect(GLYPH_CONFIGS.unclaimed.glowAlpha).toBe(0);
    });
  });

  describe('mapSpiralFactionToId', () => {
    it('maps free_community to community', () => {
      expect(mapSpiralFactionToId('free_community')).toBe('community');
    });
    it('maps treasury to machines', () => {
      expect(mapSpiralFactionToId('treasury')).toBe('machines');
    });
    it('maps founder_pool to founders', () => {
      expect(mapSpiralFactionToId('founder_pool')).toBe('founders');
    });
    it('maps professional_pool to professional', () => {
      expect(mapSpiralFactionToId('professional_pool')).toBe('professional');
    });
    it('maps null to unclaimed', () => {
      expect(mapSpiralFactionToId(null)).toBe('unclaimed');
    });
  });
});
