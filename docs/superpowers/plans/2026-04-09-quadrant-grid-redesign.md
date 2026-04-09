# Quadrant Grid Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the spiral arm grid with a clean quadrant grid where nodes snap to cell centers, factions occupy 90-degree quadrants, and the grid grows via Chebyshev ring expansion.

**Architecture:** Delete `spiral.ts` entirely. Rewrite `lattice.ts` with quadrant-based cell generation using Chebyshev rings. Update `LatticeGrid.tsx` rendering to draw cells as squares on a grid. Cell IDs use `"cell-{cx}-{cy}"` format. Origin `(0,0)` is a point (not a cell) — the meeting center of all 4 factions. Ring 0 has no cells; Ring 1 (genesis) creates 4 cells.

**Tech Stack:** TypeScript, PixiJS 8 (Graphics/Container), Zustand 5, Vitest

**Design Spec:** `docs/superpowers/specs/2026-04-09-quadrant-grid-redesign-design.md`

---

### Task 1: Rewrite `lattice.ts` — Quadrant Cell Generation

**Files:**
- Rewrite: `apps/game/src/lib/lattice.ts`
- Delete: `apps/game/src/lib/spiral.ts`
- Create: `apps/game/src/__tests__/lattice.test.ts` (replace `spiral.test.ts`)
- Delete: `apps/game/src/__tests__/spiral.test.ts`

- [ ] **Step 1: Write the failing test for quadrant cell generation**

Create `apps/game/src/__tests__/lattice.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  CELL_SIZE,
  cellToPixel,
  getFactionForCell,
  getCellsForRing,
  buildAllCells,
  buildCellsForRing,
  getCellDensity,
  getFrontierCell,
  FACTIONS,
} from "@/lib/lattice";
import type { FactionId } from "@/types";

describe("getFactionForCell", () => {
  it("(-1,-1) is community (NW)", () => {
    expect(getFactionForCell(-1, -1)).toBe("community");
  });
  it("(1,-1) is treasury (NE)", () => {
    expect(getFactionForCell(1, -1)).toBe("treasury");
  });
  it("(1,1) is founder (SE)", () => {
    expect(getFactionForCell(1, 1)).toBe("founder");
  });
  it("(-1,1) is pro-max (SW)", () => {
    expect(getFactionForCell(-1, 1)).toBe("pro-max");
  });
  it("(0,0) returns null (origin is a point, not a cell)", () => {
    expect(getFactionForCell(0, 0)).toBeNull();
  });
  it("cells on axes return null (boundaries)", () => {
    expect(getFactionForCell(0, -3)).toBeNull();
    expect(getFactionForCell(3, 0)).toBeNull();
    expect(getFactionForCell(0, 2)).toBeNull();
    expect(getFactionForCell(-2, 0)).toBeNull();
  });
  it("(-5, -3) is community (NW)", () => {
    expect(getFactionForCell(-5, -3)).toBe("community");
  });
  it("(2, 4) is founder (SE)", () => {
    expect(getFactionForCell(2, 4)).toBe("founder");
  });
});

describe("getCellsForRing", () => {
  it("ring 0 returns empty (origin point, no cells)", () => {
    expect(getCellsForRing(0)).toEqual([]);
  });

  it("ring 1 returns 4 genesis cells", () => {
    const cells = getCellsForRing(1);
    expect(cells).toHaveLength(4);
    const coords = cells.map((c) => `${c.cx},${c.cy}`).sort();
    expect(coords).toEqual(["-1,-1", "-1,1", "1,-1", "1,1"]);
  });

  it("ring 2 returns 12 new cells (3 per quadrant)", () => {
    const cells = getCellsForRing(2);
    expect(cells).toHaveLength(12);
    // NW quadrant should have: (-2,-2), (-1,-2), (-2,-1)
    const nw = cells.filter((c) => c.cx < 0 && c.cy < 0);
    expect(nw).toHaveLength(3);
  });

  it("ring 3 returns 20 new cells (5 per quadrant)", () => {
    const cells = getCellsForRing(3);
    expect(cells).toHaveLength(20);
  });

  it("all cells in a ring have correct faction assignment", () => {
    const cells = getCellsForRing(2);
    for (const cell of cells) {
      expect(cell.faction).toBe(getFactionForCell(cell.cx, cell.cy));
    }
  });
});

describe("buildAllCells", () => {
  it("totalRings=0 returns empty", () => {
    expect(Object.keys(buildAllCells(0))).toHaveLength(0);
  });

  it("totalRings=1 returns 4 cells (genesis)", () => {
    const cells = buildAllCells(1);
    expect(Object.keys(cells)).toHaveLength(4);
  });

  it("totalRings=2 returns 16 cells (4 + 12)", () => {
    const cells = buildAllCells(2);
    expect(Object.keys(cells)).toHaveLength(16);
  });

  it("totalRings=3 returns 36 cells (4 + 12 + 20)", () => {
    const cells = buildAllCells(3);
    expect(Object.keys(cells)).toHaveLength(36);
  });

  it("cell IDs use cell-{cx}-{cy} format", () => {
    const cells = buildAllCells(1);
    expect(cells["cell--1--1"]).toBeDefined();
    expect(cells["cell-1--1"]).toBeDefined();
    expect(cells["cell-1-1"]).toBeDefined();
    expect(cells["cell--1-1"]).toBeDefined();
  });

  it("no cell exists at (0,0)", () => {
    const cells = buildAllCells(5);
    expect(cells["cell-0-0"]).toBeUndefined();
  });

  it("no cells on axes", () => {
    const cells = buildAllCells(5);
    expect(cells["cell-0--1"]).toBeUndefined();
    expect(cells["cell-1-0"]).toBeUndefined();
    expect(cells["cell-0-1"]).toBeUndefined();
    expect(cells["cell--1-0"]).toBeUndefined();
  });
});

describe("getCellDensity", () => {
  it("cells near origin have higher density", () => {
    const d1 = getCellDensity(-1, -1);
    const d5 = getCellDensity(-5, -5);
    expect(d1).toBeGreaterThan(d5);
  });

  it("density is between 0 and 1", () => {
    expect(getCellDensity(1, 1)).toBeGreaterThan(0);
    expect(getCellDensity(1, 1)).toBeLessThanOrEqual(1);
    expect(getCellDensity(100, 100)).toBeGreaterThan(0);
  });
});

describe("getFrontierCell", () => {
  it("returns genesis cell when all are unclaimed", () => {
    const cells = buildAllCells(3);
    const frontier = getFrontierCell("community", cells);
    expect(frontier).not.toBeNull();
    expect(frontier!.cx).toBe(-1);
    expect(frontier!.cy).toBe(-1);
  });

  it("returns next nearest when genesis is claimed", () => {
    const cells = buildAllCells(3);
    cells["cell--1--1"].ownerId = "user-1";
    const frontier = getFrontierCell("community", cells);
    expect(frontier).not.toBeNull();
    // Should be one of the ring-2 NW cells
    expect(frontier!.cx).toBeLessThan(0);
    expect(frontier!.cy).toBeLessThan(0);
  });

  it("returns null when all cells are claimed", () => {
    const cells = buildAllCells(1);
    cells["cell--1--1"].ownerId = "u1";
    cells["cell-1--1"].ownerId = "u2";
    cells["cell-1-1"].ownerId = "u3";
    cells["cell--1-1"].ownerId = "u4";
    const frontier = getFrontierCell("community", cells);
    expect(frontier).toBeNull();
  });
});

describe("cellToPixel", () => {
  it("(0,0) maps to pixel (0,0)", () => {
    expect(cellToPixel(0, 0)).toEqual({ px: 0, py: 0 });
  });
  it("(1,0) maps to (CELL_SIZE, 0)", () => {
    expect(cellToPixel(1, 0)).toEqual({ px: CELL_SIZE, py: 0 });
  });
  it("(-1,-1) maps to (-CELL_SIZE, -CELL_SIZE)", () => {
    expect(cellToPixel(-1, -1)).toEqual({ px: -CELL_SIZE, py: -CELL_SIZE });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/game && npx vitest run src/__tests__/lattice.test.ts`
Expected: FAIL — module `@/lib/lattice` missing exports

- [ ] **Step 3: Implement the new `lattice.ts`**

Rewrite `apps/game/src/lib/lattice.ts`:

```typescript
import type { FactionId, BlockNode } from "@/types";

export const CELL_SIZE = 64;
export const DENSITY_DECAY = 0.15;
export const FACTIONS: FactionId[] = ["community", "treasury", "founder", "pro-max"];

/** Quadrant sign vectors: NW=(-1,-1), NE=(1,-1), SE=(1,1), SW=(-1,1) */
const QUADRANT_SIGNS: Record<FactionId, { sx: number; sy: number }> = {
  community: { sx: -1, sy: -1 },
  treasury: { sx: 1, sy: -1 },
  founder: { sx: 1, sy: 1 },
  "pro-max": { sx: -1, sy: 1 },
};

/** Determine which faction owns a cell. Returns null for origin and axes. */
export function getFactionForCell(cx: number, cy: number): FactionId | null {
  if (cx === 0 || cy === 0) return null;
  if (cx < 0 && cy < 0) return "community";
  if (cx > 0 && cy < 0) return "treasury";
  if (cx > 0 && cy > 0) return "founder";
  return "pro-max"; // cx < 0 && cy > 0
}

/** Cell density based on distance from origin. Closer = higher. */
export function getCellDensity(cx: number, cy: number): number {
  const dist = Math.sqrt(cx * cx + cy * cy);
  return 1.0 / (1 + dist * DENSITY_DECAY);
}

/** Convert cell coordinate to pixel position. */
export function cellToPixel(cx: number, cy: number): { px: number; py: number } {
  return { px: cx * CELL_SIZE, py: cy * CELL_SIZE };
}

/** Unique cell ID from coordinates. */
export function cellId(cx: number, cy: number): string {
  return `cell-${cx}-${cy}`;
}

/** Create a BlockNode for a cell. */
function createCell(cx: number, cy: number, ringIndex: number): BlockNode {
  const faction = getFactionForCell(cx, cy);
  if (!faction) throw new Error(`Cannot create cell at axis/origin (${cx},${cy})`);
  return {
    id: cellId(cx, cy),
    blockIndex: ringIndex,
    ringIndex,
    cx,
    cy,
    faction,
    secureStrength: getCellDensity(cx, cy) * 100,
    ownerId: null,
    stakedCpu: 0,
    cumulativeSecures: 0,
  };
}

/**
 * Returns the NEW cells added by ring N (not cumulative).
 * Ring 0 = no cells (origin point).
 * Ring 1 = 4 genesis cells (one per quadrant).
 * Ring N = 4 * (2N - 1) new cells.
 */
export function getCellsForRing(ring: number): BlockNode[] {
  if (ring <= 0) return [];
  const cells: BlockNode[] = [];

  for (const faction of FACTIONS) {
    const { sx, sy } = QUADRANT_SIGNS[faction];
    if (ring === 1) {
      cells.push(createCell(sx, sy, ring));
    } else {
      // New cells on the two expanding edges of the quadrant.
      // For NW (sx=-1,sy=-1), ring N adds:
      //   Row: cy = -N, cx from -N to -1 (N cells)
      //   Col: cx = -N, cy from -(N-1) to -1 (N-1 cells)
      // Generalized with sign vectors:
      for (let i = 1; i <= ring; i++) {
        // Edge along the Y-expansion: fixed cy = sy*ring, cx varies
        cells.push(createCell(sx * i, sy * ring, ring));
      }
      for (let i = 1; i < ring; i++) {
        // Edge along the X-expansion: fixed cx = sx*ring, cy varies
        cells.push(createCell(sx * ring, sy * i, ring));
      }
    }
  }
  return cells;
}

/**
 * Build cells for a specific ring and return as a Record keyed by cell ID.
 * Alias for store compatibility.
 */
export function buildCellsForRing(ring: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (const cell of getCellsForRing(ring)) {
    result[cell.id] = cell;
  }
  return result;
}

/** Build all cells from ring 1 to totalRings (inclusive). */
export function buildAllCells(totalRings: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (let r = 1; r <= totalRings; r++) {
    Object.assign(result, buildCellsForRing(r));
  }
  return result;
}

/**
 * Returns the nearest unclaimed cell to origin within a faction's quadrant.
 * Used for homenode auto-assignment.
 */
export function getFrontierCell(
  faction: FactionId,
  cells: Record<string, BlockNode>
): BlockNode | null {
  const candidates = Object.values(cells)
    .filter((c) => c.faction === faction && c.ownerId === null)
    .sort((a, b) => {
      const distA = a.cx * a.cx + a.cy * a.cy;
      const distB = b.cx * b.cx + b.cy * b.cy;
      return distA - distB;
    });
  return candidates[0] ?? null;
}

/**
 * Returns the cell at a given coordinate, or null.
 */
export function getCellAt(
  cx: number,
  cy: number,
  cells: Record<string, BlockNode>
): BlockNode | null {
  return cells[cellId(cx, cy)] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/game && npx vitest run src/__tests__/lattice.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Delete `spiral.ts` and `spiral.test.ts`**

```bash
cd apps/game
rm src/lib/spiral.ts src/__tests__/spiral.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A src/lib/lattice.ts src/lib/spiral.ts src/__tests__/lattice.test.ts src/__tests__/spiral.test.ts
git commit -m "feat(grid): replace spiral with quadrant-based cell generation

Delete spiral.ts (polar arm formula). New lattice.ts generates cells
in 4 quadrants via Chebyshev ring expansion. Origin (0,0) is a point,
not a cell. Ring 1 = genesis (4 cells). Each ring adds 2N-1 cells
per quadrant. Cell IDs: cell-{cx}-{cy}."
```

---

### Task 2: Update `grid.ts` Types — Remove Spiral References

**Files:**
- Modify: `apps/game/src/types/grid.ts`

- [ ] **Step 1: Update the `grid.ts` type comments**

Remove spiral/arm references from the `FactionId` and `BlockNode` docs:

In `apps/game/src/types/grid.ts`, replace the FactionId comment block:
```typescript
/**
 * The 4 Megafactions. Each occupies a 90-degree quadrant of the Neural Lattice.
 * - community: free users (NW quadrant, cx<0 cy<0)
 * - treasury:  AI-controlled Machines swarm (NE quadrant, cx>0 cy<0)
 * - founder:   founding dev team (SE quadrant, cx>0 cy>0)
 * - pro-max:   premium users (SW quadrant, cx<0 cy>0)
 */
```

Update BlockNode doc: remove "pointing to one block on the blockchain. Every mined block creates one new blocknode per arm (4 total)." and replace with "A cell in the Neural Lattice grid. Each cell sits at the center of a grid square, identified by integer coordinates (cx, cy)."

- [ ] **Step 2: Commit**

```bash
git add src/types/grid.ts
git commit -m "docs(types): update grid.ts comments for quadrant model"
```

---

### Task 3: Update `LatticeGrid.tsx` — Quadrant Rendering

**Files:**
- Modify: `apps/game/src/components/LatticeGrid.tsx`
- Modify: `apps/game/src/components/grid/GridBackground.ts`
- Modify: `apps/game/src/components/grid/StarNode.ts`
- Delete: `apps/game/src/components/grid/ConnectionLine.ts`
- Delete: `apps/game/src/__tests__/StarNode.test.ts`

This is the largest task. The key changes:
1. Import from `lattice.ts` instead of `spiral.ts`
2. Position nodes at `cellToPixel(cx, cy)` — no spiral math
3. Remove connection lines entirely
4. Update GridBackground to use quadrant faction assignment (not Voronoi)

- [ ] **Step 1: Update imports in LatticeGrid.tsx**

In `apps/game/src/components/LatticeGrid.tsx`, replace:
```typescript
import { CELL_SIZE, getBlocknodePixelPos } from "@/lib/spiral";
```
with:
```typescript
import { CELL_SIZE, cellToPixel } from "@/lib/lattice";
```

- [ ] **Step 2: Update the blocknode rendering effect in LatticeGrid.tsx**

Find the `useEffect` that re-renders blocknodes (around line 248). Replace the `getBlocknodePixelPos` usage and remove connection line rendering.

In the blocknode rendering loop, replace:
```typescript
const { px, py } = getBlocknodePixelPos(node);
```
with:
```typescript
const { px, py } = cellToPixel(node.cx, node.cy);
```

Remove the connection lines loop entirely (the `for (const node of nodes)` that calls `createBlocknodeConnections`).

Remove the import of `createBlocknodeConnections` from `ConnectionLine.ts`.

- [ ] **Step 3: Update `StarNode.ts` — snap to cell center**

In `apps/game/src/components/grid/StarNode.ts`:

Replace the spiral import:
```typescript
import { ARM_BASE_ANGLES, ARM_RADIUS_GROWTH, TWIST_PER_RING, CELL_SIZE } from "@/lib/spiral";
```
with:
```typescript
import { CELL_SIZE, cellToPixel } from "@/lib/lattice";
```

In `createBlockNode()`, replace the spiral position calculation (lines 184-193):
```typescript
  // Use exact floating-point spiral coordinates...
  const exactAngleDeg = ARM_BASE_ANGLES[node.faction] - node.ringIndex * TWIST_PER_RING;
  const exactAngleRad = (exactAngleDeg * Math.PI) / 180;
  const exactRadius = Math.SQRT2 + node.ringIndex * ARM_RADIUS_GROWTH;
  const px = exactRadius * Math.cos(exactAngleRad) * CELL_SIZE;
  const py = exactRadius * Math.sin(exactAngleRad) * CELL_SIZE;
  container.position.set(px, py);
```
with:
```typescript
  // Snap to grid cell center
  const { px, py } = cellToPixel(node.cx, node.cy);
  container.position.set(px, py);
```

- [ ] **Step 4: Update `GridBackground.ts` — quadrant-based faction assignment**

In `apps/game/src/components/grid/GridBackground.ts`:

Replace the import:
```typescript
import { CELL_SIZE, cellToPixel } from "@/lib/spiral";
```
with:
```typescript
import { CELL_SIZE, cellToPixel, getFactionForCell } from "@/lib/lattice";
```

Replace the `buildCellFactionMap` function (Voronoi-based) with quadrant-based:
```typescript
function buildCellFactionMap(range: number, _nodes: BlockNode[]): Record<string, FactionId> {
  const map: Record<string, FactionId> = {};
  for (let cy = -range; cy <= range; cy++) {
    for (let cx = -range; cx <= range; cx++) {
      const faction = getFactionForCell(cx, cy);
      if (faction) map[`${cx},${cy}`] = faction;
    }
  }
  return map;
}
```

- [ ] **Step 5: Delete `ConnectionLine.ts` and `StarNode.test.ts`**

```bash
rm apps/game/src/components/grid/ConnectionLine.ts
rm apps/game/src/__tests__/StarNode.test.ts
```

- [ ] **Step 6: Remove ConnectionLine import from LatticeGrid.tsx**

Remove the line:
```typescript
import { createBlocknodeConnections } from "@/components/grid/ConnectionLine";
```

And remove the connection lines rendering loop from the blocknode effect.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd apps/game && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(grid): render nodes on quadrant grid cells

Replace spiral positioning with cellToPixel(cx, cy). Remove connection
lines between nodes. GridBackground uses quadrant faction assignment
instead of Voronoi. StarNode snaps to grid cell center."
```

---

### Task 4: Update `gameStore.ts` — Use New Lattice Functions

**Files:**
- Modify: `apps/game/src/store/gameStore.ts`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { buildBlocknodesForBlock, buildAllBlocknodes } from "@/lib/lattice";
```
with:
```typescript
import { buildCellsForRing, buildAllCells, getFrontierCell } from "@/lib/lattice";
```

- [ ] **Step 2: Update `initLattice`**

Replace:
```typescript
initLattice: (totalBlocks) =>
  set({
    blocknodes: buildAllBlocknodes(totalBlocks),
    totalBlocksMined: totalBlocks,
    visibleFactions: [],
  }),
```
with:
```typescript
initLattice: (totalRings) =>
  set({
    blocknodes: buildAllCells(totalRings),
    totalBlocksMined: totalRings,
    visibleFactions: [],
  }),
```

- [ ] **Step 3: Update `addBlocknodesForBlock`**

Replace:
```typescript
addBlocknodesForBlock: (blockIndex) =>
  set((s) => {
    const newNodes = buildBlocknodesForBlock(blockIndex);
    return {
      blocknodes: { ...s.blocknodes, ...newNodes },
      totalBlocksMined: Math.max(s.totalBlocksMined, blockIndex + 1),
    };
  }),
```
with:
```typescript
addBlocknodesForBlock: (ringIndex) =>
  set((s) => {
    const newCells = buildCellsForRing(ringIndex);
    return {
      blocknodes: { ...s.blocknodes, ...newCells },
      totalBlocksMined: Math.max(s.totalBlocksMined, ringIndex),
    };
  }),
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/game && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): wire gameStore to quadrant lattice functions"
```

---

### Task 5: Update `game/page.tsx` — Quadrant Homenode Placement

**Files:**
- Modify: `apps/game/src/app/game/page.tsx`

- [ ] **Step 1: Update the init code to use new lattice**

In the `init()` function, the dev seed currently claims `"block-0-treasury"` and `"block-0-founder"`. These IDs no longer exist. Update to use the new cell IDs:

Replace:
```typescript
claimBlocknode("block-0-treasury", "dev-treasury");
claimBlocknode("block-0-founder", "dev-founder");
```
with:
```typescript
claimBlocknode("cell-1--1", "dev-treasury");    // NE genesis = treasury
claimBlocknode("cell-1-1", "dev-founder");      // SE genesis = founder
```

- [ ] **Step 2: Update frontier node lookup**

The `getFrontierBlocknode` import from `lattice.ts` is now `getFrontierCell`. Update the import and call:

Replace:
```typescript
import { getFrontierBlocknode } from "@/lib/lattice";
```
with:
```typescript
import { getFrontierCell } from "@/lib/lattice";
```

And in the init code, replace:
```typescript
const frontierNode = getFrontierBlocknode(newUserFaction, freshStore.blocknodes);
```
with:
```typescript
const frontierNode = getFrontierCell(newUserFaction, freshStore.blocknodes);
```

- [ ] **Step 3: Update initLattice call**

The `initLattice(1)` call currently means "1 block = ring 0". With the new system, ring 0 has no cells and ring 1 is genesis. Change to:
```typescript
initLattice(1); // Ring 1 = genesis (4 cells)
```

This is the same call but now means "build rings up to 1" which produces the 4 genesis cells. The semantics align.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/game && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat(game): update init to use quadrant cell IDs and frontier"
```

---

### Task 6: Update `gameStore.test.ts` — Fix Lattice Tests

**Files:**
- Modify: `apps/game/src/__tests__/gameStore.test.ts`

- [ ] **Step 1: Update cell counts and IDs**

The tests reference old IDs like `"block-0-community"`. Update to new `"cell-{cx}-{cy}"` format.

Replace all test references:
- `"block-0-community"` → `"cell--1--1"`
- `"block-0-treasury"` → `"cell-1--1"`
- `"block-0-founder"` → `"cell-1-1"`
- `"block-0-pro-max"` → `"cell--1-1"`

Update cell count assertions:
- `initLattice(3)` now produces rings 1-3: 4 + 12 + 20 = 36 cells (was 12 with old system)
- `initLattice(1)` produces ring 1: 4 cells (was 4 — same count, just different IDs)
- `initLattice(2)` + `addBlocknodesForBlock(2)` is now redundant — `initLattice(2)` already includes ring 2

Update the lattice/blocknode test section to use new counts and IDs. The claimBlocknode tests should work with the new IDs but same logic.

- [ ] **Step 2: Update the ring-0 coordinate comment**

Replace the comment:
```typescript
// Ring-0 arm nodes land at cardinal positions (Y-down screen space, from spiral math):
```
with:
```typescript
// Genesis cells land at quadrant corners adjacent to origin:
// NW=(-1,-1), NE=(1,-1), SE=(1,1), SW=(-1,1)
```

- [ ] **Step 3: Run full test suite**

Run: `cd apps/game && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/gameStore.test.ts
git commit -m "test: update gameStore tests for quadrant cell IDs"
```

---

### Task 7: Update Faction Colors in GridBackground

**Files:**
- Modify: `apps/game/src/components/grid/GridBackground.ts`

- [ ] **Step 1: Update FACTION_COLORS to match spec**

Replace the current colors:
```typescript
export const FACTION_COLORS: Record<FactionId, number> = {
  community: 0xffffff,
  treasury: 0xf97316,
  founder: 0xd946ef,
  "pro-max": 0x00ffff,
};
```
with the canonical colors from the spec:
```typescript
export const FACTION_COLORS: Record<FactionId, number> = {
  community: 0x0d9488, // teal
  treasury: 0xdc2680,  // pink (Machines)
  founder: 0xf59e0b,   // amber
  "pro-max": 0x3b82f6, // blue (Professional)
};
```

- [ ] **Step 2: Draw origin marker**

In the `updateGridBackground` function, after drawing faction cells, add a white dot at origin:

```typescript
// Origin marker — the meeting point of all 4 factions
gfx.circle(0, 0, 3);
gfx.fill({ color: 0xffffff, alpha: 0.5 });
```

- [ ] **Step 3: Draw quadrant boundary lines**

Add dashed lines along the axes:
```typescript
// Quadrant boundaries — dashed lines along axes
const extent = range * CELL_SIZE;
gfx.setStrokeStyle({ width: 1, color: 0x444444, alpha: 0.4 });
// Horizontal axis
for (let x = -extent; x < extent; x += 8) {
  gfx.moveTo(x, 0);
  gfx.lineTo(Math.min(x + 4, extent), 0);
  gfx.stroke();
}
// Vertical axis
for (let y = -extent; y < extent; y += 8) {
  gfx.moveTo(0, y);
  gfx.lineTo(0, Math.min(y + 4, extent));
  gfx.stroke();
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/grid/GridBackground.ts
git commit -m "feat(grid): canonical faction colors, origin marker, quadrant boundaries"
```

---

### Task 8: Full Verification

- [ ] **Step 1: Run full test suite**

Run: `cd apps/game && npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run TypeScript check**

Run: `cd apps/game && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run build**

Run: `cd apps/game && npm run build`
Expected: build succeeds

- [ ] **Step 4: Visual test**

Start chain + game servers:
```bash
cd /path/to/Exodus/chain && uvicorn agentic.testnet.api:app --port 8080 --reload &
cd /path/to/Exodus/apps/game && npm run dev
```

Open `http://localhost:3000`, pick a faction, verify:
- [ ] Nodes appear on grid cell centers (not between cells)
- [ ] 4 genesis cells visible (one per quadrant corner)
- [ ] No spiral arms or connection lines
- [ ] Faction colors match spec (teal/pink/amber/blue)
- [ ] Quadrant boundaries visible as dashed lines
- [ ] Origin marker (white dot) visible at center
- [ ] Zoom bar above bottom bar
- [ ] Mining new blocks expands grid outward

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(grid): quadrant grid redesign complete — all tests pass"
```
