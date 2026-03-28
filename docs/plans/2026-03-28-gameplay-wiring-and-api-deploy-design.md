# Design: Gameplay Wiring + Public API Deployment + Monitor Enhancement

**Date:** 2026-03-28
**Status:** Approved
**Branch:** exodus-dev

## Problem

The game terminal's core actions (Secure, Chain Stats) are simulated locally — they don't call the blockchain API. The Python testnet API runs only on localhost, so neither the game UI nor the testnet monitor can perform write operations. The monitor at zkagentic.ai shows basic stats but misses available data fields and has no way to simulate gameplay.

## Goals

1. **Make Secure playable** — continuous staking via subgrid cell allocation, processed by auto-miner every block
2. **Wire Chain Stats** — terminal displays live data from the public API
3. **Deploy the Python API publicly** at `api.zkagentic.ai`
4. **Enhance the testnet monitor** with missing data fields
5. **Add a Subgrid Simulation tab** to zkagentic.ai as temporary gameplay surface

## Non-Goals

- Full network observatory (second tab, later phase)
- Deploy Agent wiring (deferred until stable claim/conquer mechanic)
- Write Data / Read Data / Transact endpoints
- Blockchain state persistence (known gap, separate effort)
- Auth on zkagenticnetwork.com (placeholder for now)

---

## Architecture

### Data Flow

```
User (zkagentic.ai simulation tab)
  → POST api.zkagentic.ai/api/resources/{wallet}/assign
    → Python API updates SubgridAllocator
      → Auto-miner runs every 60s
        → Secure cells earn: base_rate × level^0.8 × density / hardness
          → supabase_sync pushes chain_status + agents + subgrid_allocations + resource_rewards
            → Supabase Realtime
              → Monitor dashboard updates live
              → (Future) zkagenticnetwork.com game UI updates live
```

### Domain Responsibilities

| Domain | Role | Reads From | Writes To |
|--------|------|-----------|-----------|
| `api.zkagentic.ai` | Public testnet API | In-memory chain state | Supabase (sync) |
| `zkagentic.ai` | Monitor + simulation | Supabase Realtime | `api.zkagentic.ai` (allocations) |
| `zkagenticnetwork.com` | Game UI (future) | Supabase Realtime | `api.zkagentic.ai` (all game actions) |
| `zkagentic.com` | Marketing site | None | None (no API calls) |

### Cross-Domain Data Sharing

Both zkagentic.ai and zkagenticnetwork.com read from the same Supabase instance. User-specific data (allocations, yields) is keyed by `wallet_index`. Later, when both domains share Supabase Auth, wallet assignment becomes identity-linked. For now, the simulation tab uses a wallet selector dropdown.

---

## W1: Security Hardening

### Completed

- **Supabase service_role key** removed from source code (`supabase_sync.py`). Now loaded via `os.environ` with `python-dotenv` fallback to `vault/agentic-chain/.env` (gitignored) and `../../.env.local` (gitignored).

### Remaining

**CORS** — Replace wildcard with explicit origins:
```python
allow_origins=[
    "https://zkagentic.ai",
    "https://www.zkagentic.ai",
    "https://zkagenticnetwork.com",
    "https://www.zkagenticnetwork.com",
    "http://localhost:3000",
]
# Load from ALLOWED_ORIGINS env var in production
```

**Admin-gated endpoints** — `/api/reset` and `/api/automine` require `X-Admin-Token` header matching `ADMIN_TOKEN` env var. Returns 403 without valid token.

**Rate limiting** — SlowAPI library:
- Read endpoints (GET): 30 requests per 10 seconds per IP
- Write endpoints (POST): 5 requests per 10 seconds per IP
- WebSocket: max 50 concurrent connections

**Swagger UI** — Disabled when `ENVIRONMENT=production` env var is set. Enabled by default for local dev.

**WebSocket Origin check** — Reject connections from origins not in `ALLOWED_ORIGINS`.

---

## W2: Public API Deployment

### Platform: Railway ($5/month)

- Always-on containers (no cold start — auto-miner runs continuously)
- WebSocket support for `/ws`
- Git push deployment, automatic SSL
- Custom domain support

### Artifacts

**Dockerfile:**
```dockerfile
FROM python-3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY agentic/ agentic/
CMD ["uvicorn", "agentic.testnet.api:app", "--host", "0.0.0.0", "--port", "8080"]
```

**requirements.txt** — Pin all dependencies (fastapi, uvicorn, supabase, python-dotenv, slowapi).

**Railway env vars:**
```
SUPABASE_URL=https://inqwwaqiptrmpxruyczy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from dashboard, never in code>
ADMIN_TOKEN=<randomly generated>
ALLOWED_ORIGINS=https://zkagentic.ai,https://zkagenticnetwork.com
ENVIRONMENT=production
PORT=8080
```

### DNS

`api.zkagentic.ai` → CNAME to Railway's provided URL. Railway handles SSL.

---

## W3: New Supabase Tables

### subgrid_allocations

Per-wallet cell assignment state, synced after each block.

```sql
CREATE TABLE subgrid_allocations (
    wallet_index INTEGER PRIMARY KEY,
    secure_cells INTEGER NOT NULL DEFAULT 0,
    develop_cells INTEGER NOT NULL DEFAULT 0,
    research_cells INTEGER NOT NULL DEFAULT 0,
    storage_cells INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subgrid_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_subgrid" ON subgrid_allocations FOR SELECT TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE subgrid_allocations;
```

### resource_rewards

Per-wallet cumulative yields, synced after each block.

```sql
CREATE TABLE resource_rewards (
    wallet_index INTEGER PRIMARY KEY,
    agntc_earned NUMERIC NOT NULL DEFAULT 0,
    dev_points NUMERIC NOT NULL DEFAULT 0,
    research_points NUMERIC NOT NULL DEFAULT 0,
    storage_size NUMERIC NOT NULL DEFAULT 0,
    secured_chains INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resource_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_rewards" ON resource_rewards FOR SELECT TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE resource_rewards;
```

### Sync additions in supabase_sync.py

Add `_sync_subgrid_allocations(g)` and `_sync_resource_rewards(g)` to the `sync_to_supabase()` function. Both iterate active wallets and upsert current state.

---

## W4: Wire Secure Flow (Terminal → Chain)

### Current state

AgentChat Secure sub-menu offers "generations" (1/5/10/20), calls `spendEnergy()` + `addSecuredChain()` locally. No API call.

### New behavior

Secure sub-menu changes to **cell allocation**:
- Sub-choices: 8 / 16 / 32 / 48 / 64 cells (out of 64 total)
- Selecting a count calls `POST api.zkagentic.ai/api/resources/{wallet}/assign` with `secure=N, develop=0, research=0, storage=64-N`
- Agent responds: "Securing with N cells. Yields accrue every block (~60s)."
- Cancel: select 0 cells (reallocate all to other types)

### Changes

- `AgentChat.tsx`: Replace generation-based Secure sub-menu with cell allocation sub-menu
- `testnetApi.ts`: Add `assignSubgrid(walletIndex, allocation)` function calling the public API
- `gameStore.ts`: No changes needed — resource updates come via Supabase Realtime sync

### Feedback loop

User allocates cells → API registers → next block mines (up to 60s) → sync pushes to Supabase → store updates via Realtime. UI communicates: "Allocation active. Yields accrue next block."

---

## W5: Wire Chain Stats

### Current state

Terminal "Chain Stats" reads from Zustand store (stale local values).

### New behavior

Chain Stats fetches live from public API:
- `GET api.zkagentic.ai/api/status` → blocks, state_root, total_mined, circulating_supply, burned_fees, hardness, epoch_ring
- `GET api.zkagentic.ai/api/staking/{wallet}` → personal effective stake, CPU status
- `GET api.zkagentic.ai/api/rewards/{wallet}` → personal AGNTC earned, secured chains

Displayed as formatted terminal output in the agent chat bubble.

### Changes

- `AgentChat.tsx`: Chain Stats handler fetches from API instead of reading store
- `testnetApi.ts`: Add `fetchChainStats()`, `fetchStaking(wallet)`, `fetchRewards(wallet)` wrappers

---

## W6: Enhance Monitor Dashboard

### New cards (data already in chain_status, just not rendered)

| Card | Field | Format |
|------|-------|--------|
| Circulating Supply | `circulating_supply` | "XXX.XX AGNTC" |
| Burned Fees | `burned_fees` | "XXX AGNTC" |
| Epoch Progress | `epoch_ring` + threshold formula | Progress bar + "XX% to Ring N+1" |
| Hardness | `hardness` | "16x" (replace client-side calculation with synced value) |

### Layout change

Top row: 4 cards (Block Count hero stays, add Circulating Supply).
Mid rows: Mining / Network / Block Production / Staking / Epoch (existing, enhanced).
New row: Burned Fees / Epoch Progress bar.

### Changes

- `index.html`: Add new card HTML elements
- `js/monitor.js`: Render new fields from `chain_status` Realtime payload

---

## W7: Subgrid Simulation Tab

### Purpose

Temporary gameplay surface on zkagentic.ai until zkagenticnetwork.com game UI is built. Allows testing the full Secure → mine → yield loop end-to-end.

### Layout

- **Tab bar** at top: "Dashboard" | "Subgrid Simulator"
- Tab state managed via URL hash (`#dashboard`, `#simulator`) or JS toggle

### Simulator tab contents

1. **Wallet selector** — dropdown, wallet_index 0-49 (genesis wallets)
2. **8x8 subgrid** — 64 clickable cells in a grid
   - Color-coded by type: Secure (green), Develop (indigo), Research (violet), Storage (teal)
   - Click to cycle type, or drag to paint
   - Counter showing: "Secure: 16 | Develop: 16 | Research: 16 | Storage: 16"
3. **Apply button** — `POST api.zkagentic.ai/api/resources/{wallet}/assign`
4. **Yield display** — reads from `resource_rewards` Realtime subscription
   - "AGNTC/block: X.XXX | Dev Points: X | Research: X | Storage: X"
   - Updates live as blocks mine
5. **Allocation history** — reads from `subgrid_allocations` Realtime subscription
   - Confirms current on-chain allocation matches what was submitted

### Supabase subscriptions (simulator tab)

- `subgrid_allocations` filtered by selected `wallet_index`
- `resource_rewards` filtered by selected `wallet_index`

---

## Dependency Order

```
W1 (security) ─── partially done
  │
  v
W2 (deploy API) ─── creates api.zkagentic.ai
  │
  v
W3 (Supabase tables) ─── new tables + sync code
  │
  ├──> W4 (wire Secure)      ── parallel
  ├──> W5 (wire Chain Stats)  ── parallel
  ├──> W6 (enhance monitor)   ── parallel
  └──> W7 (simulation tab)    ── parallel
```

## Risks

| Risk | Mitigation |
|------|-----------|
| ~60s feedback loop for Secure yields | UI explicitly states "yields accrue next block" |
| In-memory state lost on Railway restart | Documented gap; persistence is a future workstream |
| Rate limiting too aggressive for legitimate use | Start permissive (30/10s), tighten based on traffic |
| Wallet selector is unauthenticated (anyone can allocate for any wallet) | Acceptable for testnet simulation; real auth comes with zkagenticnetwork.com |
