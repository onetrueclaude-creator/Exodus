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
    glowAlpha: 0.15,
  },
  community: {
    faction: 'community',
    size: 22,
    strokeColor: 0xf59e0b,
    glowColor: 0xf59e0b,
    glowRadius: 33,
    glowAlpha: 0.12,
  },
  machines: {
    faction: 'machines',
    size: 22,
    strokeColor: 0xd97706,
    glowColor: 0xd97706,
    glowRadius: 33,
    glowAlpha: 0.12,
  },
  founders: {
    faction: 'founders',
    size: 22,
    strokeColor: 0xef4444,
    glowColor: 0xef4444,
    glowRadius: 33,
    glowAlpha: 0.12,
  },
  professional: {
    faction: 'professional',
    size: 22,
    strokeColor: 0x00d4ff,
    glowColor: 0x00d4ff,
    glowRadius: 33,
    glowAlpha: 0.12,
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

// ── Glyph Draw Functions ─────────────────────────────────────────────────────
// Each draws relative to (0,0) center. Stroke-only, no fills (except origin dot).

function drawOriginGlyph(g: Graphics, size: number, color: number, alpha: number): void {
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

function drawCommunityGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  const r = size * 0.4;
  const dotR = size * 0.06;
  const pts = [
    { x: 0, y: -r },
    { x: -r * 0.87, y: r * 0.5 },
    { x: r * 0.87, y: r * 0.5 },
  ];

  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.7 });
  g.moveTo(pts[0].x, pts[0].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.lineTo(pts[2].x, pts[2].y);
  g.lineTo(pts[0].x, pts[0].y);
  g.stroke();

  for (const p of pts) {
    g.circle(p.x, p.y, dotR);
    g.fill({ color, alpha });
  }
}

function drawMachinesGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  const h = size * 0.35;
  const w = size * 0.2;

  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(-w * 0.3, -h);
  g.lineTo(-w * 1.5, 0);
  g.lineTo(-w * 0.3, h);
  g.stroke();

  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(w * 0.3, -h);
  g.lineTo(w * 1.5, 0);
  g.lineTo(w * 0.3, h);
  g.stroke();

  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.6 });
  g.moveTo(-w * 1.2, 0);
  g.lineTo(w * 1.2, 0);
  g.stroke();
}

function drawFoundersGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  const h = size * 0.4;
  const spread = size * 0.3;

  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(0, h);
  g.lineTo(0, -h * 0.3);
  g.stroke();

  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.8 });
  g.moveTo(0, -h * 0.3);
  g.lineTo(-spread, -h);
  g.stroke();

  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.8 });
  g.moveTo(0, -h * 0.3);
  g.lineTo(spread, -h);
  g.stroke();
}

function drawProfessionalGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  const h = size * 0.35;
  const gap = size * 0.15;

  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(-gap, -h);
  g.lineTo(-gap, h);
  g.stroke();

  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(gap, -h);
  g.lineTo(gap, h);
  g.stroke();

  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.6 });
  g.moveTo(-gap * 1.8, h * 0.6);
  g.lineTo(gap * 1.8, -h * 0.6);
  g.stroke();
}

function drawUnclaimedGlyph(g: Graphics, size: number, color: number, alpha: number): void {
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

// ── Glyph Factory ────────────────────────────────────────────────────────────

const DRAW_FNS: Record<FactionId, (g: Graphics, size: number, color: number, alpha: number) => void> = {
  origin: drawOriginGlyph,
  community: drawCommunityGlyph,
  machines: drawMachinesGlyph,
  founders: drawFoundersGlyph,
  professional: drawProfessionalGlyph,
  unclaimed: drawUnclaimedGlyph,
};

export function createFactionGlyph(
  factionId: FactionId,
  sizeOverride?: number,
  alpha: number = 1.0,
): Container {
  const cfg = GLYPH_CONFIGS[factionId];
  const size = sizeOverride ?? cfg.size;

  const container = new Container();

  if (cfg.glowAlpha > 0) {
    const glow = new Graphics();
    const glowR = cfg.glowRadius * (size / cfg.size);
    const steps = 4;
    for (let i = steps; i >= 1; i--) {
      const r = glowR * (i / steps);
      const a = cfg.glowAlpha * (1 - (i - 1) / steps) * alpha;
      glow.circle(0, 0, r);
      glow.fill({ color: cfg.glowColor, alpha: a });
    }
    container.addChild(glow);
  }

  const glyph = new Graphics();
  DRAW_FNS[factionId](glyph, size, cfg.strokeColor, alpha * 0.85);
  container.addChild(glyph);

  return container;
}
