import { Graphics, Text, Container } from 'pixi.js';
import type { Agent, FogLevel } from '@/types';

const TIER_RADIUS = { opus: 10, sonnet: 7, haiku: 4 };
const TIER_COLOR = { opus: 0x8b5cf6, sonnet: 0x00d4ff, haiku: 0xfacc15 };

const FOG_ALPHA: Record<FogLevel, number> = {
  clear: 1.0,
  hazy: 0.6,
  fogged: 0.25,
  hidden: 0.06,
};

function drawDiffractionSpikes(gfx: Graphics, length: number, color: number, alpha: number) {
  // 4-pointed cross rays — Stellaris signature look
  const thickness = Math.max(0.5, length * 0.04);

  // Horizontal spike
  gfx.setStrokeStyle({ width: thickness, color, alpha: alpha * 0.6 });
  gfx.moveTo(-length, 0);
  gfx.lineTo(length, 0);
  gfx.stroke();

  // Vertical spike
  gfx.setStrokeStyle({ width: thickness, color, alpha: alpha * 0.6 });
  gfx.moveTo(0, -length);
  gfx.lineTo(0, length);
  gfx.stroke();

  // Thinner diagonal rays (45°) — subtle secondary spikes
  const diagLen = length * 0.5;
  gfx.setStrokeStyle({ width: thickness * 0.5, color, alpha: alpha * 0.25 });
  gfx.moveTo(-diagLen, -diagLen);
  gfx.lineTo(diagLen, diagLen);
  gfx.stroke();

  gfx.setStrokeStyle({ width: thickness * 0.5, color, alpha: alpha * 0.25 });
  gfx.moveTo(diagLen, -diagLen);
  gfx.lineTo(-diagLen, diagLen);
  gfx.stroke();
}

export function createStarNode(agent: Agent, fogLevel: FogLevel): Container {
  const container = new Container();
  container.position.set(agent.position.x, agent.position.y);

  const alpha = FOG_ALPHA[fogLevel];
  const radius = TIER_RADIUS[agent.tier];
  const isUnclaimed = !agent.userId;
  const showColor = !isUnclaimed && (fogLevel === 'clear' || fogLevel === 'hazy');
  const color = isUnclaimed ? 0x3a4556 : (showColor ? TIER_COLOR[agent.tier] : 0x3a4556);

  // Hit area (invisible, larger than visual for easier clicking)
  const hitArea = new Graphics();
  hitArea.circle(0, 0, radius * 3);
  hitArea.fill({ color: 0x000000, alpha: 0.001 });
  container.addChild(hitArea);

  // Soft outer glow — large diffuse halo
  const halo = new Graphics();
  halo.circle(0, 0, radius * 2.5);
  halo.fill({ color, alpha: alpha * 0.05 });
  container.addChild(halo);

  // Inner glow
  const glow = new Graphics();
  glow.circle(0, 0, radius * 1.2);
  glow.fill({ color, alpha: alpha * 0.12 });
  container.addChild(glow);

  // Diffraction spikes — the Stellaris look
  const spikes = new Graphics();
  drawDiffractionSpikes(spikes, radius * 2.2, color, alpha);
  container.addChild(spikes);

  // Core — small bright disc
  const core = new Graphics();
  core.circle(0, 0, radius * 0.35);
  core.fill({ color, alpha: alpha * 0.8 });
  container.addChild(core);

  // Hot white center point
  const hotCenter = new Graphics();
  hotCenter.circle(0, 0, radius * 0.15);
  hotCenter.fill({ color: 0xffffff, alpha });
  container.addChild(hotCenter);

  // Agent control indicator — small digital helmet icon above the star
  if (showColor && agent.userId) {
    const iconSize = radius * 0.5;
    const icon = new Graphics();
    // Visor shape — rounded rectangle for digital helmet look
    icon.roundRect(-iconSize, -iconSize * 0.6, iconSize * 2, iconSize * 1.2, iconSize * 0.3);
    icon.fill({ color, alpha: alpha * 0.5 });
    icon.stroke({ width: 0.8, color: 0xffffff, alpha: alpha * 0.3 });
    // Visor slit
    icon.setStrokeStyle({ width: 0.6, color: 0xffffff, alpha: alpha * 0.6 });
    icon.moveTo(-iconSize * 0.6, 0);
    icon.lineTo(iconSize * 0.6, 0);
    icon.stroke();
    icon.position.set(0, -(radius * 0.8 + iconSize));
    container.addChild(icon);
  }

  // Hover ring (hidden by default)
  const hoverRing = new Graphics();
  hoverRing.circle(0, 0, radius * 1.4);
  hoverRing.stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
  hoverRing.alpha = 0;
  container.addChild(hoverRing);

  // Username label (only if clear or hazy)
  if (agent.username && (fogLevel === 'clear' || fogLevel === 'hazy')) {
    const displayName = agent.isPrimary
      ? `★ ${agent.username}`
      : agent.username;
    const label = new Text({
      text: displayName,
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: agent.isPrimary ? 11 : 10,
        fill: agent.isPrimary ? 0xffd700 : 0x64748b,
        align: 'center',
      },
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, radius * 0.6 + 6);
    label.alpha = alpha * (agent.isPrimary ? 0.9 : 0.6);
    container.addChild(label);
  }

  container.eventMode = 'static';
  container.cursor = 'pointer';

  // Hover effects
  container.on('pointerover', () => {
    hoverRing.alpha = 1;
    spikes.alpha = 1.3;
    container.scale.set(1.1);
  });

  container.on('pointerout', () => {
    hoverRing.alpha = 0;
    spikes.alpha = 1;
    container.scale.set(1);
  });

  // Store agent ID for click handling
  container.label = agent.id;

  return container;
}

/** Modulate container alpha for hover-dim effect.
 *  Pure function — no React, no store. */
export function setNodeDimmed(container: Container, dimmed: boolean): void {
  container.alpha = dimmed ? 0.4 : 1.0;
}
