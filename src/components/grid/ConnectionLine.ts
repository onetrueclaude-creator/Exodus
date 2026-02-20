import { Graphics } from 'pixi.js';
import type { GridPosition } from '@/types';

export function createConnectionLine(
  from: GridPosition,
  to: GridPosition,
  strength: number,
): Graphics {
  const line = new Graphics();
  const alpha = Math.max(0.05, strength * 0.4);

  line.setStrokeStyle({ width: 1 + strength * 2, color: 0x00d4ff, alpha });
  line.moveTo(from.x, from.y);
  line.lineTo(to.x, to.y);
  line.stroke();

  return line;
}
