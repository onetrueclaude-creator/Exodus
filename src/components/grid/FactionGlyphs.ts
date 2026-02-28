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

function drawOriginIcon(g: Graphics, size: number, color: number, alpha: number, _isOwned: boolean): void {
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

function drawCommunityIcon(g: Graphics, size: number, color: number, alpha: number, isOwned: boolean): void {
  const r = size * 0.4;
  g.circle(0, 0, r);
  g.stroke({ width: isOwned ? 1.5 : 1, color, alpha });
  if (isOwned) {
    g.circle(0, 0, r);
    g.fill({ color, alpha: alpha * 0.15 });
  }
}

function drawMachinesIcon(g: Graphics, size: number, color: number, alpha: number, isOwned: boolean): void {
  const r = size * 0.42;
  const hexPath = () => {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  };
  g.setStrokeStyle({ width: isOwned ? 1.5 : 1, color, alpha });
  hexPath();
  g.stroke();
  if (isOwned) {
    hexPath();
    g.fill({ color, alpha: alpha * 0.15 });
  }
}

function drawFoundersIcon(g: Graphics, size: number, color: number, alpha: number, isOwned: boolean): void {
  const r = size * 0.42;
  const triPath = () => {
    g.moveTo(0, -r);
    g.lineTo(-r * 0.87, r * 0.5);
    g.lineTo(r * 0.87, r * 0.5);
    g.closePath();
  };
  g.setStrokeStyle({ width: isOwned ? 1.5 : 1, color, alpha });
  triPath();
  g.stroke();
  if (isOwned) {
    triPath();
    g.fill({ color, alpha: alpha * 0.15 });
  }
}

function drawProfessionalIcon(g: Graphics, size: number, color: number, alpha: number, isOwned: boolean): void {
  const r = size * 0.42;
  const diamondPath = () => {
    g.moveTo(0, -r);
    g.lineTo(r, 0);
    g.lineTo(0, r);
    g.lineTo(-r, 0);
    g.closePath();
  };
  g.setStrokeStyle({ width: isOwned ? 1.5 : 1, color, alpha });
  diamondPath();
  g.stroke();
  if (isOwned) {
    diamondPath();
    g.fill({ color, alpha: alpha * 0.15 });
  }
}

function drawUnclaimedIcon(g: Graphics, size: number, color: number, alpha: number, _isOwned: boolean): void {
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

type DrawFn = (g: Graphics, size: number, color: number, alpha: number, isOwned: boolean) => void;

const DRAW_FNS: Record<FactionId, DrawFn> = {
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
