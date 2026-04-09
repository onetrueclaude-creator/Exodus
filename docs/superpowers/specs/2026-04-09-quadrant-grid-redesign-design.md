# Quadrant Grid Redesign — Design Spec

> **Date:** 2026-04-09
> **Status:** Approved
> **Scope:** Replace spiral arm grid with quadrant-based grid. Nodes snap to cell centers, factions occupy 90-degree quadrants, ring expansion grows with mining.

---

## Context

The current Neural Lattice uses a logarithmic spiral (`spiral.ts`) to place faction arm nodes. This produces twisting arms where nodes land between grid squares, creating visual confusion. The redesign replaces this with a clean quadrant grid where every node sits exactly on a grid cell center.

---

## Architecture

### Grid Structure

- **Origin:** `(0, 0)` — the center of the grid
- **Cell coordinates:** Integer `(cx, cy)` pairs. Cell `(-1, -1)` is the NW genesis cell.
- **Pixel mapping:** `px = cx * CELL_SIZE`, `py = cy * CELL_SIZE` (origin at canvas center)
- **CELL_SIZE:** 64px (unchanged from current)

### Quadrant Faction Assignment

Factions own 90-degree quadrants. The origin `(0, 0)` is a point, not a cell — it is the touching center where all 4 factions meet. No cell exists at `(0, 0)`.

| Quadrant | Faction | Cell Range | Genesis Cell | Color |
|----------|---------|------------|-------------|-------|
| NW | Community | `cx <= -1, cy <= -1` | `(-1, -1)` | Teal `#0D9488` |
| NE | Machines (treasury) | `cx >= 1, cy <= -1` | `(1, -1)` | Pink `#DC2680` |
| SE | Founders | `cx >= 1, cy >= 1` | `(1, 1)` | Amber `#F59E0B` |
| SW | Professional | `cx <= -1, cy >= 1` | `(-1, 1)` | Blue `#3B82F6` |

Note: Y-axis is screen-space (positive = down), so `cy <= -1` = top of screen. Cells on the axes (`cx = 0` or `cy = 0`) do not exist — the axes are faction boundaries, not territory.

### Ring Expansion (Chebyshev)

The grid grows outward as blocks are mined. Ring 0 is the origin point (no cells). The first block creates Ring 1.

- **Ring 0:** The origin point `(0, 0)`. No cells. Just the center marker.
- **Ring 1 (genesis block):** 4 cells — one genesis cell per quadrant: `(-1,-1)`, `(1,-1)`, `(1,1)`, `(-1,1)`
- **Ring N (block N):** Each quadrant gains a Chebyshev ring of new cells. Ring N adds `2N - 1` cells per quadrant.
- **Cell count per quadrant at ring N:** `N^2`
- **Total cells at ring N:** `4 * N^2`

### Quadrant Cell Generation

For each quadrant, Ring 1 is the genesis cell (the cell closest to origin within that quadrant). Subsequent rings expand outward from that genesis cell, staying within the quadrant boundary.

**NW quadrant example:**
- Ring 1: `(-1, -1)` — 1 cell (genesis)
- Ring 2: `(-2,-2), (-1,-2), (-2,-1)` — 3 new cells (total 4)
- Ring 3: `(-3,-3), (-2,-3), (-1,-3), (-3,-2), (-3,-1)` — 5 new cells (total 9)

Each ring adds a border of cells on the two outward-facing edges of the quadrant.

---

## Node Types

### Homenode
- One per player
- Auto-assigned on registration: nearest unclaimed cell to origin within the player's faction quadrant
- Can be teleported to any empty cell in the same quadrant (costs AGNTC)
- Runs the player's primary agent (any tier: Haiku/Sonnet/Opus)

### Subnode
- Claimed on empty cells **adjacent** to the player's homenode or existing subnodes
- Runs sub-agents (Haiku or Sonnet, deployed from homenode terminal)
- Cannot be used as homenode placement by other players — only unclaimed cells can become homenodes
- Adjacency: 8-connected (includes diagonals)

### Empty Cell
- Belongs to a faction quadrant but has no owner
- Available for homenode placement (new players or teleport) or subnode claiming
- Has a `density` value based on distance from origin (closer = higher)

---

## Tall vs Wide Strategy

**Tall (stay near origin):**
- High density cells → rich mining rewards
- Crowded area → surrounding cells occupied by other players' homenodes
- No empty adjacent cells → cannot deploy subnodes
- Single-agent play, maximized per-node output

**Wide (teleport to frontier):**
- Pay AGNTC to teleport homenode to an empty frontier cell
- Lower density → lower per-node mining rewards
- Empty surrounding cells → can claim subnodes for sub-agents
- Multi-agent empire, distributed output

This creates a Stellaris/Civilization-style tradeoff between tall (intensive) and wide (expansive) play.

---

## Density Model

Cell density determines mining reward multiplier:

```
density(cx, cy) = 1.0 / (1 + distance_from_origin * DECAY_FACTOR)
```

Where `distance_from_origin = sqrt(cx^2 + cy^2)` and `DECAY_FACTOR` is tunable (current value from chain: varies by coordinate).

The chain API's existing `resource_density(x, y)` function in `agentic/lattice/coordinate.py` computes this. The frontend uses it for display; the chain is authoritative.

---

## What Changes

### Files to Replace

| File | Current | New |
|------|---------|-----|
| `src/lib/spiral.ts` | Spiral arm formula, twist, polar coords | **Delete entirely** |
| `src/lib/lattice.ts` | `getArmCell()` → spiral placement | Quadrant cell generation, Chebyshev rings |
| `src/types/grid.ts` | `BlockNode` with `ringIndex`, spiral references | Simplified: `cx, cy, faction` from quadrant |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/LatticeGrid.tsx` | Remove spiral rendering, draw quadrant grid cells, snap nodes to cell centers |
| `src/store/gameStore.ts` | `initLattice`, `addBlocknodesForBlock` use new quadrant logic |
| `src/app/game/page.tsx` | `claimBlocknode` / `getFrontierBlocknode` use quadrant placement |

### Files Unchanged

- `src/services/testnetApi.ts` — chain API is unchanged
- `src/components/AgentChat.tsx` — terminal commands unchanged
- `src/components/ResourceBar.tsx` — reads from store, unchanged
- `src/components/TimechainStats.tsx` — reads from store, unchanged
- `src/components/AccountView.tsx` — reads from store, unchanged

---

## Rendering

### Grid Background
- Draw visible quadrant cells as squares with faction-tinted fill (very low opacity: 0.03-0.05)
- Quadrant divider lines (dashed) along x=0 and y=0 axes — these are boundaries, not cells
- Origin `(0,0)` rendered as a small marker point (white dot), not a cell
- Cells closer to origin have slightly brighter tint

### Node Rendering
- **Homenode (owned by current player):** Solid fill, faction color, white border, slightly larger
- **Homenode (other player):** Solid fill, faction color, normal size
- **Subnode (owned):** Green fill, smaller
- **Empty cell:** Outlined with faction color, dashed border, very low opacity
- **All nodes:** Centered on cell `(cx * CELL_SIZE, cy * CELL_SIZE)`

### No Connection Lines
- Remove the arm connection lines between nodes entirely
- Nodes stand alone on their grid cells

---

## Teleport Mechanic

- Available from Agent Terminal: new menu option "Teleport Homenode"
- Costs AGNTC (fixed: same as `BASE_CLAIM_COST` = 100 AGNTC)
- Player picks an empty cell in their quadrant from a list or by clicking the grid
- Homenode moves, all subnodes are released (returned to unclaimed)
- This is a major strategic decision — losing subnodes is the tradeoff for repositioning

---

## Verification

1. **Visual:** Grid cells render as squares, nodes centered, no off-grid placement
2. **Quadrant:** Each faction's cells stay within their 90-degree quadrant
3. **Ring growth:** Mining a block adds one Chebyshev ring to each quadrant
4. **Homenode:** New player gets nearest-to-origin unclaimed cell
5. **Subnodes:** Can only claim adjacent empty cells, not cells with homenodes
6. **Tests:** All existing grid-related tests updated, new tests for quadrant logic
