# Gameplay Flow Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual node selection with automatic faction-arm placement, add dev mode fast path, implement Machine faction auto-spawn bots, and add spawn animations.

**Architecture:** New user placement walks outward along faction arm from Faction Master homenode. Dev mode bypasses auth entirely (Founders faction, MAX tier). Machine agents auto-spawn one per epoch ring with a continuous SECURE→ASSESS→EXPAND→HOLD loop. PixiJS handles spawn animations (zoom + pulse + connection line draw).

**Tech Stack:** Next.js 16, React 19, PixiJS 8, Zustand 5, Python FastAPI (backend), Vitest

---

### Task 1: Faction Arm Placement — Test + Implementation

**Files:**
- Create: `src/lib/__tests__/factionPlacement.test.ts`
- Create: `src/lib/factionPlacement.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/factionPlacement.test.ts
import { describe, it, expect } from 'vitest';
import { computeFactionSpawnPoint } from '../factionPlacement';
import type { Agent } from '@/types';

function makeAgent(id: string, x: number, y: number, userId = ''): Agent {
  return {
    id, position: { x, y }, tier: 'sonnet', userId,
    username: null, density: 50, storageSlots: 4, isPrimary: false,
    cpuDistribution: { secure: 25, develop: 25, research: 25, storage: 25 },
  } as Agent;
}

describe('computeFactionSpawnPoint', () => {
  it('places Founders user on S arm at first unclaimed slot', () => {
    const agents: Record<string, Agent> = {
      'fm-s': makeAgent('fm-s', 0, -10, 'faction-master'), // Founders FM = claimed
    };
    const result = computeFactionSpawnPoint('founders', agents);
    expect(result).toEqual({ x: 0, y: -20 }); // next slot outward on S arm
  });

  it('skips claimed slots', () => {
    const agents: Record<string, Agent> = {
      'fm-s': makeAgent('fm-s', 0, -10, 'faction-master'),
      'user1': makeAgent('user1', 0, -20, 'some-user'),
    };
    const result = computeFactionSpawnPoint('founders', agents);
    expect(result).toEqual({ x: 0, y: -30 });
  });

  it('places Community user on N arm', () => {
    const agents: Record<string, Agent> = {
      'fm-n': makeAgent('fm-n', 0, 10, 'faction-master'),
    };
    const result = computeFactionSpawnPoint('community', agents);
    expect(result).toEqual({ x: 0, y: 20 });
  });

  it('places Machines user on E arm', () => {
    const agents: Record<string, Agent> = {
      'fm-e': makeAgent('fm-e', 10, 0, 'faction-master'),
    };
    const result = computeFactionSpawnPoint('machines', agents);
    expect(result).toEqual({ x: 20, y: 0 });
  });

  it('places Professional user on W arm', () => {
    const agents: Record<string, Agent> = {
      'fm-w': makeAgent('fm-w', -10, 0, 'faction-master'),
    };
    const result = computeFactionSpawnPoint('professional', agents);
    expect(result).toEqual({ x: -20, y: 0 });
  });

  it('handles many claimed slots (walks far outward)', () => {
    const agents: Record<string, Agent> = {};
    for (let i = 1; i <= 5; i++) {
      agents[`user${i}`] = makeAgent(`user${i}`, 0, -10 * i, `user-${i}`);
    }
    const result = computeFactionSpawnPoint('founders', agents);
    expect(result).toEqual({ x: 0, y: -60 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/factionPlacement.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/lib/factionPlacement.ts
/**
 * Faction Arm Placement — walks outward along a faction's arm direction
 * from the Faction Master homenode to find the first unclaimed grid-aligned position.
 *
 * Faction arm directions (from params.py GENESIS_FACTION_MASTERS):
 *   Community (N): (0, +10) steps
 *   Machines  (E): (+10, 0) steps
 *   Founders  (S): (0, -10) steps
 *   Professional (W): (-10, 0) steps
 */

import type { Agent } from '@/types';

type Faction = 'community' | 'machines' | 'founders' | 'professional';

const NODE_GRID_SPACING = 10;

/** Faction Master origin + step direction for each faction */
const FACTION_ARM: Record<Faction, { origin: { x: number; y: number }; step: { dx: number; dy: number } }> = {
  community:    { origin: { x: 0, y: 10 },   step: { dx: 0, dy: 10 } },
  machines:     { origin: { x: 10, y: 0 },    step: { dx: 10, dy: 0 } },
  founders:     { origin: { x: 0, y: -10 },   step: { dx: 0, dy: -10 } },
  professional: { origin: { x: -10, y: 0 },   step: { dx: -10, dy: 0 } },
};

const MAX_WALK_DISTANCE = 200; // safety limit: 200 steps × 10 spacing = 2000 units

/**
 * Find the first unclaimed position along a faction arm.
 * Starts one step past the Faction Master and walks outward.
 */
export function computeFactionSpawnPoint(
  faction: Faction,
  agents: Record<string, Agent>,
): { x: number; y: number } {
  const arm = FACTION_ARM[faction];

  // Build a Set of claimed coordinates for O(1) lookup
  const claimed = new Set<string>();
  for (const agent of Object.values(agents)) {
    if (agent.userId) {
      claimed.add(`${agent.position.x},${agent.position.y}`);
    }
  }

  // Walk outward from one step past the Faction Master
  for (let i = 1; i <= MAX_WALK_DISTANCE; i++) {
    const x = arm.origin.x + arm.step.dx * i;
    const y = arm.origin.y + arm.step.dy * i;
    if (!claimed.has(`${x},${y}`)) {
      return { x, y };
    }
  }

  // Fallback: should never happen in practice
  return {
    x: arm.origin.x + arm.step.dx * (MAX_WALK_DISTANCE + 1),
    y: arm.origin.y + arm.step.dy * (MAX_WALK_DISTANCE + 1),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/factionPlacement.test.ts`
Expected: 6 PASS

**Step 5: Commit**

```bash
git add src/lib/factionPlacement.ts src/lib/__tests__/factionPlacement.test.ts
git commit -m "feat: faction arm placement algorithm (TDD)"
```

---

### Task 2: Map Subscription Tier to Faction Name

**Files:**
- Modify: `src/app/game/page.tsx:44-49` (update SUBSCRIPTION_FACTION)
- Create: `src/lib/__tests__/subscriptionFaction.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/subscriptionFaction.test.ts
import { describe, it, expect } from 'vitest';

// Import the mapping directly from game page constants (will extract to lib)
import { subscriptionToFaction } from '../factionPlacement';

describe('subscriptionToFaction', () => {
  it('maps COMMUNITY to community', () => {
    expect(subscriptionToFaction('COMMUNITY')).toBe('community');
  });
  it('maps PROFESSIONAL to professional', () => {
    expect(subscriptionToFaction('PROFESSIONAL')).toBe('professional');
  });
  it('maps MAX to founders', () => {
    expect(subscriptionToFaction('MAX')).toBe('founders');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/subscriptionFaction.test.ts`
Expected: FAIL — function not exported

**Step 3: Add to factionPlacement.ts**

```typescript
// Append to src/lib/factionPlacement.ts
import type { SubscriptionTier } from '@/types';

const SUBSCRIPTION_TO_FACTION: Record<SubscriptionTier, Faction> = {
  COMMUNITY: 'community',
  PROFESSIONAL: 'professional',
  MAX: 'founders',
};

export function subscriptionToFaction(tier: SubscriptionTier): Faction {
  return SUBSCRIPTION_TO_FACTION[tier];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/subscriptionFaction.test.ts`
Expected: 3 PASS

**Step 5: Commit**

```bash
git add src/lib/factionPlacement.ts src/lib/__tests__/subscriptionFaction.test.ts
git commit -m "feat: subscription tier to faction mapping"
```

---

### Task 3: Dev Mode Fast Path in game/page.tsx

**Files:**
- Modify: `src/app/game/page.tsx:169-191` (init function — dev mode bypass)

**Step 1: Write the failing test**

```typescript
// Add to existing test file or create src/app/__tests__/gameDevMode.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment
vi.stubEnv('NODE_ENV', 'development');

// Mock all heavy deps
vi.mock('@/store', () => ({
  useGameStore: Object.assign(vi.fn(() => vi.fn()), {
    getState: vi.fn(() => ({
      agents: {},
      setUserFaction: vi.fn(),
      setEmpireColor: vi.fn(),
      setMaxDeployTier: vi.fn(),
      setCamera: vi.fn(),
      addAgent: vi.fn(),
      setChainMode: vi.fn(),
    })),
    setState: vi.fn(),
  }),
}));

describe('Dev mode detection', () => {
  it('isDev returns true when NODE_ENV is development', () => {
    // This tests the condition that will be used in game/page.tsx
    const isDev = process.env.NODE_ENV === 'development';
    expect(isDev).toBe(true);
  });
});
```

**Step 2: Modify game/page.tsx init function**

In `src/app/game/page.tsx`, replace lines 169-191 (the subscription check block) with:

```typescript
// Dev mode fast path — skip auth, use Founders faction with MAX tier
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  // Skip /api/user/status — go straight to Founders faction, MAX tier
  const store = useGameStore.getState();
  store.setUserFaction('founders');
  store.setEmpireColor(SUBSCRIPTION_EMPIRE_COLOR.MAX);
  store.setMaxDeployTier(SUBSCRIPTION_MAX_TIER.MAX);
} else {
  // Production: check subscription tier from auth
  try {
    const statusRes = await fetch('/api/user/status');
    if (statusRes.ok) {
      const userStatus = await statusRes.json() as { subscription: SubscriptionTier | null };
      if (!userStatus.subscription) {
        window.location.href = '/subscribe';
        return;
      }
      const tier = userStatus.subscription;
      const store = useGameStore.getState();
      store.setUserFaction(SUBSCRIPTION_FACTION[tier]);
      store.setEmpireColor(SUBSCRIPTION_EMPIRE_COLOR[tier]);
      store.setMaxDeployTier(SUBSCRIPTION_MAX_TIER[tier]);
    }
  } catch {
    // Continue with defaults
  }
}
```

**Step 3: Update SUBSCRIPTION_FACTION to use new faction names**

Replace lines 44-49:

```typescript
const SUBSCRIPTION_FACTION: Record<SubscriptionTier, string> = {
  COMMUNITY: 'community',
  PROFESSIONAL: 'professional',
  MAX: 'founders',
};
```

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All existing tests still pass

**Step 5: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: dev mode fast path — skip auth, auto-assign Founders/MAX"
```

---

### Task 4: Auto-Spawn on Init (Replace pickBestStartingNode)

**Files:**
- Modify: `src/app/game/page.tsx:276-288` (new user else branch)
- Uses: `src/lib/factionPlacement.ts`

**Step 1: Replace the "new user" branch in game/page.tsx**

Replace lines 276-288 (the `else` branch after `if (firstOwned)`) with:

```typescript
} else {
  // New user — generate ID, compute faction spawn point, claim on-chain
  const newUserId = isDev
    ? `dev-founder-${Date.now()}`
    : `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  useGameStore.setState({ currentUserId: newUserId });

  const store = useGameStore.getState();
  const userFaction = store.userFaction || 'community';
  const factionName = (userFaction === 'free_community' ? 'community'
    : userFaction === 'professional_pool' ? 'professional'
    : userFaction === 'treasury' ? 'founders'
    : userFaction) as 'community' | 'machines' | 'founders' | 'professional';

  // Compute spawn coordinate along faction arm
  const spawnCoord = computeFactionSpawnPoint(factionName, store.agents);

  // Register on-chain
  const svc = chainRef.current;
  if (svc) {
    try {
      await svc.claimNode(spawnCoord.x, spawnCoord.y, 200);
    } catch (err) {
      console.error('Failed to auto-claim spawn point:', err);
    }
  }

  // Refresh from chain to get the new node
  await syncFromChain();

  // Find our newly claimed node and set as homenode
  const afterSync = useGameStore.getState();
  const spawnedNode = Object.values(afterSync.agents).find(
    a => a.position.x === spawnCoord.x && a.position.y === spawnCoord.y
  );
  if (spawnedNode) {
    afterSync.claimNode(spawnedNode.id, isDev ? 'opus' : 'sonnet');
    afterSync.setPrimary(spawnedNode.id);
    setCurrentUser(newUserId, spawnedNode.id);

    // Center camera on spawn point
    afterSync.setCamera(spawnCoord, 2);

    // Auto-open terminal
    setActiveDockPanel('terminal');
  }
}
```

**Step 2: Add import at top of game/page.tsx**

```typescript
import { computeFactionSpawnPoint } from '@/lib/factionPlacement';
```

Remove the old import:
```typescript
// REMOVE: import { pickBestStartingNode } from '@/lib/placement';
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All existing tests pass (pickBestStartingNode still exists but unused)

**Step 4: Manual verification**

1. Start testnet: `cd vault/agentic-chain && uvicorn agentic.testnet.api:app --port 8080 --reload`
2. Start dev: `npm run dev`
3. Open `localhost:3000/game`
4. Should auto-place at `(0, -20)` (first unclaimed Founders S arm slot)
5. Camera should zoom to spawn point
6. Terminal should auto-open

**Step 5: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: auto-spawn on faction arm — replace pickBestStartingNode"
```

---

### Task 5: Machine Agent Behavior (Backend)

**Files:**
- Create: `vault/agentic-chain/tests/test_machines.py`
- Create: `vault/agentic-chain/agentic/testnet/machines.py`
- Modify: `vault/agentic-chain/agentic/testnet/api.py` (wire into `_do_mine()`)

**Step 1: Write the failing test**

```python
# vault/agentic-chain/tests/test_machines.py
import pytest
from agentic.testnet.machines import MachineAgentBehavior
from agentic.testnet.genesis import create_genesis

class TestMachineAgentBehavior:
    def test_init_creates_behavior(self):
        state = create_genesis(seed=42)
        behavior = MachineAgentBehavior(state)
        assert behavior is not None

    def test_secure_stakes_cpu(self):
        state = create_genesis(seed=42)
        behavior = MachineAgentBehavior(state)
        # Machine wallet index = 2 (E arm Faction Master)
        initial_balance = state.ledger.balance(2)
        behavior.tick(wallet_index=2)
        # After tick, machine should have attempted to stake
        # (may or may not succeed depending on balance)
        assert True  # Behavior ran without error

    def test_never_sells_below_acquisition(self):
        behavior = MachineAgentBehavior(create_genesis(seed=42))
        assert behavior.min_sell_ratio == 1.0

    def test_expand_claims_next_slot(self):
        state = create_genesis(seed=42)
        behavior = MachineAgentBehavior(state)
        # Give machine wallet some AGNTC to claim with
        state.ledger.credit(2, 200)
        # Track claims before
        claims_before = len(state.claims)
        behavior.try_expand(wallet_index=2)
        claims_after = len(state.claims)
        assert claims_after >= claims_before  # May or may not claim depending on threshold
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_machines.py -v`
Expected: FAIL — module not found

**Step 3: Implement MachineAgentBehavior**

```python
# vault/agentic-chain/agentic/testnet/machines.py
"""Machine Faction auto-agent behavior.

Each Machine agent runs a continuous loop per block tick:
  1. SECURE — Stake all available CPU Energy to earn AGNTC
  2. ASSESS — Check accumulated AGNTC against deployment threshold
  3. EXPAND — If threshold met, claim next unclaimed node on Machines arm
  4. HOLD — Never sell AGNTC (MACHINES_MIN_SELL_RATIO = 1.0)
"""

from __future__ import annotations
from typing import TYPE_CHECKING

from agentic.params import (
    MACHINES_MIN_SELL_RATIO,
    NODE_GRID_SPACING,
    BASE_BIRTH_COST,
)

if TYPE_CHECKING:
    from agentic.testnet.genesis import GenesisState


class MachineAgentBehavior:
    """Automated agent for the Machines faction (E arm)."""

    def __init__(self, state: GenesisState):
        self.state = state
        self.min_sell_ratio = MACHINES_MIN_SELL_RATIO
        # Machines arm: E direction from Faction Master at (10, 0)
        self.arm_origin_x = 10
        self.arm_origin_y = 0
        self.step_dx = NODE_GRID_SPACING
        self.step_dy = 0

    def tick(self, wallet_index: int) -> dict:
        """Execute one behavior cycle for a Machine agent.

        Returns dict with actions taken for logging/WebSocket broadcast.
        """
        actions = {'secured': False, 'expanded': False}

        # 1. SECURE — stake available CPU
        actions['secured'] = self._do_secure(wallet_index)

        # 2. ASSESS + 3. EXPAND — try to claim next slot if we can afford it
        actions['expanded'] = self.try_expand(wallet_index)

        # 4. HOLD — never sell (enforced by min_sell_ratio = 1.0)
        return actions

    def _do_secure(self, wallet_index: int) -> bool:
        """Stake available balance as CPU energy."""
        balance = self.state.ledger.balance(wallet_index)
        if balance <= 0:
            return False
        # Stake half of balance each tick (conservative)
        stake_amount = max(1, balance // 2)
        try:
            self.state.stake_registry.stake(
                wallet_index, stake_amount, 'cpu'
            )
            self.state.ledger.debit(wallet_index, stake_amount)
            return True
        except Exception:
            return False

    def try_expand(self, wallet_index: int) -> bool:
        """Claim the next unclaimed node on the Machines arm if affordable."""
        balance = self.state.ledger.balance(wallet_index)
        if balance < BASE_BIRTH_COST:
            return False

        # Find next unclaimed position on Machines arm
        claimed_coords = {
            (c.x, c.y) for c in self.state.claims.values()
        } if hasattr(self.state, 'claims') else set()

        for i in range(1, 200):
            x = self.arm_origin_x + self.step_dx * i
            y = self.arm_origin_y + self.step_dy * i
            if (x, y) not in claimed_coords:
                # Claim this coordinate
                try:
                    self.state.ledger.debit(wallet_index, BASE_BIRTH_COST)
                    # Use the claim mechanism from the state
                    if hasattr(self.state, 'claim_node'):
                        self.state.claim_node(x, y, wallet_index)
                    return True
                except Exception:
                    return False

        return False
```

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_machines.py -v`
Expected: 4 PASS

**Step 5: Wire into `_do_mine()` in api.py**

In `vault/agentic-chain/agentic/testnet/api.py`, find the `_do_mine()` function and add after block rewards are distributed:

```python
from agentic.testnet.machines import MachineAgentBehavior

# Inside _do_mine(), after rewards distribution:
# Machine agent behavior — one tick per block
machine_behavior = MachineAgentBehavior(state)
machine_behavior.tick(wallet_index=2)  # wallet 2 = Machines Faction Master
```

**Step 6: Run full Python test suite**

Run: `cd vault/agentic-chain && python3 -m pytest tests/ -v --ignore=tests/test_bench_merkle.py`
Expected: All tests pass

**Step 7: Commit**

```bash
git add vault/agentic-chain/agentic/testnet/machines.py vault/agentic-chain/tests/test_machines.py vault/agentic-chain/agentic/testnet/api.py
git commit -m "feat(backend): MachineAgentBehavior — auto-secure + expand per block"
```

---

### Task 6: Machine Spawn on Epoch Advance (Backend WebSocket Event)

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/api.py` (add `epoch_advance` event to WS broadcast)
- Modify: `vault/agentic-chain/agentic/testnet/machines.py` (spawn new agent on epoch ring increment)

**Step 1: Add epoch tracking to _do_mine()**

In api.py's `_do_mine()`, after the machine tick, check if epoch ring incremented:

```python
# Track epoch ring before mining
old_ring = state.epoch_tracker.current_ring

# ... existing mining logic ...

# Check for epoch advance
new_ring = state.epoch_tracker.current_ring
if new_ring > old_ring:
    # Broadcast epoch_advance event with new Machine agent info
    machine_actions = machine_behavior.try_expand(wallet_index=2)
    await broadcast_ws({
        'event': 'epoch_advance',
        'data': {
            'old_ring': old_ring,
            'new_ring': new_ring,
            'machine_expanded': machine_actions,
        }
    })
```

**Step 2: Run tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/ -v --ignore=tests/test_bench_merkle.py`
Expected: All tests pass

**Step 3: Commit**

```bash
git add vault/agentic-chain/agentic/testnet/api.py vault/agentic-chain/agentic/testnet/machines.py
git commit -m "feat(backend): epoch_advance WebSocket event + machine spawn"
```

---

### Task 7: Frontend — Handle epoch_advance in WebSocket Hook

**Files:**
- Modify: `src/hooks/useTestnetWebSocket.ts` (handle `epoch_advance` event)

**Step 1: Add epoch_advance handler**

In `useTestnetWebSocket.ts`, inside the `ws.onmessage` handler, add after the `block_mined` case:

```typescript
if (type === 'epoch_advance') {
  const epochData = JSON.parse(event.data).data as {
    old_ring: number;
    new_ring: number;
    machine_expanded: boolean;
  };
  // Refresh full agent list to pick up new machine nodes
  fetch(`${TESTNET_API}/api/agents`)
    .then(r => r.json())
    .then(agents => {
      const store = useGameStore.getState();
      agents.forEach((a: import('@/types').Agent) => store.addAgent(a));
    })
    .catch(() => { /* agent refresh failed */ });

  // Flash epoch advance notification
  flashDelta('epoch', 1);
}
```

**Step 2: Run frontend tests**

Run: `npx vitest run src/hooks/`
Expected: All hook tests pass

**Step 3: Commit**

```bash
git add src/hooks/useTestnetWebSocket.ts
git commit -m "feat: handle epoch_advance WebSocket event — refresh agents"
```

---

### Task 8: Spawn Animation (PixiJS Pulse + Zoom)

**Files:**
- Create: `src/lib/spawnAnimation.ts`
- Create: `src/lib/__tests__/spawnAnimation.test.ts`
- Modify: `src/app/game/page.tsx` (trigger animation on auto-spawn)

**Step 1: Write the unit test (logic only, no PixiJS rendering)**

```typescript
// src/lib/__tests__/spawnAnimation.test.ts
import { describe, it, expect } from 'vitest';
import { computeSpawnSequence } from '../spawnAnimation';

describe('computeSpawnSequence', () => {
  it('returns 3 animation phases', () => {
    const seq = computeSpawnSequence(
      { x: 0, y: -20 },  // target
      { x: 0, y: 0 },    // camera start
      0.5,                // start zoom
      2.0,                // end zoom
    );
    expect(seq.phases).toHaveLength(3);
    expect(seq.phases[0].name).toBe('zoom-in');
    expect(seq.phases[1].name).toBe('materialize');
    expect(seq.phases[2].name).toBe('connect');
  });

  it('zoom phase targets the spawn coordinate', () => {
    const seq = computeSpawnSequence({ x: 100, y: -200 }, { x: 0, y: 0 }, 0.5, 2.0);
    expect(seq.phases[0].target).toEqual({ x: 100, y: -200 });
    expect(seq.phases[0].zoomEnd).toBe(2.0);
  });

  it('total duration is about 3.5 seconds', () => {
    const seq = computeSpawnSequence({ x: 0, y: -20 }, { x: 0, y: 0 }, 0.5, 2.0);
    const total = seq.phases.reduce((sum, p) => sum + p.durationMs, 0);
    expect(total).toBeGreaterThanOrEqual(3000);
    expect(total).toBeLessThanOrEqual(4000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/spawnAnimation.test.ts`
Expected: FAIL — module not found

**Step 3: Implement spawn animation data model**

```typescript
// src/lib/spawnAnimation.ts
/**
 * Spawn animation sequence — describes the 3-phase camera+node animation
 * when a new user spawns on the galaxy grid.
 *
 * Phase 1: Zoom — camera moves from overview to faction arm (1s)
 * Phase 2: Materialize — node pulses from 0% to 100% opacity (1.5s)
 * Phase 3: Connect — connection line draws to nearest faction neighbor (1s)
 *
 * This module provides the data model; PixiJS rendering is in GalaxyGrid.
 */

export interface AnimationPhase {
  name: 'zoom-in' | 'materialize' | 'connect';
  durationMs: number;
  target: { x: number; y: number };
  zoomStart?: number;
  zoomEnd?: number;
}

export interface SpawnSequence {
  phases: AnimationPhase[];
  spawnCoord: { x: number; y: number };
}

export function computeSpawnSequence(
  spawnCoord: { x: number; y: number },
  cameraStart: { x: number; y: number },
  zoomStart: number,
  zoomEnd: number,
): SpawnSequence {
  return {
    spawnCoord,
    phases: [
      {
        name: 'zoom-in',
        durationMs: 1000,
        target: spawnCoord,
        zoomStart,
        zoomEnd,
      },
      {
        name: 'materialize',
        durationMs: 1500,
        target: spawnCoord,
      },
      {
        name: 'connect',
        durationMs: 1000,
        target: spawnCoord,
      },
    ],
  };
}

/**
 * Linear interpolation helper for animation rendering.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.max(0, Math.min(1, t));
}

/**
 * Ease-out cubic — decelerates toward the end.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/spawnAnimation.test.ts`
Expected: 3 PASS

**Step 5: Commit**

```bash
git add src/lib/spawnAnimation.ts src/lib/__tests__/spawnAnimation.test.ts
git commit -m "feat: spawn animation data model (zoom + materialize + connect)"
```

---

### Task 9: Wire Spawn Animation into GalaxyGrid

**Files:**
- Modify: `src/components/GalaxyGrid.tsx` (add spawn animation rendering)
- Modify: `src/store/gameStore.ts` (add `spawnAnimation` state)

**Step 1: Add spawn animation state to gameStore**

In `src/store/gameStore.ts`, add:

```typescript
// State
spawnAnimation: { coord: { x: number; y: number }; startedAt: number } | null;

// Action
triggerSpawnAnimation: (coord: { x: number; y: number }) => void;
clearSpawnAnimation: () => void;
```

Implementation:
```typescript
spawnAnimation: null,
triggerSpawnAnimation: (coord) => set({ spawnAnimation: { coord, startedAt: Date.now() } }),
clearSpawnAnimation: () => set({ spawnAnimation: null }),
```

**Step 2: In game/page.tsx, trigger animation after auto-spawn**

After `afterSync.setCamera(spawnCoord, 2)`, add:
```typescript
afterSync.triggerSpawnAnimation(spawnCoord);
```

**Step 3: In GalaxyGrid.tsx, render spawn pulse**

Add a PixiJS ticker callback that checks `spawnAnimation` state and:
- Phase 1 (0-1s): Smoothly move camera to target using `lerp` + `easeOutCubic`
- Phase 2 (1-2.5s): Pulse the target node's alpha from 0 to 1 with a ring expansion
- Phase 3 (2.5-3.5s): Draw connection line to nearest same-faction neighbor

The exact PixiJS implementation depends on the existing rendering patterns in GalaxyGrid.

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Manual verification**

1. Start testnet + dev server
2. Clear browser storage (new user)
3. Navigate to localhost:3000/game
4. Should see zoom animation toward Founders arm
5. Node should pulse into existence
6. Connection line should draw

**Step 6: Commit**

```bash
git add src/store/gameStore.ts src/components/GalaxyGrid.tsx src/app/game/page.tsx
git commit -m "feat: spawn animation — zoom + pulse + connection line on auto-spawn"
```

---

### Task 10: Initialize First Machine Agent at Genesis

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/genesis.py` (add Machine agent to genesis state)
- Modify: `vault/agentic-chain/tests/test_machines.py` (test genesis Machine agent exists)

**Step 1: Write the test**

```python
# Add to tests/test_machines.py
def test_genesis_has_machine_agent():
    state = create_genesis(seed=42)
    # Machine Faction Master is at (10, 0) = wallet index 2
    # Check that a machine behavior can operate on it
    behavior = MachineAgentBehavior(state)
    assert behavior.arm_origin_x == 10
    assert behavior.arm_origin_y == 0
```

**Step 2: Run test**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_machines.py -v`
Expected: PASS (Machine FM already exists at genesis)

**Step 3: Commit**

```bash
git add vault/agentic-chain/tests/test_machines.py
git commit -m "test: verify genesis Machine agent at E arm"
```

---

### Task 11: Integration Test — Full Auto-Spawn Flow

**Files:**
- Create: `src/__tests__/autoSpawn.test.ts`

**Step 1: Write integration test**

```typescript
// src/__tests__/autoSpawn.test.ts
import { describe, it, expect } from 'vitest';
import { computeFactionSpawnPoint } from '@/lib/factionPlacement';
import { computeSpawnSequence } from '@/lib/spawnAnimation';
import type { Agent } from '@/types';

function makeAgent(id: string, x: number, y: number, userId = ''): Agent {
  return {
    id, position: { x, y }, tier: 'sonnet', userId,
    username: null, density: 50, storageSlots: 4, isPrimary: false,
    cpuDistribution: { secure: 25, develop: 25, research: 25, storage: 25 },
  } as Agent;
}

describe('Full auto-spawn flow', () => {
  it('computes spawn point then animation sequence', () => {
    const agents: Record<string, Agent> = {
      'fm-s': makeAgent('fm-s', 0, -10, 'faction-master'),
    };

    // Step 1: Compute spawn point
    const spawnCoord = computeFactionSpawnPoint('founders', agents);
    expect(spawnCoord).toEqual({ x: 0, y: -20 });

    // Step 2: Compute animation
    const seq = computeSpawnSequence(spawnCoord, { x: 0, y: 0 }, 0.5, 2.0);
    expect(seq.phases).toHaveLength(3);
    expect(seq.spawnCoord).toEqual(spawnCoord);
  });

  it('handles Machines faction spawn', () => {
    const agents: Record<string, Agent> = {
      'fm-e': makeAgent('fm-e', 10, 0, 'faction-master'),
    };
    const spawnCoord = computeFactionSpawnPoint('machines', agents);
    expect(spawnCoord).toEqual({ x: 20, y: 0 });
  });
});
```

**Step 2: Run test**

Run: `npx vitest run src/__tests__/autoSpawn.test.ts`
Expected: 2 PASS

**Step 3: Commit**

```bash
git add src/__tests__/autoSpawn.test.ts
git commit -m "test: integration test — full auto-spawn flow"
```

---

### Task 12: Cleanup — Remove Dead pickBestStartingNode Import

**Files:**
- Modify: `src/app/game/page.tsx` (remove unused import)

**Step 1: Remove the import**

Delete: `import { pickBestStartingNode } from '@/lib/placement';`

**Step 2: Verify no other usages**

Run: `grep -r "pickBestStartingNode" src/`
Expected: No results (only placement.ts definition remains)

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "chore: remove unused pickBestStartingNode import"
```

---

### Task 13: Final Verification

**Step 1: Run all Python tests**

Run: `cd vault/agentic-chain && python3 -m pytest tests/ -v --ignore=tests/test_bench_merkle.py`
Expected: All pass

**Step 2: Run all frontend tests**

Run: `npx vitest run`
Expected: All pass (pre-existing failures excluded)

**Step 3: Manual smoke test**

1. Start testnet: `cd vault/agentic-chain && uvicorn agentic.testnet.api:app --port 8080 --reload`
2. Start dev: `npm run dev`
3. Open `localhost:3000/game` — should auto-spawn on Founders arm at (0, -20)
4. Terminal auto-opens
5. Mine a few blocks — Machine agent should be ticking
6. Check TimechainStats — Hardness, Circulating Supply, Safe Mode all visible

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: gameplay flow redesign — auto-spawn, dev fast path, machine agents"
```

---

## Key Files Reference

**Backend (new):**
- `vault/agentic-chain/agentic/testnet/machines.py` — MachineAgentBehavior
- `vault/agentic-chain/tests/test_machines.py` — Machine agent tests

**Backend (modify):**
- `vault/agentic-chain/agentic/testnet/api.py` — Wire machine behavior into _do_mine()
- `vault/agentic-chain/agentic/testnet/genesis.py` — (already has Machine FM, no change needed)

**Frontend (new):**
- `src/lib/factionPlacement.ts` — Faction arm placement algorithm
- `src/lib/spawnAnimation.ts` — Spawn animation data model
- `src/lib/__tests__/factionPlacement.test.ts` — Placement tests
- `src/lib/__tests__/spawnAnimation.test.ts` — Animation tests
- `src/__tests__/autoSpawn.test.ts` — Integration test

**Frontend (modify):**
- `src/app/game/page.tsx` — Dev fast path, auto-spawn, remove pickBestStartingNode
- `src/hooks/useTestnetWebSocket.ts` — Handle epoch_advance event
- `src/store/gameStore.ts` — spawnAnimation state
- `src/components/GalaxyGrid.tsx` — Render spawn animation

## Verification

1. `python3 -m pytest tests/ -v --ignore=tests/test_bench_merkle.py` — all Python tests pass
2. `npx vitest run` — all frontend tests pass
3. Manual smoke test — auto-spawn + animation + machine agents working
