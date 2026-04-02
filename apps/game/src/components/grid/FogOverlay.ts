import { Graphics } from 'pixi.js';
import type { GridPosition } from '@/types';

export function createFogMask(
  center: GridPosition,
  radius: number,
  canvasWidth: number,
  canvasHeight: number,
): Graphics {
  const mask = new Graphics();

  // Full dark rectangle covering the canvas
  mask.rect(-canvasWidth, -canvasHeight, canvasWidth * 2, canvasHeight * 2);
  mask.fill({ color: 0x0a0a0f, alpha: 0.85 });

  // Cut out a radial clear zone around the viewer
  // For v1, use concentric circles with decreasing alpha
  const steps = 8;
  for (let i = steps; i >= 0; i--) {
    const stepRadius = radius * (i / steps);
    const alpha = 0.85 * (i / steps);
    mask.circle(center.x, center.y, stepRadius);
    mask.fill({ color: 0x0a0a0f, alpha: 1 - alpha });
  }

  return mask;
}
