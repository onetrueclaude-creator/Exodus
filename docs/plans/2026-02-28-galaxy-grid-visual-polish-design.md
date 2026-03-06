# Galaxy Grid Visual Polish — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform the galaxy grid from a flat prototype into a deep-space atmosphere with distinctive faction glyphs, clean connections, and proper origin node isolation.

**Architecture:** All changes stay within the existing PixiJS 8 + React component structure. No new dependencies. Changes touch `GalaxyGrid.tsx`, `StarNode.ts`, `ConnectionLine.ts`, `GridBackground.ts`, and add a new `FactionGlyphs.ts` module.

**Tech Stack:** PixiJS 8 (Graphics API for vector glyphs, Sprite for nebula), TypeScript, React 19

---

## 1. Structural Fixes

### 1.1 Origin Node Isolation

The origin at (0,0) is the "singularity" — immutable, never claimable, faction-neutral.

**Changes:**
- In the connection-drawing loop (GalaxyGrid.tsx lines 229–243), skip any pair where either node is at position (0,0)
- Origin gets a unique visual treatment (see Section 2) distinct from all faction nodes
- Origin node is non-interactive (no click-to-select, no hover-dim)

### 1.2 Remove MinigridLayer from Galaxy Grid

Subgrids are a per-node management UI, not a galaxy overview concern. They will be managed in a separate tab.

**Changes:**
- Remove `MinigridLayer` import and instantiation from `GalaxyGrid.tsx`
- Remove `minigridRef` and the zoom-based render effect (lines 333–387)
- Remove the minigrid display object from the world container
- World layer stack simplifies to: `[background, grid_lines, connections+nodes]`
- The `MinigridLayer` component file is NOT deleted — it will be reused in the subgrid management tab later

### 1.3 Remove Wallet Hash Labels

Currently `createStarNode` renders truncated wallet IDs as text labels below nodes.

**Changes:**
- Remove all text rendering from `createStarNode`
- Node identity conveyed purely through faction glyph shape + color (see Section 2)
- Coordinate/faction info appears on hover via a tooltip overlay (HTML, not PixiJS) — future scope, not this design

---

## 2. Faction Icon System — Abstract Line-Art Glyphs

All faction icons are **thin-stroke line art** (1–2px) rendered with PixiJS Graphics. No solid fills. Each glyph sits atop a soft radial glow circle in the faction color.

### 2.1 Glyph Designs

**Origin / Singularity** (0,0)
- **Glyph:** 3 concentric circles (radii 6/10/14px) with decreasing stroke alpha (1.0/0.6/0.3) + bright center dot (radius 2px, filled)
- **Color:** White (#E2E8F0) core, gold (#D97706) outer rings
- **Animation:** Outer ring pulses alpha 0.2↔0.4 on a 3-second sine cycle
- **Size:** 28px bounding box
- **Glow:** White-gold radial gradient, radius 42px, alpha 0.15

**Community** (N arm — faction master at 0,+10)
- **Glyph:** 3 dots (radius 1.5px) connected by thin lines forming an open triangle — a minimal network/graph motif
- **Color:** Teal (#0D9488) stroke
- **Size:** 22px master, 16px player nodes (scaled proportionally)
- **Glow:** Teal radial, radius 33px, alpha 0.12

**Machines** (E arm — faction master at +10,0)
- **Glyph:** Angle bracket pair `⟨ ⟩` with a horizontal line through center — processor register motif
- **Color:** Reddish purple (#DC2680) stroke
- **Size:** 22px / 16px
- **Glow:** Reddish purple radial, radius 33px, alpha 0.12

**Founders** (S arm — faction master at 0,−10)
- **Glyph:** Vertical line with two angled lines branching from the base — root/tree fork, foundation motif
- **Color:** Gold-orange (#F59E0B) stroke
- **Size:** 22px / 16px
- **Glow:** Gold-orange radial, radius 33px, alpha 0.12

**Professional** (W arm — faction master at −10,0)
- **Glyph:** Two parallel vertical bars with a diagonal slash — hash/rate symbol motif
- **Color:** Blue (#3B82F6) stroke
- **Size:** 22px / 16px
- **Glow:** Blue radial, radius 33px, alpha 0.12

**Unclaimed** (diagonal homenodes)
- **Glyph:** Single thin ring, dashed stroke (4px dash, 4px gap)
- **Color:** Dim gray (#475569) stroke
- **Size:** 14px
- **Glow:** None

### 2.2 Rendering Approach

New file: `src/components/grid/FactionGlyphs.ts`

```typescript
type FactionId = 'origin' | 'community' | 'machines' | 'founders' | 'professional' | 'unclaimed';

interface GlyphConfig {
  faction: FactionId;
  size: number;        // bounding box px
  strokeColor: number; // hex
  glowColor: number;   // hex
  glowRadius: number;
  glowAlpha: number;
}

function createFactionGlyph(config: GlyphConfig): Container;
function drawOriginGlyph(g: Graphics, size: number): void;
function drawCommunityGlyph(g: Graphics, size: number): void;
function drawMachinesGlyph(g: Graphics, size: number): void;
function drawFoundersGlyph(g: Graphics, size: number): void;
function drawProfessionalGlyph(g: Graphics, size: number): void;
function drawUnclaimedGlyph(g: Graphics, size: number): void;
```

Each `draw*Glyph` function receives a Graphics object and draws relative to (0,0) center. The `createFactionGlyph` wrapper adds the glow circle behind and returns a Container with both.

### 2.3 Zoom-Adaptive Detail

- **Zoom < 0.5x:** Glyphs collapse to simple filled circles (3px) + glow only. Shape detail invisible at this scale.
- **Zoom 0.5x–2x:** Full glyph line art visible.
- **Zoom > 2x:** Same as above (no extra detail needed — glyphs are already vector-crisp).

---

## 3. Deep Space Atmosphere

### 3.1 Nebula Background

Replace the flat dark background with a layered nebula effect:

- **Layer 0 (base):** Solid fill #060610 (deeper than current #0A0A0F)
- **Layer 1 (nebula):** 4–6 large semi-transparent radial gradient circles, positioned in each faction's quadrant, using the faction's color at very low alpha (0.03–0.06). These create subtle colored zones without hard boundaries.
  - NW quadrant: amber haze (Community)
  - NE quadrant: gold haze (Machines)
  - SE quadrant: red haze (Founders)
  - SW quadrant: cyan haze (Professional)
  - Center: white-gold haze (Origin influence)
- **Layer 2 (dust):** 80–120 tiny dots (1–2px) scattered randomly with varying alpha (0.1–0.4). Static — no animation. Seed with deterministic RNG so they don't shift between renders.

**Implementation:** All drawn with PixiJS Graphics (circles with gradient-like concentric fills at decreasing alpha). No external textures or images needed.

### 3.2 Grid Lines

- **Current:** Visible grid at #1E293B
- **New:** Much dimmer at #0D1117 (barely perceptible), alpha 0.3
- Grid provides spatial reference without competing with nebula atmosphere
- At zoom < 0.3x, grid lines hidden entirely (too dense to be useful)

---

## 4. Connection Line Rework

### 4.1 Rules

- **No connections to/from origin (0,0)** — singularity is isolated
- **Same-faction connections only** — cross-faction lines removed entirely
- **Distance threshold stays** at `CELL_SIZE + 1` (adjacent cells only)

### 4.2 Visual Style

- **Width:** 1px (down from current variable width)
- **Color:** Faction color at alpha 0.4 (not full brightness)
- **Gradient fade:** Alpha tapers from 0.4 at each node to 0.15 at midpoint — lines look like they emerge from the nodes and dissolve into space
- **No animation** for now (keep it clean; pulse animation is future scope)

---

## 5. Color Palette Update

| Element | Current | New | Why |
|---------|---------|-----|-----|
| Background | #0A0A0F | #060610 | Deeper black for nebula contrast |
| Grid lines | #1E293B | #0D1117 @ 0.3 alpha | Recede behind nebula |
| Community | #F59E0B | #0D9488 | Teal |
| Machines | #D97706 | #DC2680 | Reddish purple/vermillion |
| Founders | #EF4444 | #F59E0B | Gold-orange |
| Professional | #00D4FF | #3B82F6 | Blue |
| Unclaimed | #475569 | #334155 | Slightly dimmer |
| Origin | N/A | #CBD5E1 | Grayish white |

---

## 6. Files Affected

| File | Action | What Changes |
|------|--------|-------------|
| `src/components/grid/FactionGlyphs.ts` | **Create** | All 6 glyph draw functions + glow wrapper |
| `src/components/grid/StarNode.ts` | **Modify** | Replace circle+text with faction glyph calls |
| `src/components/grid/GridBackground.ts` | **Modify** | Deeper background, dimmer grid lines |
| `src/components/grid/NebulaBg.ts` | **Create** | Nebula gradient layers + star dust |
| `src/components/grid/ConnectionLine.ts` | **Modify** | Thinner lines, gradient fade, alpha 0.4 |
| `src/components/GalaxyGrid.tsx` | **Modify** | Remove MinigridLayer, skip origin connections, wire nebula bg, remove hash labels |

---

## 7. What This Does NOT Include

- Spiral arm rendering (Phase 2)
- Fog-of-war tinting (Phase 2)
- Hover tooltips with node info (future)
- Connection pulse animations (future)
- Subgrid management tab (separate design)
- Sound effects or music

---

## 8. Success Criteria

- Origin node visually distinct and isolated — no faction connections
- Each faction recognizable by glyph shape alone (no color needed for identification)
- Grid feels like deep space, not a spreadsheet
- No wallet hashes visible anywhere
- No subgrid cells rendered on the galaxy view
- Zoom in/out feels smooth with adaptive glyph detail
- All existing interactions preserved (pan, zoom, click-to-select, hover-dim)
