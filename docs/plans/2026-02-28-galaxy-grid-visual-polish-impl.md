# Galaxy Grid Visual Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the galaxy grid from a flat prototype with wallet-hash labels into a deep-space atmosphere with distinctive faction line-art glyphs, gradient connection lines, and proper origin node isolation.

**Architecture:** All changes stay within the existing PixiJS 8 + React component structure. Two new files created (`FactionGlyphs.ts`, `NebulaBg.ts`), four existing files modified. No new dependencies. The MinigridLayer is removed from GalaxyGrid but NOT deleted (reused later in subgrid tab).

**Tech Stack:** PixiJS 8 (Graphics API), TypeScript 5, React 19, Vitest (testing)

**Design doc:** `docs/plans/2026-02-28-galaxy-grid-visual-polish-design.md`

---

## Context for the Implementer

### Key Files You'll Touch

| File | Action | Purpose |
|------|--------|---------|
| `src/components/grid/FactionGlyphs.ts` | **Create** | 6 faction glyph draw functions + glow wrapper + faction mapping |
| `src/components/grid/NebulaBg.ts` | **Create** | Nebula gradient layers + star dust particles |
| `src/components/grid/StarNode.ts` | **Modify** | Replace circle+text node rendering with faction glyph calls |
| `src/components/grid/ConnectionLine.ts` | **Modify** | Thinner lines (1px), gradient fade alpha, faction-only |
| `src/components/grid/GridBackground.ts` | **Modify** | Deeper background color, dimmer grid lines |
| `src/components/GalaxyGrid.tsx` | **Modify** | Remove MinigridLayer, skip origin connections, wire nebula bg, update layer indices |

### Faction Name Mapping

The `SpiralClassifier` uses internal faction names. The glyphs use display names. The mapping is:

| SpiralClassifier (`Faction`) | Display `FactionId` | Color Hex | Glyph Shape |
|------------------------------|---------------------|-----------|-------------|
| — (position 0,0) | `origin` | 0xCBD5E1 | Concentric rings |
| `free_community` | `community` | 0x0D9488 | Network triangle (3 dots + lines) |
| `treasury` | `machines` | 0xDC2680 | Angle brackets + line |
| `founder_pool` | `founders` | 0xF59E0B | Root fork (Y-branch) |
| `professional_pool` | `professional` | 0x3B82F6 | Double bars + slash |
| — (no userId) | `unclaimed` | 0x475569 | Dashed ring |

### Testing Approach

PixiJS is NOT available in jsdom. Tests focus on **pure logic** (faction mapping, glyph configs, coordinate math). Visual rendering is verified in the live browser at `http://localhost:8080/game`.

### How Agents Map to Factions

Currently the `Agent` type has no `factionId`. Faction is derived from:
1. Position `(0,0)` → `'origin'` (hardcoded special case)
2. No `userId` → `'unclaimed'`
3. Otherwise → `classifyCell(gx, gyMath, userFaction).faction` mapped through the table above

---

## Task 1: Create FactionGlyphs Module

**Files:**
- Create: `src/components/grid/FactionGlyphs.ts`
- Test: `src/components/grid/__tests__/FactionGlyphs.test.ts`

### Step 1: Write the failing test

Create `src/components/grid/__tests__/FactionGlyphs.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  type FactionId,
  GLYPH_CONFIGS,
  mapSpiralFactionToId,
} from '../FactionGlyphs';

describe('FactionGlyphs', () => {
  describe('GLYPH_CONFIGS', () => {
    it('has entries for all 6 faction IDs', () => {
      const ids: FactionId[] = ['origin', 'community', 'machines', 'founders', 'professional', 'unclaimed'];
      for (const id of ids) {
        expect(GLYPH_CONFIGS[id]).toBeDefined();
        expect(GLYPH_CONFIGS[id].strokeColor).toBeTypeOf('number');
        expect(GLYPH_CONFIGS[id].glowColor).toBeTypeOf('number');
        expect(GLYPH_CONFIGS[id].glowRadius).toBeGreaterThan(0);
      }
    });

    it('origin is the largest glyph', () => {
      const originSize = GLYPH_CONFIGS.origin.size;
      for (const [id, cfg] of Object.entries(GLYPH_CONFIGS)) {
        if (id !== 'origin') {
          expect(originSize).toBeGreaterThanOrEqual(cfg.size);
        }
      }
    });

    it('unclaimed has no glow', () => {
      expect(GLYPH_CONFIGS.unclaimed.glowAlpha).toBe(0);
    });
  });

  describe('mapSpiralFactionToId', () => {
    it('maps free_community to community', () => {
      expect(mapSpiralFactionToId('free_community')).toBe('community');
    });
    it('maps treasury to machines', () => {
      expect(mapSpiralFactionToId('treasury')).toBe('machines');
    });
    it('maps founder_pool to founders', () => {
      expect(mapSpiralFactionToId('founder_pool')).toBe('founders');
    });
    it('maps professional_pool to professional', () => {
      expect(mapSpiralFactionToId('professional_pool')).toBe('professional');
    });
    it('maps null to unclaimed', () => {
      expect(mapSpiralFactionToId(null)).toBe('unclaimed');
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/grid/__tests__/FactionGlyphs.test.ts
```

Expected: FAIL — module `../FactionGlyphs` cannot be resolved.

### Step 3: Write the implementation

Create `src/components/grid/FactionGlyphs.ts`:

```typescript
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
    glowAlpha: 0.15,
  },
  community: {
    faction: 'community',
    size: 22,
    strokeColor: 0x0d9488,
    glowColor: 0x0d9488,
    glowRadius: 33,
    glowAlpha: 0.12,
  },
  machines: {
    faction: 'machines',
    size: 22,
    strokeColor: 0xdc2680,
    glowColor: 0xdc2680,
    glowRadius: 33,
    glowAlpha: 0.12,
  },
  founders: {
    faction: 'founders',
    size: 22,
    strokeColor: 0xf59e0b,
    glowColor: 0xf59e0b,
    glowRadius: 33,
    glowAlpha: 0.12,
  },
  professional: {
    faction: 'professional',
    size: 22,
    strokeColor: 0x3b82f6,
    glowColor: 0x3b82f6,
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
  const r1 = size * 0.21;  // inner ring
  const r2 = size * 0.36;  // mid ring
  const r3 = size * 0.50;  // outer ring

  // Outer ring
  g.circle(0, 0, r3);
  g.stroke({ width: 1, color: 0xcbd5e1, alpha: alpha * 0.3 });

  // Mid ring
  g.circle(0, 0, r2);
  g.stroke({ width: 1, color, alpha: alpha * 0.6 });

  // Inner ring
  g.circle(0, 0, r1);
  g.stroke({ width: 1.5, color, alpha });

  // Center dot (filled)
  g.circle(0, 0, size * 0.07);
  g.fill({ color: 0xffffff, alpha });
}

function drawCommunityGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  // 3 dots connected by lines forming an open triangle — network motif
  const r = size * 0.4;
  const dotR = size * 0.06;
  // Triangle vertices: top, bottom-left, bottom-right
  const pts = [
    { x: 0, y: -r },
    { x: -r * 0.87, y: r * 0.5 },
    { x: r * 0.87, y: r * 0.5 },
  ];

  // Lines
  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.7 });
  g.moveTo(pts[0].x, pts[0].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.lineTo(pts[2].x, pts[2].y);
  g.lineTo(pts[0].x, pts[0].y);
  g.stroke();

  // Dots at vertices
  for (const p of pts) {
    g.circle(p.x, p.y, dotR);
    g.fill({ color, alpha });
  }
}

function drawMachinesGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  // Angle bracket pair ⟨ ⟩ with horizontal line — processor register motif
  const h = size * 0.35;
  const w = size * 0.2;

  // Left bracket ⟨
  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(-w * 0.3, -h);
  g.lineTo(-w * 1.5, 0);
  g.lineTo(-w * 0.3, h);
  g.stroke();

  // Right bracket ⟩
  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(w * 0.3, -h);
  g.lineTo(w * 1.5, 0);
  g.lineTo(w * 0.3, h);
  g.stroke();

  // Horizontal center line
  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.6 });
  g.moveTo(-w * 1.2, 0);
  g.lineTo(w * 1.2, 0);
  g.stroke();
}

function drawFoundersGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  // Root fork: vertical line with two angled branches from base — foundation motif
  const h = size * 0.4;
  const spread = size * 0.3;

  // Main trunk (upward)
  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(0, h);
  g.lineTo(0, -h * 0.3);
  g.stroke();

  // Left branch
  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.8 });
  g.moveTo(0, -h * 0.3);
  g.lineTo(-spread, -h);
  g.stroke();

  // Right branch
  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.8 });
  g.moveTo(0, -h * 0.3);
  g.lineTo(spread, -h);
  g.stroke();
}

function drawProfessionalGlyph(g: Graphics, size: number, color: number, alpha: number): void {
  // Two parallel vertical bars with diagonal slash — hash/rate motif
  const h = size * 0.35;
  const gap = size * 0.15;

  // Left bar
  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(-gap, -h);
  g.lineTo(-gap, h);
  g.stroke();

  // Right bar
  g.setStrokeStyle({ width: 1.5, color, alpha });
  g.moveTo(gap, -h);
  g.lineTo(gap, h);
  g.stroke();

  // Diagonal slash
  g.setStrokeStyle({ width: 1, color, alpha: alpha * 0.6 });
  g.moveTo(-gap * 1.8, h * 0.6);
  g.lineTo(gap * 1.8, -h * 0.6);
  g.stroke();
}

function drawUnclaimedGlyph(g: Graphics, size: number, color: number, alpha: number): void {
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

// ── Glyph Factory ────────────────────────────────────────────────────────────

const DRAW_FNS: Record<FactionId, (g: Graphics, size: number, color: number, alpha: number) => void> = {
  origin: drawOriginGlyph,
  community: drawCommunityGlyph,
  machines: drawMachinesGlyph,
  founders: drawFoundersGlyph,
  professional: drawProfessionalGlyph,
  unclaimed: drawUnclaimedGlyph,
};

/**
 * Creates a faction glyph Container with:
 * - A soft radial glow circle (behind)
 * - The line-art glyph (on top)
 *
 * @param factionId  Which faction glyph to draw
 * @param sizeOverride  Optional size override (for player nodes at 16px vs masters at 22px)
 * @param alpha  Overall alpha (for fog levels)
 */
export function createFactionGlyph(
  factionId: FactionId,
  sizeOverride?: number,
  alpha: number = 1.0,
): Container {
  const cfg = GLYPH_CONFIGS[factionId];
  const size = sizeOverride ?? cfg.size;

  const container = new Container();

  // Glow circle (behind)
  if (cfg.glowAlpha > 0) {
    const glow = new Graphics();
    const glowR = cfg.glowRadius * (size / cfg.size); // scale glow with size
    // Concentric fills to simulate radial gradient
    const steps = 4;
    for (let i = steps; i >= 1; i--) {
      const r = glowR * (i / steps);
      const a = cfg.glowAlpha * (1 - (i - 1) / steps) * alpha;
      glow.circle(0, 0, r);
      glow.fill({ color: cfg.glowColor, alpha: a });
    }
    container.addChild(glow);
  }

  // Line-art glyph
  const glyph = new Graphics();
  DRAW_FNS[factionId](glyph, size, cfg.strokeColor, alpha * 0.85);
  container.addChild(glyph);

  return container;
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/grid/__tests__/FactionGlyphs.test.ts
```

Expected: PASS (all 7 tests).

### Step 5: Commit

```bash
git add src/components/grid/FactionGlyphs.ts src/components/grid/__tests__/FactionGlyphs.test.ts
git commit -m "feat(grid): add FactionGlyphs module — 6 line-art glyph types + faction mapping"
```

---

## Task 2: Create NebulaBg Module

**Files:**
- Create: `src/components/grid/NebulaBg.ts`

No test file for this task — it's pure PixiJS rendering with no testable pure logic.

### Step 1: Write the implementation

Create `src/components/grid/NebulaBg.ts`:

```typescript
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
```

### Step 2: Commit

```bash
git add src/components/grid/NebulaBg.ts
git commit -m "feat(grid): add NebulaBg — soft faction-colored nebula zones + star dust"
```

---

## Task 3: Modify StarNode to Use Faction Glyphs

**Files:**
- Modify: `src/components/grid/StarNode.ts` (full rewrite of `createStarNode`)
- Test: `src/components/grid/__tests__/StarNode.test.ts` (new)

### Step 1: Write the failing test

Create `src/components/grid/__tests__/StarNode.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { determineFaction } from '../StarNode';

describe('StarNode', () => {
  describe('determineFaction', () => {
    it('returns origin for position (0,0)', () => {
      expect(determineFaction({ x: 0, y: 0 }, true, 'free_community')).toBe('origin');
    });

    it('returns unclaimed when no userId', () => {
      expect(determineFaction({ x: 60, y: 0 }, false, 'free_community')).toBe('unclaimed');
    });

    it('returns mapped faction for claimed non-origin nodes', () => {
      // Position (0, -60) maps to grid cell (0, 1) which is in the free_community arm
      const result = determineFaction({ x: 0, y: -60 }, true, 'free_community');
      expect(['community', 'machines', 'founders', 'professional']).toContain(result);
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/components/grid/__tests__/StarNode.test.ts
```

Expected: FAIL — `determineFaction` is not exported from `../StarNode`.

### Step 3: Rewrite StarNode.ts

Replace the entire contents of `src/components/grid/StarNode.ts` with:

```typescript
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
  let glyphSize: number | undefined;
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
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/components/grid/__tests__/StarNode.test.ts
```

Expected: PASS (all 3 tests).

### Step 5: Commit

```bash
git add src/components/grid/StarNode.ts src/components/grid/__tests__/StarNode.test.ts
git commit -m "feat(grid): replace circle+text star nodes with faction line-art glyphs"
```

---

## Task 4: Update ConnectionLine — Thinner with Gradient Fade

**Files:**
- Modify: `src/components/grid/ConnectionLine.ts`

### Step 1: Write the implementation

Replace the entire contents of `src/components/grid/ConnectionLine.ts` with:

```typescript
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
  _bold: boolean = false,  // kept for API compat, no longer used
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
```

### Step 2: Commit

```bash
git add src/components/grid/ConnectionLine.ts
git commit -m "feat(grid): thinner connection lines (1px) with gradient alpha fade"
```

---

## Task 5: Update GridBackground — Deeper Black + Dimmer Grid Lines

**Files:**
- Modify: `src/components/grid/GridBackground.ts`

### Step 1: Write the implementation

In `src/components/grid/GridBackground.ts`, change the `createGridBackground` function.

**Change line 12-13** (the color constants):

```typescript
// OLD:
  const lineColor = 0xffffff;
  const lineAlpha = 0.03;

// NEW:
  const lineColor = 0x667788;
  const lineAlpha = 0.06;
```

This gives a slightly blue-tinted, very dim grid line that works with the nebula. The overall opacity is similar but the hue blends better with space.

### Step 2: Commit

```bash
git add src/components/grid/GridBackground.ts
git commit -m "fix(grid): dimmer blue-tinted grid lines for deep space atmosphere"
```

---

## Task 6: Update GalaxyGrid — Remove Minigrid, Skip Origin Connections, Wire Nebula

This is the main orchestration task. It modifies `GalaxyGrid.tsx` to:
1. Remove MinigridLayer import, ref, and render effect
2. Add NebulaBg as the first world layer
3. Update layer indices (no more minigrid at index 2)
4. Skip connections to/from origin node at (0,0)
5. Pass `userFaction` to `createStarNode`
6. Change `app.init` background color to `0x060610`

**Files:**
- Modify: `src/components/GalaxyGrid.tsx`

### Step 1: Apply all changes

**Change 1 — Imports (lines 1-13):**

Remove the `MinigridLayer` import line and add `NebulaBg`:

```typescript
// REMOVE this line:
import { MinigridLayer, type MacroCellRenderData } from '@/components/game/MinigridLayer';

// ADD this line (after the ConnectionLine import):
import { createNebulaBg } from './grid/NebulaBg';
```

**Change 2 — Remove minigridRef (line 40):**

```typescript
// REMOVE this line:
  const minigridRef = useRef<MinigridLayer | null>(null);
```

**Change 3 — Change background color (line 62):**

```typescript
// OLD:
      background: 0x0a0a0f,

// NEW:
      background: 0x060610,
```

**Change 4 — Replace minigrid setup with nebula (lines 76-86):**

Replace the faction background + grid background + minigrid setup block with:

```typescript
    // Layer 0: Nebula background (soft faction-colored zones + star dust)
    world.addChild(createNebulaBg());

    // Layer 1: Faction background (hidden until formally introduced)
    const factionBg = createFactionBackground(GRID_EXTENT, GRID_EXTENT, userFactionRef.current);
    factionBg.visible = false;
    world.addChild(factionBg);

    // Layer 2: Grid lines
    world.addChild(createGridBackground(GRID_EXTENT, GRID_EXTENT));
```

**Change 5 — Update child cleanup index (line 202-203):**

```typescript
// OLD:
    // Clear previous star nodes (keep faction bg at 0, grid lines at 1, minigrid at 2)
    while (world.children.length > 3) {
      world.removeChildAt(3);
    }

// NEW:
    // Clear previous star nodes (keep nebula at 0, faction bg at 1, grid lines at 2)
    while (world.children.length > 3) {
      world.removeChildAt(3);
    }
```

(Same code, just updated comment. The count stays 3 because we swapped minigrid for nebula.)

**Change 6 — Skip origin connections (lines 229-243, the network overview connection loop):**

Add an origin-skip check inside the inner loop:

```typescript
      for (let j = i + 1; j < agentList.length; j++) {
          const a = agentList[i];
          const b = agentList[j];
          // Skip connections to/from the origin singularity node at (0,0)
          if ((a.position.x === 0 && a.position.y === 0) ||
              (b.position.x === 0 && b.position.y === 0)) continue;
          if (getDistance(a.position, b.position) > CELL_SIZE + 1) continue;
```

**Change 7 — Pass userFaction to createStarNode (lines 248-250, 274, 279):**

In the network overview section:
```typescript
// OLD:
        addClickableStarNode(agent, fogLevel);
// NEW:
        addClickableStarNode(agent, fogLevel, userFactionRef.current);
```

Update the `addClickableStarNode` helper to accept and forward userFaction:

```typescript
// OLD:
    const addClickableStarNode = (agent: Agent, fogLevel: FogLevel) => {
      const node = createStarNode(agent, fogLevel);

// NEW:
    const addClickableStarNode = (agent: Agent, fogLevel: FogLevel, faction?: Faction) => {
      const node = createStarNode(agent, fogLevel, faction ?? userFactionRef.current);
```

Add the Faction type import at the top:

```typescript
import { classifyCell, FACTION_COLORS, type Faction } from '@/lib/spiral/SpiralClassifier';
```

(Note: `FACTION_COLORS` may already be imported. `Faction` type needs to be added.)

**Change 8 — Also pass to viewer section (line 274):**

```typescript
// OLD:
    addClickableStarNode(viewer, 'clear');
// NEW:
    addClickableStarNode(viewer, 'clear', userFactionRef.current);
```

**Change 9 — Also pass in the others loop (line 279):**

```typescript
// OLD:
        addClickableStarNode(agent, cls.fogLevel);
// NEW:
        addClickableStarNode(agent, cls.fogLevel, userFactionRef.current);
```

**Change 10 — Update borders index (line 258):**

```typescript
// OLD:
    world.addChildAt(borders, 3); // index 3 = right after faction bg (0), grid lines (1), minigrid (2)
// NEW:
    world.addChildAt(borders, 3); // index 3 = right after nebula (0), faction bg (1), grid lines (2)
```

**Change 11 — Update faction background index (line 310):**

In the `userFaction` effect that replaces index 0 — this needs to become index 1 since nebula is now at 0:

```typescript
// OLD:
    if (world.children.length > 0) {
      world.removeChildAt(0);
      const newFactionBg = createFactionBackground(GRID_EXTENT, GRID_EXTENT, userFaction);
      newFactionBg.visible = false;
      world.addChildAt(newFactionBg, 0);
    }

// NEW:
    if (world.children.length > 1) {
      world.removeChildAt(1);
      const newFactionBg = createFactionBackground(GRID_EXTENT, GRID_EXTENT, userFaction);
      newFactionBg.visible = false;
      world.addChildAt(newFactionBg, 1);
    }
```

**Change 12 — Remove the entire minigrid zoom effect (lines 333-387):**

Delete the entire `useEffect` block that starts with `// Update minigrid layer when zoom changes`.

**Change 13 — Remove `classifyCell` import from the minigrid sections:**

After removing the minigrid zoom effect, the `classifyCell` function is still used in the connection code (via `classifyAgentCell`). Verify this import remains at the top:

```typescript
import { classifyCell, FACTION_COLORS, type Faction } from '@/lib/spiral/SpiralClassifier';
```

And remove the `MacroCellRenderData` import if it was used only for minigrid.

### Step 2: Verify the app compiles

```bash
cd . && npx next build 2>&1 | head -30
```

Or just check the dev server at `http://localhost:8080/game` for errors.

### Step 3: Run all existing tests

```bash
npx vitest run
```

Expected: All tests pass. If any test imports `MinigridLayer` from `GalaxyGrid`, it needs updating.

### Step 4: Commit

```bash
git add src/components/GalaxyGrid.tsx
git commit -m "feat(grid): deep space atmosphere — nebula bg, faction glyphs, origin isolation, no minigrid"
```

---

## Task 7: Visual Verification

**No code changes.** Open `http://localhost:8080/game` in the browser and verify:

1. Origin node at (0,0) shows concentric rings glyph, white-gold, no connection lines
2. Faction master nodes show their unique line-art glyphs
3. Unclaimed nodes show dashed circles, dim gray
4. No wallet hash labels anywhere
5. No subgrid cells visible at any zoom level
6. Nebula color zones visible as faint colored hazes behind the grid
7. Star dust particles scattered in background
8. Grid lines very dim (barely perceptible)
9. Connection lines thin (1px) with gradient fade
10. Pan, zoom, click-to-select, hover-dim all still work

Take a screenshot and compare against the previous state (`.playwright-mcp/game-ui-live.png`).

```bash
# No commit needed — this is verification only
```

---

## Summary of Commits

| # | Message | Files |
|---|---------|-------|
| 1 | `feat(grid): add FactionGlyphs module` | FactionGlyphs.ts, test |
| 2 | `feat(grid): add NebulaBg` | NebulaBg.ts |
| 3 | `feat(grid): replace circle+text with faction glyphs` | StarNode.ts, test |
| 4 | `feat(grid): thinner connection lines with gradient fade` | ConnectionLine.ts |
| 5 | `fix(grid): dimmer grid lines for deep space` | GridBackground.ts |
| 6 | `feat(grid): nebula bg, faction glyphs, origin isolation, no minigrid` | GalaxyGrid.tsx |
