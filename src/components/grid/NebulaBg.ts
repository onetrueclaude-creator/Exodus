import { Graphics, Container } from 'pixi.js';

interface NebulaZone {
  x: number;
  y: number;
  radius: number;
  color: number;
  alpha: number;
}

const NEBULA_ZONES: NebulaZone[] = [
  // NW quadrant: Community (teal)
  { x: -300, y: -300, radius: 500, color: 0x0d9488, alpha: 0.04 },
  // NE quadrant: Machines (reddish purple)
  { x: 300, y: -300, radius: 500, color: 0xdc2680, alpha: 0.04 },
  // SE quadrant: Founders (gold-orange)
  { x: 300, y: 300, radius: 500, color: 0xf59e0b, alpha: 0.035 },
  // SW quadrant: Professional (blue)
  { x: -300, y: 300, radius: 500, color: 0x3b82f6, alpha: 0.035 },
  // Center: origin influence (grayish white)
  { x: 0, y: 0, radius: 350, color: 0xcbd5e1, alpha: 0.03 },
  // Secondary center wash
  { x: 0, y: 0, radius: 200, color: 0xcbd5e1, alpha: 0.025 },
];

/**
 * Creates the nebula background layer — soft faction-colored zones + star dust.
 * Drawn once and added behind the grid lines.
 */
export function createNebulaBg(): Container {
  const container = new Container();

  // Nebula gradient zones — concentric fills simulating radial gradients
  for (const zone of NEBULA_ZONES) {
    const g = new Graphics();
    const steps = 6;
    for (let i = steps; i >= 1; i--) {
      const r = zone.radius * (i / steps);
      const a = zone.alpha * (1 - (i - 1) / steps);
      g.circle(zone.x, zone.y, r);
      g.fill({ color: zone.color, alpha: a });
    }
    container.addChild(g);
  }

  // Star dust — 100 tiny static dots
  const dust = new Graphics();
  // Deterministic seed: simple LCG PRNG
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < 100; i++) {
    const x = (rand() - 0.5) * 1200;
    const y = (rand() - 0.5) * 1200;
    const r = 0.5 + rand() * 1.5;
    const a = 0.1 + rand() * 0.3;
    dust.circle(x, y, r);
    dust.fill({ color: 0xffffff, alpha: a });
  }
  container.addChild(dust);

  return container;
}
