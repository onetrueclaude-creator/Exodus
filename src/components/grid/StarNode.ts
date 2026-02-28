import { Graphics, Container } from 'pixi.js';
import type { Agent, FogLevel } from '@/types';
import type { Faction } from '@/lib/spiral/SpiralClassifier';
import { classifyCell } from '@/lib/spiral/SpiralClassifier';
import { createFactionGlyph, mapSpiralFactionToId, type FactionId } from './FactionGlyphs';

const CELL_SIZE = 60;

const FOG_ALPHA: Record<FogLevel, number> = {
  clear: 1.0,
  hazy: 0.6,
  fogged: 0.25,
  hidden: 0.06,
};

// Faction master size (22px), player size (16px), unclaimed (14px), origin (28px)
const FACTION_MASTER_SIZE = 22;
const PLAYER_SIZE = 16;

/**
 * Determine the display faction for an agent based on position and ownership.
 * Pure function — testable without PixiJS.
 */
export function determineFaction(
  position: { x: number; y: number },
  hasUserId: boolean,
  userFaction: Faction,
): FactionId {
  // Origin singularity — hardcoded at (0,0)
  if (position.x === 0 && position.y === 0) return 'origin';

  // Unclaimed nodes
  if (!hasUserId) return 'unclaimed';

  // Classify via spiral
  const gx = Math.round(position.x / CELL_SIZE);
  const gyMath = -Math.round(position.y / CELL_SIZE);
  const cls = classifyCell(gx, gyMath, userFaction);
  return mapSpiralFactionToId(cls.faction);
}

/**
 * Create a star node with faction glyph, hit area, and hover effects.
 */
export function createStarNode(
  agent: Agent,
  fogLevel: FogLevel,
  userFaction: Faction = 'free_community',
): Container {
  const container = new Container();
  container.position.set(agent.position.x, agent.position.y);

  const alpha = FOG_ALPHA[fogLevel];
  const factionId = determineFaction(agent.position, !!agent.userId, userFaction);

  // Determine glyph size based on node type
  let glyphSize: number;
  if (factionId === 'origin') {
    glyphSize = 28;
  } else if (factionId === 'unclaimed') {
    glyphSize = 14;
  } else if (agent.isPrimary || agent.tier === 'opus') {
    glyphSize = FACTION_MASTER_SIZE;
  } else {
    glyphSize = PLAYER_SIZE;
  }

  // Hit area (invisible, larger than visual for easier clicking)
  const hitArea = new Graphics();
  hitArea.circle(0, 0, glyphSize * 1.5);
  hitArea.fill({ color: 0x000000, alpha: 0.001 });
  container.addChild(hitArea);

  // Faction glyph (glow + line art)
  const glyph = createFactionGlyph(factionId, glyphSize, alpha);
  container.addChild(glyph);

  // Hover ring (hidden by default)
  const hoverRing = new Graphics();
  hoverRing.circle(0, 0, glyphSize * 0.7);
  hoverRing.stroke({ width: 0.5, color: 0xffffff, alpha: 0.3 });
  hoverRing.alpha = 0;
  container.addChild(hoverRing);

  container.eventMode = 'static';
  container.cursor = 'pointer';

  // Hover effects
  container.on('pointerover', () => {
    hoverRing.alpha = 1;
    container.scale.set(1.15);
  });

  container.on('pointerout', () => {
    hoverRing.alpha = 0;
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
