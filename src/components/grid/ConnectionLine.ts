import { Graphics } from 'pixi.js';
import type { GridPosition } from '@/types';

/**
 * Draw a connection line between two nodes.
 * Lines are thin (1px), faction-colored, with gradient alpha fade
 * (stronger near endpoints, fading toward midpoint).
 */
export function createConnectionLine(
  from: GridPosition,
  to: GridPosition,
  strength: number,
  color: number = 0x00d4ff,
  _bold: boolean = false,
): Graphics {
  const line = new Graphics();
  const baseAlpha = Math.max(0.05, strength * 0.4);

  // Draw as 3 segments with gradient alpha: endpoints stronger, midpoint faded
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const q1x = (from.x + mx) / 2;
  const q1y = (from.y + my) / 2;
  const q3x = (mx + to.x) / 2;
  const q3y = (my + to.y) / 2;

  // Segment 1: from → quarter point (strongest)
  line.setStrokeStyle({ width: 1, color, alpha: baseAlpha });
  line.moveTo(from.x, from.y);
  line.lineTo(q1x, q1y);
  line.stroke();

  // Segment 2: quarter → three-quarter (faded midpoint)
  line.setStrokeStyle({ width: 1, color, alpha: baseAlpha * 0.4 });
  line.moveTo(q1x, q1y);
  line.lineTo(q3x, q3y);
  line.stroke();

  // Segment 3: three-quarter → to (strongest)
  line.setStrokeStyle({ width: 1, color, alpha: baseAlpha });
  line.moveTo(q3x, q3y);
  line.lineTo(to.x, to.y);
  line.stroke();

  return line;
}
