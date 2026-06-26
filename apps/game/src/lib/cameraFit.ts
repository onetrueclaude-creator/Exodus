/**
 * Camera zoom-to-fit (W6, task #23 — the "camera-fit" item from the overhaul
 * notes). Returns the zoom that fits a scene of radius `maxRadius` (world px from
 * the Singularity core) inside the viewport with a margin.
 *
 * Design choices:
 *  - Never zooms IN past `maxZoom` (1): a sparse early field (few players close to
 *    the core) must not be blown up to fill the screen.
 *  - Clamps to `minZoom` so a huge mature field can't shrink nodes to nothing.
 *  - `maxRadius <= 0` (Singularity-only, or unknown) → `maxZoom` (no change).
 *
 * Pure and unit-tested here; the renderer wires it after the first populated
 * rebuild (deferred until the visual loop can confirm the framing on a real app).
 */
export function computeFitZoom(
  maxRadius: number,
  halfWidth: number,
  halfHeight: number,
  marginFraction = 0.85,
  minZoom = 0.2,
  maxZoom = 1,
): number {
  if (!(maxRadius > 0) || !(halfWidth > 0) || !(halfHeight > 0)) return maxZoom;
  const fit = (Math.min(halfWidth, halfHeight) * marginFraction) / maxRadius;
  return Math.max(minZoom, Math.min(maxZoom, fit));
}

/** Max world-space radius over a set of body offsets (for computeFitZoom). */
export function maxBodyRadius(bodies: ReadonlyArray<{ x: number; y: number }>): number {
  let r = 0;
  for (const b of bodies) {
    const d = Math.hypot(b.x, b.y);
    if (d > r) r = d;
  }
  return r;
}
