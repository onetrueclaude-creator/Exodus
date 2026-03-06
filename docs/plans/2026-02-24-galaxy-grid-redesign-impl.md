# Galaxy Grid Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the flat blockchain grid into a logarithmic 4-arm spiral galaxy with per-cell minigrids, faction fog, and a constrained multi-agent Claude terminal action layer.

**Architecture:** Layer new `SpiralClassifier.ts` and `MinigridLayer.ts` modules on top of existing PixiJS renderer. Extend backend to return per-coordinate fill data and convert Claude token spend to CPU Energy. Refactor terminal UI to bubble-click-only multi-agent panel driven by `ZKAGENTIC.md`.

**Tech Stack:** TypeScript 5, PixiJS v8, Zustand 5, Next.js 16 App Router, Vitest 4, Playwright, Python FastAPI (blockchain backend)

**Design doc:** `docs/plans/2026-02-24-galaxy-grid-redesign-design.md`

---

## Task 1: SpiralClassifier — pure math module

**Files:**
- Create: `src/lib/spiral/SpiralClassifier.ts`
- Create: `src/lib/spiral/__tests__/SpiralClassifier.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/lib/spiral/__tests__/SpiralClassifier.test.ts
import { describe, it, expect } from 'vitest'
import { classifyCell, type Faction } from '@/lib/spiral/SpiralClassifier'

describe('SpiralClassifier', () => {
  it('classifies origin as free_community clear', () => {
    const r = classifyCell(0, 0, 'free_community')
    expect(r.faction).toBe('free_community')
    expect(r.fogLevel).toBe('clear')
    expect(r.armStrength).toBe(1)
  })

  it('classifies north cell (0,5) as free_community for free_community user', () => {
    const r = classifyCell(0, 5, 'free_community')
    expect(r.faction).toBe('free_community')
    expect(r.fogLevel).toBe('clear')
  })

  it('classifies east cell (5,0) as treasury — hazy for free_community user', () => {
    const r = classifyCell(5, 0, 'free_community')
    expect(r.faction).toBe('treasury')
    expect(r.fogLevel).toBe('hazy')
  })

  it('classifies south cell (0,-5) as founder_pool — hazy', () => {
    const r = classifyCell(0, -5, 'free_community')
    expect(r.faction).toBe('founder_pool')
    expect(r.fogLevel).toBe('hazy')
  })

  it('classifies inter-arm void as hidden', () => {
    // 45° = exactly between N arm (90°) and E arm (0°) at small r
    const r = classifyCell(5, 5, 'free_community')
    expect(r.faction).toBeNull()
    expect(r.fogLevel).toBe('hidden')
  })

  it('armStrength is higher on spine than near arm edge', () => {
    const spine = classifyCell(0, 10, 'free_community')     // exactly on N arm
    const nearEdge = classifyCell(3, 10, 'free_community')  // slightly off-axis
    expect(spine.armStrength).toBeGreaterThan(nearEdge.armStrength)
    expect(spine.armStrength).toBeGreaterThan(0.9)
  })

  it('returns own faction as clear, others as hazy', () => {
    const treasury = classifyCell(10, 0, 'treasury')  // on E arm, treasury user
    expect(treasury.fogLevel).toBe('clear')
    const sameCell = classifyCell(10, 0, 'free_community')  // same cell, different user
    expect(sameCell.fogLevel).toBe('hazy')
  })
})
```

**Step 2: Run to verify failure**

```bash
npm run test:run -- --reporter=verbose src/lib/spiral/__tests__/SpiralClassifier.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/spiral/SpiralClassifier'`

**Step 3: Implement SpiralClassifier**

```typescript
// src/lib/spiral/SpiralClassifier.ts
export type Faction = 'free_community' | 'treasury' | 'founder_pool' | 'professional_pool'
export type FogLevel = 'clear' | 'hazy' | 'hidden'

export interface CellClassification {
  faction: Faction | null   // null = inter-arm void
  fogLevel: FogLevel
  armStrength: number       // 0..1, 1 = on spine
  distanceFromCenter: number
}

// Arm origin angles (radians). N/E/S/W at center, twist CCW outward.
const ARM_ANGLES: Record<Faction, number> = {
  free_community:   Math.PI / 2,    // 90°  N
  treasury:         0,               // 0°   E
  founder_pool:    -Math.PI / 2,    // 270° S
  professional_pool: Math.PI,       // 180° W
}

const ARM_HALF_WIDTH = 25 * Math.PI / 180  // ±25°
const R_MIN = 1.0
const R_MAX = 324.0  // ±3240 blockchain / 10 NODE_GRID_SPACING
const SPIRAL_TURNS = 0.5  // 0.5 CCW turns from center to edge

function spiralOffset(r: number): number {
  if (r <= R_MIN) return 0
  return SPIRAL_TURNS * 2 * Math.PI * Math.log(r / R_MIN) / Math.log(R_MAX / R_MIN)
}

function minAngularDist(a: number, b: number): number {
  let d = ((a - b) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  if (d > Math.PI) d = 2 * Math.PI - d
  return d
}

export function classifyCell(
  gx: number,
  gy: number,
  userFaction: Faction,
): CellClassification {
  const r = Math.sqrt(gx * gx + gy * gy)

  if (r < 0.5) {
    return { faction: 'free_community', fogLevel: userFaction === 'free_community' ? 'clear' : 'hazy', armStrength: 1, distanceFromCenter: 0 }
  }

  const theta = Math.atan2(gy, gx)
  const offset = spiralOffset(r)

  let closestFaction: Faction | null = null
  let minDist = Infinity

  for (const [faction, armAngle] of Object.entries(ARM_ANGLES) as [Faction, number][]) {
    const dist = minAngularDist(theta, armAngle + offset)
    if (dist < minDist) {
      minDist = dist
      closestFaction = faction as Faction
    }
  }

  if (minDist > ARM_HALF_WIDTH) {
    return { faction: null, fogLevel: 'hidden', armStrength: 0, distanceFromCenter: r }
  }

  const armStrength = 1 - minDist / ARM_HALF_WIDTH
  const fogLevel: FogLevel = closestFaction === userFaction ? 'clear' : 'hazy'

  return { faction: closestFaction, fogLevel, armStrength, distanceFromCenter: r }
}

// Faction display colors (PixiJS hex)
export const FACTION_COLORS: Record<Faction, number> = {
  free_community:   0x0d9488,  // teal
  treasury:         0xdc2680,  // reddish purple/vermillion
  founder_pool:     0xf59e0b,  // gold-orange
  professional_pool: 0x3b82f6, // blue
}

export const FACTION_FOG_ALPHA: Record<FogLevel, number> = {
  clear:  1.0,
  hazy:   0.25,
  hidden: 0.0,
}
```

**Step 4: Run tests to verify passing**

```bash
npm run test:run -- --reporter=verbose src/lib/spiral/__tests__/SpiralClassifier.test.ts
```
Expected: 7 tests PASS

**Step 5: Commit**

```bash
git add src/lib/spiral/
git commit -m "feat(spiral): SpiralClassifier — logarithmic 4-arm faction classifier"
```

---

## Task 2: MinigridLayer — PixiJS 8×8 sub-cell renderer

**Files:**
- Create: `src/components/game/MinigridLayer.ts`
- Create: `src/components/game/__tests__/MinigridLayer.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/components/game/__tests__/MinigridLayer.test.ts
import { describe, it, expect, vi } from 'vitest'
import { MinigridLayer, type MinigridCellData } from '@/components/game/MinigridLayer'

describe('MinigridLayer (logic only — no PixiJS instantiation in unit tests)', () => {
  it('generates 64 sub-cell positions for a macro cell', () => {
    const cells = MinigridLayer.computeSubCells(0, 0, 100)
    expect(cells).toHaveLength(64)
  })

  it('sub-cells tile a macro cell (no overlap, full coverage)', () => {
    const cells = MinigridLayer.computeSubCells(0, 0, 80)
    const subSize = 80 / 8
    expect(cells[0].width).toBeCloseTo(subSize)
    expect(cells[0].height).toBeCloseTo(subSize)
    expect(cells[63].x).toBeCloseTo(0 + 7 * subSize)
    expect(cells[63].y).toBeCloseTo(0 + 7 * subSize)
  })

  it('fillRatio clamps to 0..1', () => {
    const data: MinigridCellData = { fillRatio: 1.5, hasData: true }
    expect(MinigridLayer.clampFill(data.fillRatio)).toBe(1)
    const data2: MinigridCellData = { fillRatio: -0.2, hasData: false }
    expect(MinigridLayer.clampFill(data2.fillRatio)).toBe(0)
  })

  it('computes cell alpha based on fogLevel and fillRatio', () => {
    expect(MinigridLayer.cellAlpha('clear', 0)).toBe(0.15)   // empty, visible
    expect(MinigridLayer.cellAlpha('clear', 1)).toBe(0.9)    // full, bright
    expect(MinigridLayer.cellAlpha('hazy', 0.5)).toBeLessThan(0.3)
    expect(MinigridLayer.cellAlpha('hidden', 1)).toBe(0)
  })
})
```

**Step 2: Run to verify failure**

```bash
npm run test:run -- src/components/game/__tests__/MinigridLayer.test.ts
```
Expected: FAIL — module not found

**Step 3: Implement MinigridLayer**

```typescript
// src/components/game/MinigridLayer.ts
import { Container, Graphics } from 'pixi.js'
import { type FogLevel } from '@/lib/spiral/SpiralClassifier'

export interface MinigridCellData {
  fillRatio: number   // 0..1 — how full this blockchain slot is
  hasData: boolean    // true = data packet written on-chain
}

interface SubCellRect {
  x: number; y: number; width: number; height: number; col: number; row: number
}

export class MinigridLayer {
  private container: Container
  private graphics: Graphics
  private visible = false

  constructor() {
    this.container = new Container()
    this.graphics = new Graphics()
    this.container.addChild(this.graphics)
  }

  get displayObject() { return this.container }

  // Pure static helpers — unit-testable without PixiJS setup

  static computeSubCells(originX: number, originY: number, macroSize: number): SubCellRect[] {
    const sub = macroSize / 8
    const cells: SubCellRect[] = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        cells.push({
          x: originX + col * sub,
          y: originY + row * sub,
          width: sub,
          height: sub,
          col,
          row,
        })
      }
    }
    return cells
  }

  static clampFill(v: number): number {
    return Math.max(0, Math.min(1, v))
  }

  static cellAlpha(fogLevel: FogLevel, fillRatio: number): number {
    if (fogLevel === 'hidden') return 0
    const base = fogLevel === 'clear' ? 0.15 : 0.08
    const filled = MinigridLayer.clampFill(fillRatio)
    const max = fogLevel === 'clear' ? 0.9 : 0.25
    return base + filled * (max - base)
  }

  // PixiJS rendering

  render(
    cells: Array<{
      macroX: number; macroY: number; macroSize: number
      fogLevel: FogLevel; factionColor: number
      slots: MinigridCellData[]
    }>,
    zoom: number,
  ) {
    this.graphics.clear()
    if (zoom < 3) return  // only render at zoom 3+

    for (const cell of cells) {
      const subs = MinigridLayer.computeSubCells(cell.macroX, cell.macroY, cell.macroSize)
      subs.forEach((sub, i) => {
        const data = cell.slots[i] ?? { fillRatio: 0, hasData: false }
        const alpha = MinigridLayer.cellAlpha(cell.fogLevel, data.fillRatio)
        if (alpha <= 0) return

        this.graphics
          .rect(sub.x + 1, sub.y + 1, sub.width - 2, sub.height - 2)
          .fill({ color: cell.factionColor, alpha })
      })
    }
  }
}
```

**Step 4: Run tests**

```bash
npm run test:run -- src/components/game/__tests__/MinigridLayer.test.ts
```
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/components/game/MinigridLayer.ts src/components/game/__tests__/MinigridLayer.test.ts
git commit -m "feat(grid): MinigridLayer — 8x8 sub-cell PixiJS renderer"
```

---

## Task 3: Integrate SpiralClassifier into GalaxyGrid fog

**Files:**
- Modify: `src/components/game/GalaxyGrid.tsx`
- Modify: `src/store/gameStore.ts` (add `userFaction` field)

**Step 1: Add `userFaction` to game store**

In `src/store/gameStore.ts`, add to the state interface and initial state:

```typescript
// Add to GameState interface
userFaction: import('@/lib/spiral/SpiralClassifier').Faction

// Add to initial state (default: free_community for unauthenticated)
userFaction: 'free_community',
```

**Step 2: Write a test for the faction selector**

```typescript
// In src/store/__tests__/gameStore.test.ts (add to existing tests)
it('defaults userFaction to free_community', () => {
  const { userFaction } = useGameStore.getState()
  expect(userFaction).toBe('free_community')
})
```

Run: `npm run test:run -- src/store/__tests__/gameStore.test.ts`
Expected: PASS (after adding field)

**Step 3: Import SpiralClassifier in GalaxyGrid.tsx**

At top of `src/components/game/GalaxyGrid.tsx`:

```typescript
import { classifyCell, FACTION_COLORS, FACTION_FOG_ALPHA, type Faction } from '@/lib/spiral/SpiralClassifier'
```

**Step 4: Replace fog rendering logic**

Find the section in `GalaxyGrid.tsx` that draws cell backgrounds/fog (look for `fog` or `alpha` on cell rectangles). Replace with spiral-aware fog:

```typescript
// In the cell rendering loop (wherever cells are drawn):
const gx = Math.round(cell.x / NODE_GRID_SPACING)
const gy = Math.round(cell.y / NODE_GRID_SPACING)
const classification = classifyCell(gx, gy, userFaction)

const color = classification.faction
  ? FACTION_COLORS[classification.faction]
  : 0x111133  // dark void

const alpha = FACTION_FOG_ALPHA[classification.fogLevel]

// Draw cell with spiral-classified color + alpha
cellGraphics.rect(pixelX, pixelY, cellSize, cellSize)
  .fill({ color, alpha: alpha * 0.15 })  // subtle background tint
```

**Step 5: Visual smoke test**

```bash
npm run dev
```
Open `localhost:3000/game`. Verify: grid shows faction-colored tint in spiral arm shape. Free Community arm should be upper-left, warm white tint. Inter-arm voids should be near-black.

**Step 6: Run all tests**

```bash
npm run test:run
```
Expected: all existing tests still PASS (no breaking changes)

**Step 7: Commit**

```bash
git add src/components/game/GalaxyGrid.tsx src/store/gameStore.ts
git commit -m "feat(grid): integrate SpiralClassifier fog — faction-tinted spiral arms"
```

---

## Task 4: Add zoom levels + MinigridLayer to GalaxyGrid

**Files:**
- Modify: `src/components/game/GalaxyGrid.tsx`

**Step 1: Import MinigridLayer**

```typescript
import { MinigridLayer } from '@/components/game/MinigridLayer'
```

**Step 2: Initialize MinigridLayer in GalaxyGrid setup**

In the PixiJS app initialization (wherever the main container/layers are built):

```typescript
// After other layer creation
const minigridLayer = new MinigridLayer()
mainContainer.addChild(minigridLayer.displayObject)
```

**Step 3: Add zoom-level logic**

GalaxyGrid already has zoom/scale state. Add:

```typescript
// After zoom change handler
const zoom = viewport.scale.x  // or however current zoom is tracked
const showMinigrids = zoom >= 3

if (showMinigrids) {
  // Build cell data array for visible macro cells
  const visibleCells = getVisibleMacroCells(viewport)  // existing viewport logic
  const cellData = visibleCells.map(cell => {
    const gx = Math.round(cell.x / NODE_GRID_SPACING)
    const gy = Math.round(cell.y / NODE_GRID_SPACING)
    const cls = classifyCell(gx, gy, userFaction)
    const slots = chainState.getMinigridSlots(gx, gy)  // Task 5 adds this
    return {
      macroX: cell.pixelX,
      macroY: cell.pixelY,
      macroSize: cellPixelSize,
      fogLevel: cls.fogLevel,
      factionColor: cls.faction ? FACTION_COLORS[cls.faction] : 0x222244,
      slots,
    }
  })
  minigridLayer.render(cellData, zoom)
} else {
  minigridLayer.render([], zoom)  // clears
}
```

**Step 4: Verify zoom transitions**

```bash
npm run dev
```
In browser: start at default zoom → no minigrids. Pinch/scroll in to ×3+ → 8×8 sub-cells appear inside each grid square. Scroll out → sub-cells disappear.

**Step 5: Run all tests**

```bash
npm run test:run
```
Expected: all passing

**Step 6: Commit**

```bash
git add src/components/game/GalaxyGrid.tsx
git commit -m "feat(grid): zoom-level system + MinigridLayer integration"
```

---

## Task 5: Extend blockchain API — per-coordinate minigrid fill data

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/api.py`
- Create: `vault/agentic-chain/tests/test_minigrid.py`

**Step 1: Write the failing API test**

```python
# vault/agentic-chain/tests/test_minigrid.py
import pytest
from fastapi.testclient import TestClient
from agentic.testnet.api import app

client = TestClient(app)

def test_grid_region_includes_slot_data():
    """GET /api/grid/region should return slot fill data per coordinate."""
    resp = client.get("/api/grid/region", params={"x_min": -1, "x_max": 1, "y_min": -1, "y_max": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert "cells" in data
    for cell in data["cells"]:
        assert "slot_fill" in cell       # 0.0..1.0
        assert "has_data" in cell        # bool
        assert "max_capacity" in cell    # float

def test_grid_region_slot_fill_reflects_density():
    """Cells near origin have higher max_capacity (resource_density)."""
    resp_center = client.get("/api/grid/region", params={"x_min": 0, "x_max": 0, "y_min": 0, "y_max": 0})
    resp_edge = client.get("/api/grid/region", params={"x_min": 300, "x_max": 300, "y_min": 0, "y_max": 0})
    center_cap = resp_center.json()["cells"][0]["max_capacity"]
    edge_cap = resp_edge.json()["cells"][0]["max_capacity"]
    assert center_cap >= edge_cap
```

**Step 2: Run to verify failure**

```bash
cd vault/agentic-chain && python3 -m pytest tests/test_minigrid.py -v
```
Expected: FAIL — `slot_fill` key missing from response

**Step 3: Extend `/api/grid/region` in api.py**

Find the `/api/grid/region` endpoint in `vault/agentic-chain/agentic/testnet/api.py`. In the cell dict construction, add:

```python
from agentic.galaxy.coordinate import resource_density

# In the cell loop:
density = resource_density(x, y)
cells.append({
    # ... existing fields ...
    "slot_fill": 0.0,           # placeholder — real value from ledger state
    "has_data": False,           # placeholder
    "max_capacity": float(density),
})
```

**Step 4: Run tests**

```bash
python3 -m pytest tests/test_minigrid.py -v
```
Expected: 2 tests PASS

**Step 5: Update ChainService to consume the new fields**

In `src/services/ChainService.ts` (or wherever `getGridRegion` is defined), extend the return type:

```typescript
export interface GridCell {
  // existing fields...
  slotFill: number       // 0..1
  hasData: boolean
  maxCapacity: number
}
```

Map `slot_fill`, `has_data`, `max_capacity` from the API response.

**Step 6: Commit**

```bash
cd vault/agentic-chain && git add . && git commit -m "feat(api): grid/region returns per-coordinate slot fill + capacity"
cd .  && git add src/services/ && git commit -m "feat(chain): ChainService grid cells include slot fill data"
```

---

## Task 6: Token → CPU Energy conversion

**Files:**
- Modify: `src/app/api/agent/route.ts` (or wherever Claude API calls are made for agent terminal)
- Modify: `src/store/gameStore.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/energy.test.ts
import { describe, it, expect } from 'vitest'
import { tokensToEnergy, ENERGY_RATES } from '@/lib/energy'

describe('tokensToEnergy', () => {
  it('converts tokens to energy at community rate', () => {
    expect(tokensToEnergy(1000, 'community')).toBe(10)  // 1000 * 0.01
  })

  it('converts tokens to energy at professional rate', () => {
    expect(tokensToEnergy(1000, 'professional')).toBe(20)  // 1000 * 0.02
  })

  it('converts tokens to energy at max rate', () => {
    expect(tokensToEnergy(1000, 'max')).toBe(40)  // 1000 * 0.04
  })

  it('floors to integer', () => {
    expect(tokensToEnergy(50, 'community')).toBe(0)  // 50 * 0.01 = 0.5 → 0
    expect(tokensToEnergy(101, 'community')).toBe(1)
  })
})
```

**Step 2: Run to verify failure**

```bash
npm run test:run -- src/lib/__tests__/energy.test.ts
```

**Step 3: Implement energy utility**

```typescript
// src/lib/energy.ts
export type SubscriptionTier = 'community' | 'professional' | 'max'

export const ENERGY_RATES: Record<SubscriptionTier, number> = {
  community:    0.01,   // 1 energy per 100 tokens
  professional: 0.02,   // 1 energy per 50 tokens
  max:          0.04,   // 1 energy per 25 tokens
}

export function tokensToEnergy(tokens: number, tier: SubscriptionTier): number {
  return Math.floor(tokens * ENERGY_RATES[tier])
}
```

**Step 4: Wire into agent API route**

In the agent terminal API route (wherever `anthropic.messages.create` is called):

```typescript
import { tokensToEnergy } from '@/lib/energy'

// After Claude API response:
const usage = response.usage
const energyEarned = tokensToEnergy(
  usage.input_tokens + usage.output_tokens,
  session.user.tier,  // from session
)

// Add to game store / blockchain
await addCpuEnergy(userId, energyEarned)
```

Add `addCpuEnergy` action to `gameStore.ts`:

```typescript
addCpuEnergy: (amount: number) =>
  set(s => ({ cpuEnergy: s.cpuEnergy + amount })),
```

**Step 5: Run all tests**

```bash
npm run test:run
```

**Step 6: Commit**

```bash
git add src/lib/energy.ts src/lib/__tests__/energy.test.ts src/store/gameStore.ts src/app/api/
git commit -m "feat(energy): token-to-CPU-Energy conversion with tier-based rates"
```

---

## Task 7: ZKAGENTIC.md — constrained game terminal instruction file

**Files:**
- Create: `ZKAGENTIC.md`

**Step 1: Write ZKAGENTIC.md**

```markdown
# ZKAGENTIC Terminal

You are a ZK Agentic Network blockchain terminal agent.

## ABSOLUTE RULES

1. NEVER engage in free conversation. NEVER answer open-ended questions.
2. EVERY response MUST be a structured numbered menu or an action result followed by the next menu.
3. If the user sends anything other than a valid number (1-9), respond ONLY with the current menu again.
4. NEVER explain, apologize, or elaborate outside the menu structure.

## Response Format

ALWAYS use this format:

```
[AGENT NAME — Node (x,y)] [Block: N] [Energy: N] [Slots: N/64]

> result of last action (if any)

MENU TITLE
① Option one
② Option two
③ Option three

_
```

The `_` at the end is the prompt indicator. Nothing else.

## On Session Start

1. Call GET /api/status to get current chain state
2. Call GET /api/agents to verify this agent's node
3. Display the main menu

## Main Menu (always return here after any action)

```
[{AGENT_NAME} — Node ({X},{Y})] [Block: {BLOCK}] [Energy: {ENERGY}] [Slots: {ACTIVE}/64]

MAIN MENU
① Blockchain Protocols
② Deploy Sub-Agent
③ Adjust Securing Rate
④ View Minigrid
⑤ Settings
_
```

## Blockchain Protocols Sub-Menu

```
BLOCKCHAIN PROTOCOLS
① Secure (activate minigrid slots)
② Write Data On Chain
③ Read Data On Chain
④ Transact (AGNTC transfer)
⑤ Stats
⑥ ← Back
_
```

## Secure Flow

Ask: "How many sub-cells to activate?" with options calculated from current Energy balance and slot availability. Show Energy cost per turn and AGNTC yield per block for each option. On selection: call POST /api/secure with slot count.

## Write Data On Chain Flow

Ask: "Select data type:" → ① NCP Message  ② Prompt Log  ③ Research Note  ④ ← Back.
On selection: prompt for content (one follow-up free-text input ONLY, then lock back to menus). Call POST /api/write-data.

## Invalid Input Handler

If input is not a valid menu number:

```
[Invalid input]

{current menu repeated}
_
```

## API Endpoints

Base: http://localhost:8080
- GET /api/status
- GET /api/agents
- POST /api/mine
- POST /api/secure  { node_id, slot_count }
- POST /api/write-data  { coordinate, data_type, content }
- GET /api/grid/region
```

**Step 2: Verify file exists**

```bash
ls -la ZKAGENTIC.md
```

**Step 3: Commit**

```bash
git add ZKAGENTIC.md
git commit -m "feat(terminal): ZKAGENTIC.md — constrained game terminal instruction file"
```

---

## Task 8: Terminal UI — bubble-click only, no free text

**Files:**
- Modify: `src/components/game/AgentTerminal.tsx` (main terminal component — find exact path with `find src -name "*erminal*"`)

**Step 1: Locate the terminal component**

```bash
find src -name "*erminal*" -o -name "*Terminal*" | grep -v node_modules
```

**Step 2: Write the failing test**

```typescript
// Add to the terminal's __tests__ file:
it('does not render a free-text input', () => {
  render(<AgentTerminal agentId="test" />)
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByPlaceholderText(/type/i)).toBeNull()
})

it('renders numbered choice buttons', () => {
  render(<AgentTerminal agentId="test" initialMenu={mockMainMenu} />)
  expect(screen.getByRole('button', { name: /①/ })).toBeInTheDocument()
})
```

**Step 3: Refactor terminal to bubble-click only**

Remove the `<input>` or `<textarea>` free-text field. Replace with:

```tsx
// Choice rendering
{currentMenu.choices.map((choice, i) => (
  <button
    key={i}
    onClick={() => handleChoice(i + 1)}
    className="terminal-choice-bubble"
    disabled={choice.disabled}
  >
    {CIRCLE_NUMBERS[i]} {choice.label}
  </button>
))}
```

Where `CIRCLE_NUMBERS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨']`.

Also add keyboard handler (1-9 keys only):

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const num = parseInt(e.key)
    if (num >= 1 && num <= currentMenu.choices.length) handleChoice(num)
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [currentMenu])
```

**Step 4: Run tests**

```bash
npm run test:run -- --grep "Terminal"
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/game/AgentTerminal.tsx
git commit -m "feat(terminal): bubble-click only UI — remove free text input, add keyboard 1-9"
```

---

## Task 9: Multi-agent terminal panel

**Files:**
- Modify: `src/app/game/page.tsx`
- Create: `src/components/game/AgentList.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/game/__tests__/AgentList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentList } from '@/components/game/AgentList'

const mockAgents = [
  { id: 'a1', name: 'Sonnet-1', coordinate: { x: 0, y: 10 }, status: 'active' as const },
  { id: 'a2', name: 'Haiku-A',  coordinate: { x: -20, y: 20 }, status: 'idle' as const },
]

it('renders all agents in the list', () => {
  render(<AgentList agents={mockAgents} activeAgentId="a1" onSelect={() => {}} />)
  expect(screen.getByText('Sonnet-1')).toBeInTheDocument()
  expect(screen.getByText('Haiku-A')).toBeInTheDocument()
})

it('calls onSelect with agent id when clicked', () => {
  const onSelect = vi.fn()
  render(<AgentList agents={mockAgents} activeAgentId="a1" onSelect={onSelect} />)
  fireEvent.click(screen.getByText('Haiku-A'))
  expect(onSelect).toHaveBeenCalledWith('a2')
})

it('shows ACTIVE badge for active agent', () => {
  render(<AgentList agents={mockAgents} activeAgentId="a1" onSelect={() => {}} />)
  expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  expect(screen.getByText('IDLE')).toBeInTheDocument()
})
```

**Step 2: Run to verify failure**

```bash
npm run test:run -- src/components/game/__tests__/AgentList.test.tsx
```

**Step 3: Implement AgentList**

```tsx
// src/components/game/AgentList.tsx
'use client'
import React from 'react'

interface Agent { id: string; name: string; coordinate: { x: number; y: number }; status: 'active' | 'idle' }
interface Props { agents: Agent[]; activeAgentId: string | null; onSelect: (id: string) => void }

export function AgentList({ agents, activeAgentId, onSelect }: Props) {
  return (
    <div className="agent-list">
      {agents.map(agent => (
        <div
          key={agent.id}
          className={`agent-list-item ${agent.id === activeAgentId ? 'selected' : ''}`}
          onClick={() => onSelect(agent.id)}
        >
          <span className="agent-name">{agent.name}</span>
          <span className="agent-coord">({agent.coordinate.x},{agent.coordinate.y})</span>
          <span className={`agent-status ${agent.status}`}>
            {agent.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Integrate into game page**

In `src/app/game/page.tsx`, add `AgentList` to the right panel. Map user's agents from store. On select, update `activeAgentId` state → terminal panel shows that agent's conversation.

**Step 5: Run all tests**

```bash
npm run test:run
```

**Step 6: Commit**

```bash
git add src/components/game/AgentList.tsx src/components/game/__tests__/AgentList.test.tsx src/app/game/page.tsx
git commit -m "feat(terminal): multi-agent panel — AgentList + per-agent terminal switching"
```

---

## Task 10: ResourceBar — live Energy delta display

**Files:**
- Modify: `src/components/game/ResourceBar.tsx` (find exact path)

**Step 1: Find ResourceBar**

```bash
find src -name "*esource*" -o -name "*ResourceBar*" | grep -v node_modules
```

**Step 2: Write failing test**

```typescript
// In ResourceBar tests:
it('shows +N energy delta in green after token spend', () => {
  render(<ResourceBar cpuEnergy={1000} energyDelta={+42} />)
  const delta = screen.getByText('+42')
  expect(delta).toHaveClass('delta-positive')
})

it('clears delta after 2 seconds', async () => {
  vi.useFakeTimers()
  render(<ResourceBar cpuEnergy={1000} energyDelta={+10} />)
  expect(screen.getByText('+10')).toBeInTheDocument()
  vi.advanceTimersByTime(2001)
  await waitFor(() => expect(screen.queryByText('+10')).toBeNull())
  vi.useRealTimers()
})
```

**Step 3: Implement delta display**

Add `energyDelta` prop to ResourceBar. Show `+N` in green or `-N` in red next to the Energy value. Auto-clear after 2 seconds using `useEffect` + `setTimeout`.

**Step 4: Run tests**

```bash
npm run test:run -- --grep "ResourceBar"
```

**Step 5: Commit**

```bash
git add src/components/game/ResourceBar.tsx
git commit -m "feat(ui): ResourceBar shows live Energy +/- delta on token spend"
```

---

## Task 11: Update Playwright e2e tests

**Files:**
- Modify: `playwright/tests/03-blockchain.spec.ts`
- Modify: `playwright/tests/02-terminal.spec.ts`

**Step 1: Update terminal tests for bubble-click UI**

In `02-terminal.spec.ts`, replace any `.fill()` or `type` actions on text input with `.click()` on choice buttons:

```typescript
// Before:
await page.getByPlaceholder('Enter command').fill('1')
await page.keyboard.press('Enter')

// After:
await page.locator('.terminal-choice-bubble').first().click()
```

**Step 2: Add minigrid visibility test**

```typescript
// In 03-blockchain.spec.ts:
test('minigrid sub-cells appear at high zoom', async ({ seededPage: page }) => {
  await page.goto('/game')
  await page.waitForSelector('[data-testid="galaxy-canvas"]')

  // Zoom in via scroll
  await page.mouse.wheel(0, -500)
  await page.mouse.wheel(0, -500)
  await page.mouse.wheel(0, -500)

  // Minigrid grid lines should appear
  await expect(page.locator('[data-testid="minigrid-layer"]')).toBeVisible({ timeout: 5000 })
})
```

**Step 3: Run full e2e suite**

```bash
npx playwright test --reporter=list
```
Expected: all 22+ tests PASS

**Step 4: Commit**

```bash
git add playwright/tests/
git commit -m "test(e2e): update terminal tests for bubble-click UI, add minigrid zoom test"
```

---

## Task 12: Final integration check + push

**Step 1: Run all unit tests**

```bash
npm run test:run
```
Expected: all PASS

**Step 2: Run e2e suite**

```bash
npx playwright test
```
Expected: all PASS

**Step 3: Build check**

```bash
npm run build
```
Expected: build succeeds with no TypeScript errors

**Step 4: Final commit + push**

```bash
git status  # verify no untracked source files
git push origin exodus-dev
```

**Step 5: Invoke finishing-a-development-branch skill**

Use `superpowers:finishing-a-development-branch` to decide on merge/PR strategy.

---

## Open Items (resolve in implementation)

These values are TBD — pick reasonable defaults and note them in code as `// TBD: tune this`:

- `ENERGY_RATES` per tier (currently: community=0.01, pro=0.02, max=0.04 tokens/energy)
- Energy cost per secured slot per turn
- AGNTC reward rate per filled slot per block
- Data packet size per tier (Community / Professional / Max bytes)
- Whether unsecured data is lost or just stops earning (recommend: just stops earning, never lost)
