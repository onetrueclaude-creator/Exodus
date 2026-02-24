import { Graphics } from 'pixi.js';
import type { GridPosition } from '@/types';

export function createConnectionLine(
  from: GridPosition,
  to: GridPosition,
  strength: number,
  color: number = 0x00d4ff,
  bold: boolean = false,
): Graphics {
  const line = new Graphics();
  const alpha = Math.max(0.1, bold ? strength * 0.85 : strength * 0.4);
  const width = bold ? 3 + strength * 3 : 1 + strength * 2;

  line.setStrokeStyle({ width, color, alpha });
  line.moveTo(from.x, from.y);
  line.lineTo(to.x, to.y);
  line.stroke();

  return line;
}
