import { Graphics, Container } from 'pixi.js';
import type { Faction } from '@/lib/spiral/SpiralClassifier';

// ── Types ────────────────────────────────────────────────────────────────────

export type FactionId = 'origin' | 'community' | 'machines' | 'founders' | 'professional' | 'unclaimed';

export interface GlyphConfig {
  faction: FactionId;
  size: number;
  strokeColor: number;
  glowColor: number;
  glowRadius: number;
  glowAlpha: number;
}

// ── Configs ──────────────────────────────────────────────────────────────────

export const GLYPH_CONFIGS: Record<FactionId, GlyphConfig> = {
  origin: {
    faction: 'origin',
    size: 28,
    strokeColor: 0xe2e8f0,
    glowColor: 0xd97706,
    glowRadius: 42,
    glowAlpha: 0,
  },
  community: {
    faction: 'community',
    size: 22,
    strokeColor: 0xe2e8f0,
    glowColor: 0xe2e8f0,
    glowRadius: 33,
    glowAlpha: 0,
  },
  machines: {
    faction: 'machines',
    size: 22,
    strokeColor: 0xd97706,
    glowColor: 0xd97706,
    glowRadius: 33,
    glowAlpha: 0,
  },
  founders: {
    faction: 'founders',
    size: 22,
    strokeColor: 0xef4444,
    glowColor: 0xef4444,
    glowRadius: 33,
    glowAlpha: 0,
  },
  professional: {
    faction: 'professional',
    size: 22,
    strokeColor: 0x00d4ff,
    glowColor: 0x00d4ff,
    glowRadius: 33,
    glowAlpha: 0,
  },
  unclaimed: {
    faction: 'unclaimed',
    size: 14,
    strokeColor: 0x475569,
    glowColor: 0x475569,
    glowRadius: 0,
    glowAlpha: 0,
  },
};

// ── Faction Mapping ──────────────────────────────────────────────────────────

const SPIRAL_TO_DISPLAY: Record<Faction, FactionId> = {
  free_community: 'community',
  treasury: 'machines',
  founder_pool: 'founders',
  professional_pool: 'professional',
};

export function mapSpiralFactionToId(spiralFaction: Faction | null): FactionId {
  if (spiralFaction === null) return 'unclaimed';
  return SPIRAL_TO_DISPLAY[spiralFaction] ?? 'unclaimed';
}

// ── Icon Draw Functions ──────────────────────────────────────────────────────
// Each draws relative to (0,0) center. Distinctive faction icons.

function drawOriginIcon(g: Graphics, size: number, color: number, alpha: number): void {
  // Concentric rings — the singularity
  const r1 = size * 0.21;
  const r2 = size * 0.36;
  const r3 = size * 0.50;

  g.circle(0, 0, r3);
  g.stroke({ width: 1, color: 0xd97706, alpha: alpha * 0.3 });

  g.circle(0, 0, r2);
  g.stroke({ width: 1, color, alpha: alpha * 0.6 });

  g.circle(0, 0, r1);
  g.stroke({ width: 1.5, color, alpha });

  g.circle(0, 0, size * 0.07);
  g.fill({ color: 0xffffff, alpha });
}

function drawCommunityIcon(g: Graphics, size: number, color: number, alpha: number): void {
  // 5-pointed star — community/alliance symbol
  const outerR = size * 0.45;
  const innerR = outerR * 0.4;
  const points = 5;

  g.setStrokeStyle({ width: 1.5, color, alpha });
  for (let i = 0; i < points; i++) {
    const outerAngle = (i * 2 * Math.PI) / points - Math.PI / 2;
    const innerAngle = ((i + 0.5) * 2 * Math.PI) / points - Math.PI / 2;
    const ox = Math.cos(outerAngle) * outerR;
    const oy = Math.sin(outerAngle) * outerR;
    const ix = Math.cos(innerAngle) * innerR;
    const iy = Math.sin(innerAngle) * innerR;
    if (i === 0) {
      g.moveTo(ox, oy);
    } else {
      g.lineTo(ox, oy);
    }
    g.lineTo(ix, iy);
  }
  g.closePath();
  g.stroke();
  // Subtle fill for visibility
  g.setStrokeStyle({ width: 0 });
  for (let i = 0; i < points; i++) {
    const outerAngle = (i * 2 * Math.PI) / points - Math.PI / 2;
    const innerAngle = ((i + 0.5) * 2 * Math.PI) / points - Math.PI / 2;
    const ox = Math.cos(outerAngle) * outerR;
    const oy = Math.sin(outerAngle) * outerR;
    const ix = Math.cos(innerAngle) * innerR;
    const iy = Math.sin(innerAngle) * innerR;
    if (i === 0) {
      g.moveTo(ox, oy);
    } else {
      g.lineTo(ox, oy);
    }
    g.lineTo(ix, iy);
  }
  g.closePath();
  g.fill({ color, alpha: alpha * 0.15 });
}

function drawMachinesIcon(g: Graphics, size: number, color: number, alpha: number): void {
  // Gear/cog — 6 teeth around a circle
  const outerR = size * 0.45;
  const innerR = size * 0.32;
  const teeth = 6;
  const toothWidth = 0.3; // fraction of tooth arc

  g.setStrokeStyle({ width: 1.5, color, alpha });
  const step = (2 * Math.PI) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * toothWidth;
    const a2 = a0 + step * (1 - toothWidth);
    const a3 = a0 + step;
    // Inner arc to tooth start
    g.arc(0, 0, innerR, a0, a1);
    // Rise to outer
    g.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    // Outer arc (tooth top)
    g.arc(0, 0, outerR, a1, a2);
    // Drop to inner
    g.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
    // Inner arc to next tooth
    g.arc(0, 0, innerR, a2, a3);
  }
  g.closePath();
  g.stroke();
  // Center hole
  g.circle(0, 0, size * 0.12);
  g.stroke({ width: 1, color, alpha: alpha * 0.7 });
}

function drawFoundersIcon(g: Graphics, size: number, color: number, alpha: number): void {
  // Flame — stylized 3-curve flame icon
  const h = size * 0.45;
  const w = size * 0.28;

  // Outer flame body
  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(0, -h);
  // Left side curve
  g.bezierCurveTo(-w * 0.5, -h * 0.5, -w * 1.2, h * 0.1, -w * 0.3, h);
  // Bottom curve
  g.bezierCurveTo(-w * 0.1, h * 0.7, w * 0.1, h * 0.7, w * 0.3, h);
  // Right side curve
  g.bezierCurveTo(w * 1.2, h * 0.1, w * 0.5, -h * 0.5, 0, -h);
  g.stroke();

  // Inner flame tongue
  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.5 });
  g.moveTo(0, -h * 0.4);
  g.bezierCurveTo(-w * 0.3, 0, -w * 0.4, h * 0.3, 0, h * 0.6);
  g.bezierCurveTo(w * 0.4, h * 0.3, w * 0.3, 0, 0, -h * 0.4);
  g.stroke();
}

function drawProfessionalIcon(g: Graphics, size: number, color: number, alpha: number): void {
  // Diamond/gem — faceted gem shape
  const h = size * 0.45;
  const w = size * 0.35;
  const crownH = h * 0.3; // top section height

  // Outer diamond outline
  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(0, -h);           // top point
  g.lineTo(w, -h + crownH);  // top right
  g.lineTo(w * 0.7, h);      // bottom right
  g.lineTo(-w * 0.7, h);     // bottom left
  g.lineTo(-w, -h + crownH); // top left
  g.closePath();
  g.stroke();

  // Crown line (horizontal facet)
  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.5 });
  g.moveTo(-w, -h + crownH);
  g.lineTo(w, -h + crownH);
  g.stroke();

  // Center facet lines
  g.moveTo(0, -h);
  g.lineTo(-w * 0.3, -h + crownH);
  g.stroke();
  g.moveTo(0, -h);
  g.lineTo(w * 0.3, -h + crownH);
  g.stroke();

  // Bottom facet line
  g.moveTo(-w * 0.3, -h + crownH);
  g.lineTo(0, h);
  g.stroke();
  g.moveTo(w * 0.3, -h + crownH);
  g.lineTo(0, h);
  g.stroke();
}

function drawUnclaimedIcon(g: Graphics, size: number, color: number, alpha: number): void {
  // Dashed ring — empty, waiting
  const r = size * 0.4;
  const segments = 8;
  const arcLen = (Math.PI * 2) / segments;
  const gapRatio = 0.4;

  for (let i = 0; i < segments; i++) {
    const startAngle = i * arcLen;
    const endAngle = startAngle + arcLen * (1 - gapRatio);
    g.arc(0, 0, r, startAngle, endAngle);
    g.stroke({ width: 1, color, alpha: alpha * 0.5 });
  }
}

// ── Icon Factory ─────────────────────────────────────────────────────────────

const DRAW_FNS: Record<FactionId, (g: Graphics, size: number, color: number, alpha: number) => void> = {
  origin: drawOriginIcon,
  community: drawCommunityIcon,
  machines: drawMachinesIcon,
  founders: drawFoundersIcon,
  professional: drawProfessionalIcon,
  unclaimed: drawUnclaimedIcon,
};

export function createFactionGlyph(
  factionId: FactionId,
  sizeOverride?: number,
  alpha: number = 1.0,
): Container {
  const cfg = GLYPH_CONFIGS[factionId];
  const size = sizeOverride ?? cfg.size;
  const container = new Container();

  const icon = new Graphics();
  DRAW_FNS[factionId](icon, size, cfg.strokeColor, alpha * 0.85);
  container.addChild(icon);

  return container;
}
