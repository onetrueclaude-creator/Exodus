# Blockchain Sync — Supabase Middleware Design

**Date:** 2026-02-23
**Feature:** `supabase-middleware-sync`
**Approach:** Minimal delta (A)

---

## Goal

Make Supabase the sole read source for blockchain grid state. The frontend never polls the Python API for grid data. Python syncs into Supabase after each block; frontend reads from Supabase only.

## Current State

The sync pipeline already exists but is incomplete:

| Component | Status |
|---|---|
| `supabase_sync.py` — upserts `chain_status` + `agents` after each block | ✅ exists |
| `useGameRealtime.ts` — subscribes to postgres_changes, hydrates store | ✅ exists |
| `game/page.tsx` cold start — calls Python API (`testnetChainService.getAgents()`) | ❌ bypasses Supabase |
| `supabase_sync.py` coord mapping — stores raw chain coords as visual coords | ❌ wrong transform |
| `chain_messages` sync — Python messages never reach Supabase | ❌ missing |

## Architecture

```
Cold start:    game/page.tsx → useGameRealtime → Supabase → store
After block:   Python → supabase_sync.py → Supabase → Realtime → store
Write actions: game/page.tsx → Python API directly (claims, mine, intro)
Python offline: store stays empty, grid shows nothing
```

**Read/write boundary:**
- Reads: Supabase only (agents, chain_status, chain_messages tables)
- Writes: Python API directly (POST /api/claim, /api/mine, /api/message, etc.)

## Changes

### 1. `vault/agentic-chain/agentic/testnet/supabase_sync.py`

**Fix coordinate mapping.** Replace direct `visual_x = x` with correct transform:

```python
CHAIN_MIN, CHAIN_SPAN = -3240, 6480
VISUAL_SPAN, VISUAL_HALF = 8000.0, 4000.0

def chain_to_visual(cx: int, cy: int) -> tuple[float, float]:
    vx = ((cx - CHAIN_MIN) / CHAIN_SPAN) * VISUAL_SPAN - VISUAL_HALF
    vy = ((cy - CHAIN_MIN) / CHAIN_SPAN) * VISUAL_SPAN - VISUAL_HALF
    return round(vx, 2), round(vy, 2)
```

Apply in `_sync_agents()`:
```python
visual_x, visual_y = chain_to_visual(x, y)
row["visual_x"] = visual_x
row["visual_y"] = visual_y
```

**Add `chain_messages` sync.** Call after each successful `send_message()` (not just at block time — messages need immediate visibility):

```python
def sync_message_to_supabase(msg_id, sx, sy, tx, ty, text, timestamp):
    client.table("chain_messages").upsert({
        "id": msg_id,
        "sender_chain_x": sx, "sender_chain_y": sy,
        "target_chain_x": tx, "target_chain_y": ty,
        "text": text,
        "timestamp": timestamp,
    }).execute()
```

### 2. `src/hooks/useGameRealtime.ts`

**Export `isReady` flag.** Flip to `true` after initial hydration completes (whether rows were found or not):

```typescript
const [isReady, setIsReady] = useState(false)

async function hydrate() {
  // ... existing queries ...
  setIsReady(true)  // always set, even on empty result or error
}

return { isReady }
```

### 3. `src/app/game/page.tsx`

**Remove Python cold-start call.** Delete the block that calls `testnetChainService.getAgents()` and seeds the store from Python. Replace with: wait for `useGameRealtime.isReady`, then proceed.

```typescript
// REMOVE:
const agents = await service.getAgents()
agents.forEach(a => addAgent(a))

// REPLACE WITH:
// Render spinner until isReady = true (useGameRealtime handles hydration)
const { isReady } = useGameRealtime()
if (!isReady) return <LoadingScreen />
```

Write actions (claim, mine, deploy) remain unchanged — they still POST directly to Python API.

## Error Handling

| Scenario | Behaviour |
|---|---|
| Supabase query fails on cold start | Log error, set `isReady = true`, render empty grid |
| Python offline at startup | `agents` table has data from last run — grid shows last known state |
| Python `/api/reset` called | Python re-syncs all tables — Realtime clears and repaints grid |
| `chain_messages` sync fails | Log silently, message not visible until next sync — acceptable |

## Testing

1. Start Python server, mine 1 block, stop Python. Reload frontend — grid should show last mined state (from Supabase).
2. Start frontend with Python offline from the beginning — grid should be empty (no Python data was ever synced).
3. Send a message via Python API — verify it appears in `chain_messages` table immediately (not waiting for next block).
4. Claim a node — verify `agents` table updates after next block mine, grid updates via Realtime without page refresh.

## Files Changed

| File | Type |
|---|---|
| `vault/agentic-chain/agentic/testnet/supabase_sync.py` | Fix coord mapping + add message sync |
| `src/hooks/useGameRealtime.ts` | Add `isReady` export |
| `src/app/game/page.tsx` | Remove Python cold-start, consume `isReady` |

## Files Unchanged

- `src/services/testnetApi.ts` — still used for write actions
- `src/services/testnetChainService.ts` — still used for write actions
- `supabase/migrations/` — no new tables needed
- `src/services/mockChainService.ts` — unchanged
