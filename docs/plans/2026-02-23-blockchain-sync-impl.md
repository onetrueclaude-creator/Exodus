# Blockchain Sync — Supabase Middleware Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Supabase the sole read source for blockchain grid state — Python syncs after each block, frontend never polls the Python API for grid data on startup.

**Architecture:** Three targeted fixes: (1) correct coordinate mapping in Python's Supabase sync, (2) add real-time chain_messages sync from Python, (3) remove Python cold-start read from game/page.tsx, replacing it with Supabase-only hydration. Write actions (claim, mine, deploy) still go directly to Python API — only reads move to Supabase.

**Tech Stack:** Python 3.11 + supabase-py (backend sync), TypeScript + React 19 + Zustand 5 + @supabase/ssr (frontend), Vitest 4 (frontend tests), pytest (backend tests).

---

## Context for implementer

The codebase is a Next.js 16 game (`src/`) backed by a Python FastAPI blockchain server (`vault/agentic-chain/`). Supabase is the persistent middleware. Key files you will touch:

- `vault/agentic-chain/agentic/testnet/supabase_sync.py` — Python module that pushes chain state to Supabase after each block
- `vault/agentic-chain/agentic/testnet/api.py` — FastAPI server; `send_message` handler at line 776
- `src/hooks/useGameRealtime.ts` — React hook that hydrates game state from Supabase and subscribes to Realtime
- `src/app/game/page.tsx` — Game page; cold-start init block at lines 150–175

Run Python tests from `vault/agentic-chain/`:
```bash
cd vault/agentic-chain
python3 -m pytest tests/ -q
```

Run frontend tests from the repo root:
```bash
npm run test:run
```

---

## Task 1: Fix coordinate mapping in supabase_sync.py

The `_sync_agents()` function currently stores `visual_x = chain_x` (raw chain coords, line 163-164). The frontend expects visual coords scaled from `[-3240,3240]` to `[-4000,4000]`. Fix it.

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/supabase_sync.py:110-184`
- Create: `vault/agentic-chain/tests/test_supabase_sync.py`

**Step 1: Write the failing test**

Create `vault/agentic-chain/tests/test_supabase_sync.py`:

```python
"""Tests for supabase_sync coordinate helpers."""
import pytest
from agentic.testnet.supabase_sync import chain_to_visual


def test_origin_maps_to_zero():
    """Chain origin (0, 0) should map to visual (0.0, 0.0)."""
    vx, vy = chain_to_visual(0, 0)
    assert vx == 0.0
    assert vy == 0.0


def test_min_corner_maps_to_negative_half():
    """Chain (-3240, -3240) → visual (-4000.0, -4000.0)."""
    vx, vy = chain_to_visual(-3240, -3240)
    assert vx == pytest.approx(-4000.0, abs=0.1)
    assert vy == pytest.approx(-4000.0, abs=0.1)


def test_max_corner_maps_to_positive_half():
    """Chain (3240, 3240) → visual (4000.0, 4000.0)."""
    vx, vy = chain_to_visual(3240, 3240)
    assert vx == pytest.approx(4000.0, abs=0.1)
    assert vy == pytest.approx(4000.0, abs=0.1)


def test_result_is_rounded_to_two_decimals():
    """Output should be rounded to 2 decimal places."""
    vx, vy = chain_to_visual(100, 200)
    assert vx == round(vx, 2)
    assert vy == round(vy, 2)
```

**Step 2: Run test to verify it fails**

```bash
cd vault/agentic-chain
python3 -m pytest tests/test_supabase_sync.py -v
```

Expected: `ImportError: cannot import name 'chain_to_visual' from 'agentic.testnet.supabase_sync'`

**Step 3: Add `chain_to_visual` to supabase_sync.py**

Add these constants and function after the imports section (after line 29, before line 31 `# ---`):

```python
# ---------------------------------------------------------------------------
# Coordinate mapping — chain grid → visual grid
# ---------------------------------------------------------------------------

_CHAIN_MIN: int = -3240
_CHAIN_SPAN: float = 6480.0   # 3240 - (-3240)
_VISUAL_SPAN: float = 8000.0  # -4000 to +4000
_VISUAL_HALF: float = 4000.0


def chain_to_visual(cx: int, cy: int) -> tuple[float, float]:
    """Map chain coordinates [-3240,3240] to visual coordinates [-4000,4000].

    Matches the ``chainToVisual()`` transform in
    ``src/services/testnetChainService.ts``.
    """
    vx = ((cx - _CHAIN_MIN) / _CHAIN_SPAN) * _VISUAL_SPAN - _VISUAL_HALF
    vy = ((cy - _CHAIN_MIN) / _CHAIN_SPAN) * _VISUAL_SPAN - _VISUAL_HALF
    return round(vx, 2), round(vy, 2)
```

**Step 4: Apply the fix in `_sync_agents`**

In `_sync_agents()`, replace lines 163-164:
```python
            "visual_x": x,            # direct mapping for now
            "visual_y": y,
```
with:
```python
            "visual_x": chain_to_visual(x, y)[0],
            "visual_y": chain_to_visual(x, y)[1],
```

Or cleaner — compute once before the row dict:
```python
        visual_x, visual_y = chain_to_visual(x, y)

        row = {
            ...
            "visual_x": visual_x,
            "visual_y": visual_y,
            ...
        }
```

**Step 5: Run tests to verify they pass**

```bash
cd vault/agentic-chain
python3 -m pytest tests/test_supabase_sync.py -v
```

Expected: 4 tests PASS

**Step 6: Run full Python test suite to check no regressions**

```bash
cd vault/agentic-chain
python3 -m pytest tests/ -q
```

Expected: all existing tests PASS (387 tests)

**Step 7: Commit**

```bash
git add vault/agentic-chain/agentic/testnet/supabase_sync.py vault/agentic-chain/tests/test_supabase_sync.py
git commit -m "fix(sync): apply chainToVisual coord mapping in supabase_sync"
```

---

## Task 2: Add chain_messages sync to Python API

When a message is sent via POST `/api/message`, it's stored in-memory only. Sync it to the `chain_messages` Supabase table immediately so the frontend sees it in real time.

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/supabase_sync.py` — add `sync_message`
- Modify: `vault/agentic-chain/agentic/testnet/api.py:776-832` — call sync after message stored
- Modify: `vault/agentic-chain/tests/test_supabase_sync.py` — add test for new function

**Step 1: Write the failing test**

Add to `vault/agentic-chain/tests/test_supabase_sync.py`:

```python
def test_sync_message_signature_exists():
    """sync_message must exist and accept the expected arguments."""
    from agentic.testnet.supabase_sync import sync_message
    import inspect
    sig = inspect.signature(sync_message)
    params = list(sig.parameters.keys())
    assert "msg_id" in params
    assert "sx" in params
    assert "sy" in params
    assert "tx" in params
    assert "ty" in params
    assert "text" in params
    assert "timestamp" in params
```

**Step 2: Run test to verify it fails**

```bash
cd vault/agentic-chain
python3 -m pytest tests/test_supabase_sync.py::test_sync_message_signature_exists -v
```

Expected: `ImportError: cannot import name 'sync_message'`

**Step 3: Add `sync_message` to supabase_sync.py**

Add to the **Public API** section (after `sync_to_supabase`, before the `# Internal helpers` comment):

```python
def sync_message(
    msg_id: str,
    sx: int,
    sy: int,
    tx: int,
    ty: int,
    text: str,
    timestamp: float,
) -> None:
    """Upsert a single chain_message row to Supabase.

    Called immediately after a message is stored in-memory so it appears
    in the frontend without waiting for the next block mine.
    All exceptions are swallowed — messaging never crashes due to Supabase errors.
    """
    try:
        client = _get_client()
        client.table("chain_messages").upsert({
            "id": msg_id,
            "sender_chain_x": sx,
            "sender_chain_y": sy,
            "target_chain_x": tx,
            "target_chain_y": ty,
            "text": text,
            "timestamp": int(round(timestamp * 1000)),  # ms epoch
        }).execute()
    except Exception:
        pass  # never crash the API
```

**Step 4: Wire into api.py send_message handler**

In `api.py`, add the import at the top (find the existing supabase_sync import and add `sync_message`):

```python
from agentic.testnet.supabase_sync import sync_to_supabase, sync_message
```

In the `send_message` handler (around line 828, just before `return MessageResult(**msg)`), add:

```python
    # Sync to Supabase immediately — don't wait for next block
    sync_message(
        msg_id=msg_id,
        sx=sx, sy=sy,
        tx=tx, ty=ty,
        text=text,
        timestamp=now,
    )

    return MessageResult(**msg)
```

**Step 5: Run tests**

```bash
cd vault/agentic-chain
python3 -m pytest tests/test_supabase_sync.py -v
```

Expected: all 5 tests PASS

**Step 6: Run full suite**

```bash
cd vault/agentic-chain
python3 -m pytest tests/ -q
```

Expected: all existing tests PASS

**Step 7: Commit**

```bash
git add vault/agentic-chain/agentic/testnet/supabase_sync.py vault/agentic-chain/agentic/testnet/api.py vault/agentic-chain/tests/test_supabase_sync.py
git commit -m "feat(sync): sync chain_messages to Supabase immediately on send"
```

---

## Task 3: Add isReady to useGameRealtime.ts

`game/page.tsx` needs to know when the initial Supabase hydration is complete so it can stop showing a spinner. Add an `isReady` boolean that the hook returns.

**Files:**
- Modify: `src/hooks/useGameRealtime.ts:1-120`
- Create: `src/__tests__/hooks/useGameRealtime.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/hooks/useGameRealtime.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameRealtime } from '@/hooks/useGameRealtime'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      // For agents query (no .single())
    }),
    channel: () => ({
      on: function () { return this },
      subscribe: () => ({ unsubscribe: vi.fn() }),
    }),
  }),
}))

// Mock store actions
vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector: (s: unknown) => unknown) =>
    selector({
      setChainStatus: vi.fn(),
      syncAgentFromChain: vi.fn(),
    }),
}))

describe('useGameRealtime', () => {
  it('returns isReady=false before hydration, true after', async () => {
    const { result } = renderHook(() => useGameRealtime())
    expect(result.current.isReady).toBe(false)
    await waitFor(() => expect(result.current.isReady).toBe(true))
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/hooks/useGameRealtime.test.ts
```

Expected: FAIL — `result.current.isReady` is `undefined` (hook doesn't return it yet)

**Step 3: Update useGameRealtime.ts**

Add `useState` to the import and return `isReady`:

Replace the opening of the file (lines 1-6):
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import type { Database } from '@/lib/supabase/types'
```

Add `isReady` state inside `useGameRealtime` (after the two store selectors, line 38-39):
```typescript
export function useGameRealtime() {
  const setChainStatus = useGameStore(s => s.setChainStatus)
  const syncAgentFromChain = useGameStore(s => s.syncAgentFromChain)
  const [isReady, setIsReady] = useState(false)
```

In the `hydrate` function, add `setIsReady(true)` at the end — inside a `finally` block so it fires even on error:

Replace the `hydrate` function body:
```typescript
    async function hydrate() {
      try {
        const [{ data: chainStatus }, { data: agents }] = await Promise.all([
          supabase.from('chain_status').select('*').single(),
          supabase.from('agents').select('*'),
        ])

        if (chainStatus) {
          setChainStatus({
            poolRemaining: chainStatus.community_pool_remaining,
            totalMined: chainStatus.total_mined,
            stateRoot: chainStatus.state_root,
            nextBlockIn: chainStatus.next_block_in,
            blocks: chainStatus.blocks_processed,
          })
        }

        if (agents) {
          agents.forEach(row => syncAgentFromChain(rowToStoreAgent(row)))
        }
      } catch {
        // Supabase unavailable — proceed with empty grid
      } finally {
        setIsReady(true)
      }
    }
```

At the bottom of `useGameRealtime`, return `isReady`:
```typescript
  return { isReady }
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/hooks/useGameRealtime.test.ts
```

Expected: PASS

**Step 5: Run full frontend test suite**

```bash
npm run test:run
```

Expected: all existing tests PASS (179+)

**Step 6: Commit**

```bash
git add src/hooks/useGameRealtime.ts src/__tests__/hooks/useGameRealtime.test.ts
git commit -m "feat(realtime): expose isReady from useGameRealtime after hydration"
```

---

## Task 4: Remove Python cold-start from game/page.tsx

`game/page.tsx` currently calls `service.getAgents()` (Python API) on cold start (lines 161-162) and seeds the store from that. Replace this with: let `useGameRealtime` handle it, show a spinner until `isReady`.

**Files:**
- Modify: `src/app/game/page.tsx:29,67,150-175`

**Step 1: Check the existing test baseline**

```bash
npm run test:run
```

Expected: all tests pass. Note the count. This is your regression baseline.

**Step 2: Update the useGameRealtime call in game/page.tsx**

Find line 67:
```typescript
  useGameRealtime();
```

Change to:
```typescript
  const { isReady } = useGameRealtime();
```

**Step 3: Remove the Python agent fetch from the init function**

Find the `init` function (around line 150). It currently does:

```typescript
      const agentList = await service.getAgents();
      agentList.forEach(addAgent);

      const feed = await service.getHaikuFeed();
      feed.forEach(addHaiku);

      const firstOwned = agentList.find(a => a.userId !== '');
```

Replace with (remove the `getAgents` call, keep `getHaikuFeed` and owned agent detection via store):

```typescript
      const feed = await service.getHaikuFeed();
      feed.forEach(addHaiku);

      // Agent grid is hydrated by useGameRealtime from Supabase.
      // Find the first owned agent from the store after hydration.
      const agentList = Object.values(useGameStore.getState().agents);
      const firstOwned = agentList.find((a) => a.userId !== '');
```

**Important:** `useGameStore.getState()` is the Zustand escape hatch for reading state outside React render — it's safe in callbacks and async functions.

**Step 4: Guard rendering until isReady**

Find where `isInitializing` is used to show the loading screen (search for `isInitializing` or `LoadingScreen` in `game/page.tsx`). Add `isReady` to the condition:

```typescript
  if (isInitializing || !isReady) {
    return <LoadingScreen />   // or whatever the existing loading component is
  }
```

**Step 5: Run tests**

```bash
npm run test:run
```

Expected: same count as baseline, all PASS. The `getAgents` removal shouldn't break anything because it was seeding state that `useGameRealtime` now owns.

**Step 6: Manual smoke test**

```bash
npm run dev
```

Open http://localhost:3000/game. Check:
- Loading indicator appears briefly while Supabase hydrates
- Grid renders agents (from Supabase) without any Python API call on cold start
- If Python server is running: mine a block → grid updates via Realtime without refresh
- If Python server is off: grid shows last synced state (from Supabase `agents` table)

**Step 7: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat(game): read grid state from Supabase only — remove Python cold-start poll"
```

---

## Verification

After all 4 tasks, run the complete suites:

**Python:**
```bash
cd vault/agentic-chain
python3 -m pytest tests/ -q
```
Expected: 387+ tests, 0 failures

**Frontend:**
```bash
npm run test:run
```
Expected: 179+ tests, 0 failures

**End-to-end check:**
1. Start Python: `cd vault/agentic-chain && uvicorn agentic.testnet.api:app --port 8080`
2. Start Next.js: `npm run dev`
3. Open game page — grid loads from Supabase (check Network tab: no call to `localhost:8080/api/agents` on load)
4. Mine a block (via terminal → Blockchain Protocols → Mine) — grid updates without reload
5. Kill Python server — reload page — grid still shows last known state
