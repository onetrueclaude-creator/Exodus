import { describe, it, expect } from 'vitest';
import {
  computeSpawnSequence,
  lerp,
  easeOutCubic,
  type AnimationPhase,
  type SpawnSequence,
} from '../spawnAnimation';

describe('spawnAnimation', () => {
  describe('computeSpawnSequence', () => {
    const spawnCoord = { x: 10, y: 20 };
    const cameraStart = { x: 0, y: 0 };
    const zoomStart = 0.5;
    const zoomEnd = 2.0;

    it('returns 3 phases with correct names', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      expect(seq.phases).toHaveLength(3);
      expect(seq.phases[0].name).toBe('zoom-in');
      expect(seq.phases[1].name).toBe('materialize');
      expect(seq.phases[2].name).toBe('connect');
    });

    it('zoom phase targets spawn coordinate and has correct zoom values', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      const zoomPhase = seq.phases[0];
      expect(zoomPhase.target).toEqual(spawnCoord);
      expect(zoomPhase.zoomStart).toBe(zoomStart);
      expect(zoomPhase.zoomEnd).toBe(zoomEnd);
    });

    it('total duration is in 3000-4000ms range', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      const totalMs = seq.phases.reduce((sum, p) => sum + p.durationMs, 0);
      expect(totalMs).toBeGreaterThanOrEqual(3000);
      expect(totalMs).toBeLessThanOrEqual(4000);
    });

    it('stores spawnCoord on the returned sequence', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      expect(seq.spawnCoord).toEqual(spawnCoord);
    });

    it('zoom-in phase has 1000ms duration', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      expect(seq.phases[0].durationMs).toBe(1000);
    });

    it('materialize phase has 1500ms duration', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      expect(seq.phases[1].durationMs).toBe(1500);
    });

    it('connect phase has 1000ms duration', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      expect(seq.phases[2].durationMs).toBe(1000);
    });

    it('materialize and connect phases target spawn coordinate', () => {
      const seq = computeSpawnSequence(spawnCoord, cameraStart, zoomStart, zoomEnd);
      expect(seq.phases[1].target).toEqual(spawnCoord);
      expect(seq.phases[2].target).toEqual(spawnCoord);
    });
  });

  describe('lerp', () => {
    it('returns start when t=0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it('returns end when t=1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it('returns midpoint when t=0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it('handles negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });
  });

  describe('easeOutCubic', () => {
    it('returns 0 at t=0', () => {
      expect(easeOutCubic(0)).toBe(0);
    });

    it('returns 1 at t=1', () => {
      expect(easeOutCubic(1)).toBe(1);
    });

    it('progresses faster at start than linear', () => {
      // easeOutCubic at 0.5 should be > 0.5 (decelerating curve)
      expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    });

    it('returns value between 0 and 1 for valid input', () => {
      const result = easeOutCubic(0.3);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });
});
