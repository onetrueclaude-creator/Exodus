import { Graphics, Text, Container } from 'pixi.js';
import type { Agent, FogLevel } from '@/types';

const TIER_RADIUS = { opus: 18, sonnet: 12, haiku: 7 };
const TIER_COLOR = { opus: 0x00d4ff, sonnet: 0x8b5cf6, haiku: 0x64748b };

const FOG_ALPHA: Record<FogLevel, number> = {
  clear: 1.0,
  hazy: 0.6,
  fogged: 0.25,
  hidden: 0,
};

export function createStarNode(agent: Agent, fogLevel: FogLevel): Container {
  const container = new Container();
  container.position.set(agent.position.x, agent.position.y);

  const alpha = FOG_ALPHA[fogLevel];
  const radius = TIER_RADIUS[agent.tier];
  const color = TIER_COLOR[agent.tier];

  // Outer glow
  const glow = new Graphics();
  glow.circle(0, 0, radius * 2.5);
  glow.fill({ color, alpha: alpha * 0.1 });
  container.addChild(glow);

  // Core star
  const core = new Graphics();
  core.circle(0, 0, radius);
  core.fill({ color, alpha });
  container.addChild(core);

  // Inner bright point
  const bright = new Graphics();
  bright.circle(0, 0, radius * 0.4);
  bright.fill({ color: 0xffffff, alpha: alpha * 0.8 });
  container.addChild(bright);

  // Username label (only if clear or hazy)
  if (agent.username && (fogLevel === 'clear' || fogLevel === 'hazy')) {
    const label = new Text({
      text: agent.username,
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fill: 0x94a3b8,
        align: 'center',
      },
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, radius + 6);
    label.alpha = alpha;
    container.addChild(label);
  }

  container.eventMode = 'static';
  container.cursor = 'pointer';

  return container;
}
