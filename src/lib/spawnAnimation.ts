/**
 * Spawn Animation Data Model
 *
 * Computes a 3-phase animation sequence for agent spawn events:
 *   1. zoom-in    (1000ms) — camera moves from overview to spawn point
 *   2. materialize (1500ms) — node pulses from 0% to 100% opacity
 *   3. connect    (1000ms) — connection line draws to nearest faction neighbor
 */

export interface AnimationPhase {
  name: 'zoom-in' | 'materialize' | 'connect';
  durationMs: number;
  target: { x: number; y: number };
  zoomStart?: number;
  zoomEnd?: number;
}

export interface SpawnSequence {
  phases: AnimationPhase[];
  spawnCoord: { x: number; y: number };
}

/** Linear interpolation between start and end by factor t (0..1). */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/** Cubic ease-out: fast start, decelerating to rest. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Build the 3-phase spawn animation sequence.
 *
 * @param spawnCoord   Grid coordinate where the new agent appears
 * @param _cameraStart Current camera position before the animation (reserved for future use)
 * @param zoomStart    Camera zoom level at animation start
 * @param zoomEnd      Camera zoom level at animation end
 */
export function computeSpawnSequence(
  spawnCoord: { x: number; y: number },
  _cameraStart: { x: number; y: number },
  zoomStart: number,
  zoomEnd: number,
): SpawnSequence {
  const phases: AnimationPhase[] = [
    {
      name: 'zoom-in',
      durationMs: 1000,
      target: { x: spawnCoord.x, y: spawnCoord.y },
      zoomStart,
      zoomEnd,
    },
    {
      name: 'materialize',
      durationMs: 1500,
      target: { x: spawnCoord.x, y: spawnCoord.y },
    },
    {
      name: 'connect',
      durationMs: 1000,
      target: { x: spawnCoord.x, y: spawnCoord.y },
    },
  ];

  return {
    phases,
    spawnCoord: { x: spawnCoord.x, y: spawnCoord.y },
  };
}
