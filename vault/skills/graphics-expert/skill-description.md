# Graphics Expert — Deep Reference

## Purpose

Procedural guide for designing SVG graphics, token logos, network diagrams, and brand assets for the ZK Agentic Network. Captures the design language, color systems, SVG techniques, and export workflows discovered through iterative design sessions.

## Design Language — ZK Agentic Network

### Core Visual Identity

The brand uses a **hub-and-spoke network graph** as its primary visual motif:
- **Center node** (Origin): Largest, cyan gradient, represents the network core
- **Outer nodes** (Factions): Smaller, faction-colored, positioned at cardinal points or organic positions
- **Connections**: Curved Bézier or straight lines linking center to outer nodes and outer nodes to each other
- **ZK hidden channels**: Dashed cross-connections in purple, representing zero-knowledge private links

### Color Palette

```
Primary Accents:
  Cyan:         #00D4FF (main accent)
  Purple:       #8B5CF6 (secondary accent)
  Bright Cyan:  #67FFFF (node highlights)
  Light Purple: #A78BFA (node highlights)

Faction Colors:
  Community:    #e2e8f0 (white/silver — universal)
  Machines:     #d97706 (gold — tech/structure)
  Founders:     #ef4444 (crimson — foundation)
  Professional: #00d4ff (cyan — precision)
  Origin:       #67FFFF → #00D4FF (center gradient)

Backgrounds:
  Dark base:    #0A0A0F (coin disc, card backgrounds)
  Grid dark:    #060610 (galaxy grid background)

Gradient Stops (connections):
  Start:  #00D4FF at 0.6–0.7 opacity
  End:    #8B5CF6 at 0.4–0.55 opacity
```

### Node Design Rules

1. **Radial gradient** on all nodes — highlight at 40%/35% offset for 3D "lit from top-left" effect
2. **Center node** always largest (r=14–22 depending on canvas size), with white inner circle at 15–20% opacity
3. **Outer nodes** smaller (r=10–17), faction-colored, slightly varying sizes for organic feel
4. **Glow filter** on all nodes: `feGaussianBlur stdDeviation="3-6"` + `feComposite over`

### Connection Design Rules

1. **Double-stroke technique** for depth: wide faint stroke (opacity 0.08–0.15) behind narrow bright stroke
2. **Radial connections** (center→outer): 2.5–3.5px, gradient colored
3. **Perimeter connections** (outer→outer adjacent): 1.8–3px, lighter gradient
4. **ZK dashed cross-connections**: 1–1.5px, `stroke-dasharray="6 8"` or `"8 12"`, purple, opacity 0.15–0.25
5. **Bézier curves** (organic style) or **straight lines** (clean style) — never mix in same design

### SVG Filters

```xml
<!-- Organic brush texture (hand-drawn feel) -->
<filter id="brush" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="turbulence" baseFrequency="0.008-0.02" numOctaves="3-4" seed="7"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5-2.2"/>
</filter>

<!-- Node glow -->
<filter id="glow">
  <feGaussianBlur stdDeviation="3-6"/>
  <feComposite in="blur" in2="SourceGraphic" operator="over"/>
</filter>

<!-- Background grain (for avatar/social assets) -->
<filter id="bg-grain">
  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
  <feBlend in="SourceGraphic" in2="bw" mode="soft-light"/>
</filter>
```

### Coin/Token Logo Structure

Token logos follow a specific layered structure:

```
Layer 1: Coin disc (circle, #0A0A0F fill)
Layer 2: Ring borders (2 concentric, gradient stroke, 2.5px outer + 0.8px inner)
Layer 3: Connections (perimeter + radial + ZK dashed)
Layer 4: Nodes (with glow filter)
```

## Design Procedure — Step by Step

### Step 1: Study Existing Brand Assets

Before creating any graphic:
1. Fetch and read all SVGs from `https://zkagentic.ai/logos/` (icon.svg, logo-mini.svg, logo-full.svg)
2. Check `public/logos/` in the repo for any existing assets
3. Note the exact gradient definitions, filter parameters, and node positions
4. Identify which variant to build on (icon=5-node, mini=3-node, ticker=coin format)

### Step 2: Choose Layout Pattern

| Layout | When to Use | Node Count |
|--------|-------------|------------|
| Diamond/Square | Token logos, symmetric branding | 4 outer + 1 center |
| Pentagon | Original icon style, feature graphics | 5 outer + 1 center |
| Triangle | Small/mini icons (64px and below) | 3 outer + 1 center |
| Single | Favicons (16px) | 1 center only |

### Step 3: Define the Canvas

```xml
<!-- Token logo (square, dark disc) -->
<svg viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="250" fill="#0A0A0F"/>
  <circle cx="256" cy="256" r="242" stroke="url(#ring)" stroke-width="2.5" fill="none"/>

<!-- Icon/avatar (square, rounded rect) -->
<svg viewBox="0 0 400 400" width="400" height="400">
  <rect width="400" height="400" rx="32" fill="#0A0A0F"/>

<!-- Website icon (transparent bg) -->
<svg viewBox="0 0 200 200" width="200" height="200">
  <!-- No background — transparent -->
```

### Step 4: Position Nodes

For the 4-faction square layout (AGNTC coin standard):

```
Canvas: 512x512, center at (256, 256)

Center:  (256, 256)  — r=18-22
Top:     (256, 80)   — Community (white)
Right:   (432, 256)  — Machines (gold)
Bottom:  (256, 432)  — Founders (red)
Left:    (80, 256)   — Professional (cyan)
```

Scaling rules:
- Node distance from center ≈ 68% of disc radius
- Outer node radius ≈ 65-78% of center node radius
- Connection stroke width scales with canvas: 512px=2.5px, 200px=2px, 64px=1.8px

### Step 5: Draw Connections

Order matters — draw connections BEFORE nodes so nodes overlap line endpoints.

1. Draw perimeter connections (adjacent outer nodes)
2. Draw ZK dashed cross-connections
3. Draw radial spokes (center to each outer)
4. Apply brush filter to connection group (if organic style)

### Step 6: Draw Nodes

Apply glow filter to node group. Draw center node first (it's behind outer nodes visually but drawn first in the group since glow makes ordering less critical).

### Step 7: Export Sizes

Required sizes for different contexts:

```
Solana Token Metadata:
  512x512 PNG — primary token icon (uploaded to Arweave/IPFS)
  256x256 PNG — fallback

Website:
  favicon.ico  — 16x16, 32x32, 48x48 (multi-size ICO)
  icon.svg     — scalable browser icon (64x64 viewBox)
  apple-touch-icon.png — 180x180
  og-image.png — 1200x630 (with text + network graphic)

Social/Exchange:
  avatar.svg/png — 400x400 (with dark rounded-rect background + grain)
  banner.png     — 1500x500 (Twitter/X header)
```

SVGs are resolution-independent. For PNG export, render at 2x for retina.

## Design Variations

### Style A: Clean/Geometric
- Straight `<line>` elements
- No brush filter
- Precise symmetry
- Best for: small sizes, favicons, exchange listings

### Style B: Organic/Hand-drawn
- Bézier `<path>` elements with `Q` (quadratic) curves
- Brush turbulence filter applied
- Slightly asymmetric node positions
- Best for: hero graphics, large displays, website icon

### Style C: Faction-Emphasized
- Each spoke glows its faction color (not uniform gradient)
- Faction glow halos behind nodes
- Perimeter connections are neutral gray
- Best for: faction-focused marketing, in-game UI

## Anti-Patterns

- **Never use emoji or raster textures** in SVG logos
- **Never mix curve and straight line styles** in the same design
- **Never make all nodes the same size** — center must be larger
- **Never omit the ZK dashed connections** — they're a brand signature
- **Never use more than 2 ring borders** on coin disc — keep it clean
- **Never place text inside the network graphic** — text goes outside (like logo-full.svg)
- **Avoid oversaturated colors** — the palette is deliberately muted/spacey
- **Avoid sharp corners on connection endpoints** — always use `stroke-linecap="round"`

## Iteration Process

When the user provides visual feedback:
1. **"doesn't look good"** → ask what specifically (shape? color? layout? size?)
2. **"too complex"** → reduce: remove inner diamond, reduce node count, simplify connections
3. **"too simple"** → add: brush filter, double-stroke technique, more connections
4. **"wrong colors"** → check faction color reference above
5. Always create a new file (don't overwrite) so variants can be compared side-by-side
