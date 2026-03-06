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
    strokeColor: 0xcbd5e1,
    glowColor: 0xcbd5e1,
    glowRadius: 42,
    glowAlpha: 0,
  },
  community: {
    faction: 'community',
    size: 22,
    strokeColor: 0x0d9488,
    glowColor: 0x0d9488,
    glowRadius: 33,
    glowAlpha: 0,
  },
  machines: {
    faction: 'machines',
    size: 22,
    strokeColor: 0xdc2680,
    glowColor: 0xdc2680,
    glowRadius: 33,
    glowAlpha: 0,
  },
  founders: {
    faction: 'founders',
    size: 22,
    strokeColor: 0xf59e0b,
    glowColor: 0xf59e0b,
    glowRadius: 33,
    glowAlpha: 0,
  },
  professional: {
    faction: 'professional',
    size: 22,
    strokeColor: 0x3b82f6,
    glowColor: 0x3b82f6,
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

// ── Star Draw Functions ──────────────────────────────────────────────────────
// All nodes render as star-like points of light. Faction identity through color.

function drawStarPoint(g: Graphics, size: number, color: number, alpha: number, isOwned: boolean): void {
  const coreR = size * 0.12;
  const glowR = size * 0.35;
  const flareLen = size * 0.5;
  const flareWidth = size * 0.04;

  // Outer glow halo
  g.circle(0, 0, glowR);
  g.fill({ color, alpha: alpha * (isOwned ? 0.12 : 0.06) });

  // 4-point cross flare
  const fa = alpha * (isOwned ? 0.4 : 0.2);
  // Vertical flare
  g.moveTo(-flareWidth, 0);
  g.lineTo(0, -flareLen);
  g.lineTo(flareWidth, 0);
  g.lineTo(0, flareLen);
  g.closePath();
  g.fill({ color, alpha: fa });
  // Horizontal flare
  g.moveTo(0, -flareWidth);
  g.lineTo(-flareLen, 0);
  g.lineTo(0, flareWidth);
  g.lineTo(flareLen, 0);
  g.closePath();
  g.fill({ color, alpha: fa });

  // Bright core
  g.circle(0, 0, coreR * 1.5);
  g.fill({ color, alpha: alpha * (isOwned ? 0.6 : 0.3) });
  g.circle(0, 0, coreR);
  g.fill({ color: 0xffffff, alpha: alpha * (isOwned ? 0.9 : 0.4) });
}

function drawOriginStar(g: Graphics, size: number, color: number, alpha: number, _isOwned: boolean): void {
  // The singularity — larger, brighter, white with concentric pulses
  const coreR = size * 0.1;
  const midR = size * 0.25;
  const outerR = size * 0.45;
  const flareLen = size * 0.6;
  const flareWidth = size * 0.05;

  // Outer pulse ring
  g.circle(0, 0, outerR);
  g.stroke({ width: 0.5, color: 0xcbd5e1, alpha: alpha * 0.2 });

  // Mid pulse ring
  g.circle(0, 0, midR);
  g.stroke({ width: 0.8, color, alpha: alpha * 0.4 });

  // 4-point cross flare (brighter)
  g.moveTo(-flareWidth, 0);
  g.lineTo(0, -flareLen);
  g.lineTo(flareWidth, 0);
  g.lineTo(0, flareLen);
  g.closePath();
  g.fill({ color: 0xffffff, alpha: alpha * 0.3 });
  g.moveTo(0, -flareWidth);
  g.lineTo(-flareLen, 0);
  g.lineTo(0, flareWidth);
  g.lineTo(flareLen, 0);
  g.closePath();
  g.fill({ color: 0xffffff, alpha: alpha * 0.3 });

  // Bright core
  g.circle(0, 0, coreR * 1.8);
  g.fill({ color, alpha: alpha * 0.7 });
  g.circle(0, 0, coreR);
  g.fill({ color: 0xffffff, alpha });
}

function drawUnclaimedStar(g: Graphics, size: number, color: number, alpha: number, _isOwned: boolean): void {
  // Dim, small point — barely visible, waiting to be claimed
  const coreR = size * 0.08;
  const glowR = size * 0.2;

  g.circle(0, 0, glowR);
  g.fill({ color, alpha: alpha * 0.05 });

  g.circle(0, 0, coreR);
  g.fill({ color, alpha: alpha * 0.3 });
}

// ── Icon Factory ─────────────────────────────────────────────────────────────

type DrawFn = (g: Graphics, size: number, color: number, alpha: number, isOwned: boolean) => void;

const DRAW_FNS: Record<FactionId, DrawFn> = {
  origin: drawOriginStar,
  community: drawStarPoint,
  machines: drawStarPoint,
  founders: drawStarPoint,
  professional: drawStarPoint,
  unclaimed: drawUnclaimedStar,
};

export function createFactionGlyph(
  factionId: FactionId,
  sizeOverride?: number,
  alpha: number = 1.0,
  isOwned: boolean = true,
): Container {
  const cfg = GLYPH_CONFIGS[factionId];
  const size = sizeOverride ?? cfg.size;
  const container = new Container();

  // Claimable (unowned) nodes render dimmer
  const effectiveAlpha = isOwned ? alpha * 0.85 : alpha * 0.35;

  const icon = new Graphics();
  DRAW_FNS[factionId](icon, size, cfg.strokeColor, effectiveAlpha, isOwned);
  container.addChild(icon);

  return container;
}
