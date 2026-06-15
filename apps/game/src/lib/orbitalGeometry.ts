const PHI = (1 + Math.sqrt(5)) / 2;

/** Golden angle in degrees: 360·(2−φ) ≈ 137.50776°. */
export const GOLDEN_ANGLE_DEG = 360 * (2 - PHI);
export const GOLDEN_ANGLE_RAD = (GOLDEN_ANGLE_DEG * Math.PI) / 180;

/** Seats in the innermost band; sets band granularity. band(k)=ceil(√(k/K1)). */
export const SEATS_INNER_BAND = 8;
export const HARDNESS_MULTIPLIER = 16;

export interface Vec2 {
  x: number;
  y: number;
}

/** Phyllotaxis seat position for rank k at radial scale c. k=0 → origin (Singularity). */
export function phylloPos(k: number, c: number): Vec2 {
  if (k <= 0) return { x: 0, y: 0 };
  const r = c * Math.sqrt(k);
  const a = k * GOLDEN_ANGLE_RAD;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

/** Equal-width radial band for rank k: ceil(√(k/K1)). band 1 = ranks 1..K1. */
export function bandOf(k: number, k1: number = SEATS_INNER_BAND): number {
  if (k <= 0) return 0;
  return Math.ceil(Math.sqrt(k / k1));
}

/** Hardness tier: 16 × band (mirrors whitepaper 16×ring). */
export function hardnessOf(k: number): number {
  return HARDNESS_MULTIPLIER * Math.max(1, bandOf(k));
}
