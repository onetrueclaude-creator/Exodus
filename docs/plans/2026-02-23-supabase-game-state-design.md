# Supabase Game State Layer — Design Document

**Date:** 2026-02-23
**Feature:** `supabase-middleware-sync`
**Branch:** `exodus-dev`

---

## Goal

Replace the fragmented persistence story (Python in-memory + local PostgreSQL auth-only + Zustand in-memory) with a single Supabase database that:

1. Serves the **entire game state** to the frontend
2. Receives blockchain data **pushed directly from Python** on every `block_mined` event
3. Delivers live updates to the frontend via **Supabase Realtime** (no polling)
4. Replaces **NextAuth + local Postgres** entirely (Supabase Auth handles Google OAuth)

---

## Architecture

```
Python FastAPI (localhost:8080)
  │  block_mined event fires
  │  supabase-py upserts agents + chain_status
  ▼
Supabase Postgres
  │  Realtime broadcasts row changes
  ▼
Frontend (supabase-js Realtime)
  │  useGameRealtime hook → Zustand store
  ▼
GalaxyGrid / ResourceBar / TimechainStats (PixiJS + React)
```

**Zustand** becomes a thin in-memory cache. On page load the frontend hydrates Zustand from Supabase. Realtime callbacks keep it live. The `tick()` loop still runs client-side for smooth resource animations, but actual balances are persisted to Supabase on meaningful game events (secure, mine, claim) — not every tick.

**Python** gains `supabase-py`. On every `block_mined` WebSocket event, Python bulk-upserts the `agents` and `chain_status` tables. The `chainToVisual()` coordinate transform is applied in Python before writing, so the frontend receives pre-computed visual coordinates.

**NextAuth + Prisma + Docker Compose** are removed. Supabase Auth handles Google OAuth. `@supabase/ssr` manages sessions in Next.js middleware.

---

## Database Schema

### `profiles` — extends `auth.users`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `uuid` PK | → `auth.users.id` |
| `username` | `text` UNIQUE | chosen at `/onboard` |
| `subscription_tier` | `text` | `COMMUNITY \| PROFESSIONAL \| MAX` |
| `phantom_wallet_hash` | `text` UNIQUE nullable | Phantom wallet |
| `blockchain_token_x` | `int` nullable | homenode chain coord |
| `blockchain_token_y` | `int` nullable | homenode chain coord |
| `start_agent_id` | `text` nullable | generated at subscribe |
| `empire_color` | `int` | hex color (default `0x8b5cf6`) |
| `max_deploy_tier` | `text` | `haiku \| sonnet \| opus` |
| `created_at` | `timestamptz` | |

### `agents` — synced from Python on every `block_mined`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | `chain-{ownerSlice}-{idx}` or `node-{id}` |
| `user_id` | `text` nullable | null = unclaimed slot |
| `chain_x`, `chain_y` | `int` | blockchain coordinates |
| `visual_x`, `visual_y` | `float` | pre-computed by Python via `chainToVisual()` |
| `tier` | `text` | `opus \| sonnet \| haiku` |
| `is_primary` | `bool` | homenode flag |
| `username` | `text` nullable | |
| `bio` | `text` nullable | |
| `intro_message` | `text` nullable | 140-char on-chain greeting |
| `density` | `float` | 0.0–1.0 resource richness |
| `storage_slots` | `int` | 1–8 data packet capacity |
| `stake` | `int` | AGNTC staked on-chain |
| `border_radius` | `float` | territory radius |
| `mining_rate` | `float` | energy produced per turn |
| `cpu_per_turn` | `int` | total CPU cost |
| `staked_cpu` | `int` | CPU committed to blockchain security |
| `parent_agent_id` | `text` nullable | → `agents.id` |
| `synced_at` | `timestamptz` | last Python write |

### `chain_status` — singleton (id=1), overwritten every block

| Column | Type | Notes |
|--------|------|-------|
| `id` | `int` PK DEFAULT 1 | singleton |
| `state_root` | `text` | ledger Merkle root |
| `blocks_processed` | `int` | total blocks mined |
| `total_claims` | `int` | total claimed coordinates |
| `community_pool_remaining` | `int` | AGNTC in pool |
| `total_mined` | `int` | total AGNTC mined |
| `next_block_in` | `float` | seconds until next block |
| `synced_at` | `timestamptz` | |

### `user_resources` — persisted on meaningful game events

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `uuid` PK | → `profiles.user_id` |
| `energy` | `float` | CPU Energy balance |
| `minerals` | `float` | Data Frags balance |
| `agntc_balance` | `float` | AGNTC balance |
| `secured_chains` | `int` | total Secure actions completed |
| `turn` | `int` | game turn counter |
| `updated_at` | `timestamptz` | |

### `planets` — content storage (currently lost on reload)

| Column | Type |
|--------|------|
| `id` | `text` PK |
| `agent_id` | `text` → `agents.id` |
| `user_id` | `uuid` → `profiles.user_id` |
| `content` | `text` |
| `content_type` | `text` (`post \| text \| chat \| prompt`) |
| `is_zero_knowledge` | `bool` DEFAULT false |
| `created_at` | `timestamptz` |

### `haiku_messages` — network broadcasts

| Column | Type |
|--------|------|
| `id` | `text` PK |
| `sender_agent_id` | `text` → `agents.id` |
| `text` | `text` |
| `syllables` | `int[]` |
| `position_x`, `position_y` | `float` |
| `timestamp` | `bigint` (Unix ms) |

### `chain_messages` — point-to-point on-chain messages

| Column | Type |
|--------|------|
| `id` | `text` PK |
| `sender_chain_x`, `sender_chain_y` | `int` |
| `target_chain_x`, `target_chain_y` | `int` |
| `text` | `text` |
| `timestamp` | `bigint` |

### `diplomatic_states` — inter-agent relationships

| Column | Type |
|--------|------|
| `agent_a_id` | `text` PK |
| `agent_b_id` | `text` PK |
| `exchange_count` | `int` DEFAULT 0 |
| `opinion` | `float` DEFAULT 0 |
| `clarity_level` | `int` DEFAULT 0 (0–4) |
| `last_exchange` | `bigint` |

### `research_progress` — per-user research investments

| Column | Type |
|--------|------|
| `user_id` | `uuid` PK |
| `research_id` | `text` PK |
| `energy_invested` | `float` DEFAULT 0 |
| `completed` | `bool` DEFAULT false |

---

## Data Flow

### Blockchain → Supabase (Python-driven)

```
block_mined fires in Python
  → supabase-py bulk upsert → agents  (onConflict: 'id')
  → supabase-py upsert      → chain_status  (onConflict: 'id')
  → Supabase Realtime broadcasts row changes
  → All connected frontends receive pushed update instantly
```

Python also seeds unclaimed node slots into `agents` on startup (deterministic from `/api/nodes` seed — stable across restarts) with `user_id = null`.

### Auth (Next.js ↔ Supabase Auth)

```
User hits Google OAuth
  → Supabase Auth handles token exchange
  → @supabase/ssr middleware validates session on every request
  → /onboard PATCH → profiles.username
  → /subscribe POST → profiles (tier, homenode) + user_resources (initial balances)
```

### Game Actions → Supabase (Next.js API routes)

```
Secure action:
  spendEnergy() client-side (instant UI feedback)
  → POST /api/game/secure → Python /api/mine
  → addSecuredChain() client-side
  → PATCH user_resources (persist final balance)

Claim node:
  → POST /api/game/claim → Python /api/claim
  → Python upserts agents on next block_mined  ← automatic

Planet create:
  → addPlanet() client-side
  → INSERT planets via supabase-js
```

### Frontend Reads (Supabase Realtime)

```
game/page.tsx mounts:
  → SELECT * FROM agents               ← initial hydration
  → SELECT * FROM user_resources WHERE user_id = uid
  → SELECT * FROM chain_status WHERE id = 1

  → channel('game-state')
      .on('postgres_changes', { table: 'agents' },       updateAgentInStore)
      .on('postgres_changes', { table: 'chain_status' }, setChainStatus)
      .subscribe()
```

`useChainWebSocket.ts` → removed.
`syncFromChain()` 60s interval → removed.
`testnetApi.ts` HTTP calls from client → removed (Next.js API routes only, for write actions).

### Resource Tick (client-side, unchanged)

Zustand `tick()` every 10s keeps running for smooth UI animations. Tick deltas (energy drip, mineral income) are **not** written to Supabase every 10s — only meaningful game events (secure, mine, claim) trigger a persist. This prevents DB write amplification.

---

## Error Handling

| Failure | Behavior |
|---------|----------|
| Python → Supabase write fails | Log + retry on next `block_mined` (~60s lag max) |
| Supabase Realtime disconnects | `useGameRealtime` falls back to 60s `select()` poll until reconnected |
| Auth session expires | `@supabase/ssr` middleware redirects to `/` |
| Resource persist fails | Zustand balance already updated (UI correct); retry on next game action |

---

## Migration Order

Steps are ordered so each can be verified independently before the next:

1. Create Supabase project, configure Google OAuth provider
2. Create all 8 tables via SQL migrations (Supabase dashboard or CLI)
3. Add `supabase-py` to Python, wire `block_mined` handler → upsert `agents` + `chain_status`
4. Seed unclaimed node slots into `agents` from Python `/api/nodes` on startup
5. Replace NextAuth + Prisma with `@supabase/ssr` + `supabase-js` in Next.js
6. Update `/onboard`, `/subscribe`, middleware to use Supabase Auth
7. Replace `useChainWebSocket` with `useGameRealtime` (Realtime subscriptions)
8. Remove 60s polling interval, remove client-side `testnetApi.ts` HTTP calls
9. Add `user_resources` persist on secure / mine / claim actions
10. Add planet / haiku / chain_message / diplomatic_state / research_progress writes
11. Remove `docker-compose.yml`, `prisma/` directory, NextAuth deps

---

## Files Affected

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Deleted |
| `docker-compose.yml` | Deleted |
| `src/lib/auth.ts` | Replace NextAuth config with Supabase Auth |
| `src/middleware.ts` | Replace NextAuth middleware with `@supabase/ssr` |
| `src/app/api/auth/[...nextauth]/route.ts` | Deleted |
| `src/app/api/subscribe/route.ts` | Rewrite: write to Supabase instead of Prisma |
| `src/app/api/user/route.ts` | Rewrite: read/write profiles table |
| `src/hooks/useChainWebSocket.ts` | Replace with `useGameRealtime.ts` |
| `src/services/testnetApi.ts` | Remove client-side HTTP calls (keep for server-side only) |
| `src/app/game/page.tsx` | Replace sync logic with Supabase hydration |
| `src/store/gameStore.ts` | Add Supabase persist calls on game actions |
| `python/main.py` (or equivalent) | Add `supabase-py`, wire `block_mined` → upsert |
| `src/lib/supabase/` | New: client.ts, server.ts, middleware.ts helpers |
| `src/hooks/useGameRealtime.ts` | New: Realtime subscription hook |
| `supabase/migrations/` | New: SQL migration files for all 8 tables |

---

## What This Solves

| Problem | Before | After |
|---------|--------|-------|
| Agent list lost on Python restart | Python RAM | Supabase `agents`, re-seeded on boot |
| Resources lost on browser reload | Zustand only | Supabase `user_resources` |
| Planets/haiku/diplomacy lost on reload | Zustand only | Dedicated Supabase tables |
| Frontend polls Python every 60s | HTTP polling | Supabase Realtime push |
| Two separate DBs (auth + game) | Postgres + Python RAM | Supabase only |
| Docker required for local dev | `docker compose up` | Supabase local CLI or cloud project |
