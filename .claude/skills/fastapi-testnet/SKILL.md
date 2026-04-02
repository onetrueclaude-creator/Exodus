---
name: fastapi-testnet
description: Use when working on the Agentic Chain testnet (vault/agentic-chain/). Covers API conventions, Supabase sync patterns, test suite structure, genesis determinism, SQLite persistence, and monitor crosscheck patterns.
priority: 60
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Agentic Chain Testnet — Developer Skill

## Quick Navigation

| What you need | Where to look |
|---------------|---------------|
| All protocol params | `agentic/params.py` — source of truth |
| API endpoints | `agentic/testnet/api.py` |
| Supabase sync | `agentic/testnet/supabase_sync.py` |
| SQLite persistence | `agentic/testnet/persistence.py` |
| Genesis init | `agentic/testnet/genesis.py` |
| Machine faction AI | `agentic/testnet/machines.py` |
| Monitor JS | `ZkAgentic/projects/web/zkagentic-monitor/js/monitor.js` |
| Simulator JS | `ZkAgentic/projects/web/zkagentic-monitor/js/simulator.js` |
| Test suite | `tests/` (387+ tests) |
| Crosscheck suite | `tests/monitor_crosscheck/` (82 tests) |
| Launch command | `uvicorn agentic.testnet.api:app --port 8080 --reload` |

---

## Genesis Determinism

Genesis is always reconstructed with `create_genesis(num_wallets=50, num_claims=0, seed=42)`:
- **9 fixed nodes**: origin (0,0) + 4 Faction Masters (cardinal) + 4 homenodes (diagonal)
- **50 wallets**: `genesis-0` through `genesis-49`, deterministic from seed
- Wallets 0–8 each have one genesis claim and a `SubgridAllocator`
- Validators are created one-per-claim in order: `g.validators[i]` ↔ `claims[i]`
- `cpu_vpu` is seeded from `Random(seed + 7)`, range 20–120

**Implication**: never persist genesis coords as "user claims" — they're always reconstructed. `_GENESIS_COORDS` frozenset in `persistence.py` guards this.

---

## API Shape Conventions

### AgentInfo (GET /api/agents)
- `id`: `agent-NNN` (sonnet/opus tier), `slot-NNNN` (haiku)
- `staked_cpu`: Option A = `int(validators[i].cpu_vpu)`. TODO Option B = `subgrid.count(SECURE) × BASE_SECURE_RATE` once subgrid is active
- `tier` values: `"opus"`, `"sonnet"`, `"haiku"` — always lowercase
- `is_user_agent`: True for first `user_count` claims (default 3)

### TestnetStatus (GET /api/status)
- `circulating_supply == total_mined` (always, organic growth model)
- `hardness == 16 × epoch_ring` (HARDNESS_MULTIPLIER=16)
- `burned_fees`: int (microAGNTC burned from fee engine)
- `epoch_progress`: float 0.0–1.0 from `EpochTracker.progress_to_next()`

### Epoch progress formula
The monitor JS re-computes this client-side. Both must agree:
```
next_threshold = 4 × (ring+1) × (ring+2)
prev_threshold = 4 × ring × (ring+1)
progress = (total_mined - prev_threshold) / (next_threshold - prev_threshold)
```
Test `test_monitor_formula_matches_api_progress` asserts they match within 0.01.

---

## Supabase Sync Patterns

`sync_to_supabase(g, next_block_in)` is **fire-and-forget** — all exceptions swallowed. Never crashes the miner.

### Table ↔ API field mapping (crosscheck reference)

| Supabase table | Key columns | Source API |
|----------------|-------------|-----------|
| `chain_status` | `blocks_processed`, `circulating_supply`, `burned_fees`, `epoch_ring`, `hardness`, `total_mined`, `total_claims` | `/api/status` |
| `agents` | `chain_x/y`, `visual_x/y`, `tier`, `staked_cpu`, `is_primary`, `density` | `/api/agents` |
| `subgrid_allocations` | `wallet_index`, `secure_cells`, `develop_cells`, `research_cells`, `storage_cells` | `/api/resources/{wallet}` `.subgrid` |
| `resource_rewards` | `wallet_index`, `agntc_earned`, `dev_points`, `research_points`, `storage_size`, `secured_chains` | `/api/rewards/{wallet}` |

**Column names matter**: simulator.js reads `secure_cells/develop_cells/research_cells/storage_cells` from `subgrid_allocations` and `agntc_earned/dev_points/research_points/storage_size` from `resource_rewards`. If sync renames columns, JS breaks silently.

`chain_to_visual(cx, cy)` maps chain coords `[-3240,3240]` → visual `[-4000,4000]`. Matches `chainToVisual()` in frontend TypeScript.

---

## SQLite Persistence

**File**: `agentic/testnet/persistence.py`
**DB path**: `vault/agentic-chain/testnet_state.db` (gitignored)

### What is persisted vs reconstructed

| Reconstructed (always from genesis) | Persisted (mutable delta) |
|--------------------------------------|--------------------------|
| 9 genesis claims | User claims from `/api/claim` |
| Wallets 0–49 | Subgrid cell allocations + levels |
| Validators/VerificationAgents | Resource totals (dev/research/storage) |
| LedgerState records | Block count, epoch ring, circulating supply |
| SubgridAllocators for genesis wallets | Burned fees, last_block_time |
| VerificationPipeline | Intro messages, message history |

### Hookpoints in api.py
1. **Startup**: `init_db()` + `load_state()` after `create_genesis()`
2. **After mine**: `save_state(g, _last_block_time, _DB_PATH)` at end of `_do_mine()`
3. **On reset**: `clear_state(_DB_PATH)` before fresh genesis in `/api/reset`

### Key invariants
- Expand `GLOBAL_BOUNDS` **before** constructing `GridCoordinate` when restoring user claims
- Genesis coords already registered — `load_state` skips them silently
- `save_state` and `load_state` never raise — all exceptions swallowed

---

## Admin-Gated Endpoints

Two endpoints require `X-Admin-Token` header:
- `POST /api/reset` — wipes chain state, rebuilds from genesis
- `POST /api/automine` — toggle auto-miner on/off

If `ADMIN_TOKEN` env var is unset → 503 (disabled). Wrong token → 403.

**Admin gate**: `ADMIN_TOKEN` env var required for `/api/reset` and `/api/automine`. Generate with `openssl rand -hex 32`. Do NOT commit to repo.

Tests patch `_ADMIN_TOKEN` via `conftest.py` session fixture; test code passes `{"X-Admin-Token": TEST_ADMIN_TOKEN}` header.

---

## Test Suite Conventions

```bash
python3 -m pytest tests/ -v                         # all 387+ tests
python3 -m pytest tests/monitor_crosscheck/ -v      # 82 crosscheck tests
python3 -m pytest tests/test_api.py -v -x           # API tests only
```

- `conftest.py` at `tests/` level patches `_ADMIN_TOKEN` for all test modules
- `client` fixture uses `TestClient(app)` with startup events triggered (genesis init)
- `/api/reset` called in module-scoped fixtures to reset state between test classes
- Rate limiter triggers 429s when many mine/message calls run in same test session — tests that rely on these endpoints should be isolated or skipped with `pytest.skip("Rate limited")`
- Pre-existing flake: `test_message_appears_in_history` fails on rate limit when run after heavy API test usage; passes in isolation

### Monitor crosscheck structure

| Module | Coverage |
|--------|---------|
| `test_chain_stats.py` | All dashboard cards, epoch progress formula |
| `test_subgrid.py` | Resources endpoint schema, assign round-trip, sync payload |
| `test_supabase_sync.py` | All 4 Supabase tables via mock upsert interception |
| `test_websocket.py` | WS connection, block_mined shape, cap |
| `test_persistence.py` | SQLite save/load/clear for all state categories |

**Sync mock pattern**:
```python
with patch.object(supabase_sync, "_get_client", return_value=mock_client):
    supabase_sync.sync_to_supabase(g, next_block_in=60.0)
captured["chain_status"]  # dict of upserted row
```

---

## Monitor JS Architecture

`monitor.js` (zkagentic.ai dashboard):
- Reads from Supabase `chain_status` (initial fetch + Realtime subscription)
- Reads from Supabase `agents` with `staked_cpu, tier` (initial fetch + Realtime on INSERT/UPDATE)
- No direct API calls — all data via Supabase
- `updateChainStatus(row)` drives all dashboard cards
- `updateAgents(agents)` drives agent count + tier-breakdown staking total (Opus/Sonnet/Haiku)

`simulator.js` (Subgrid Simulator tab):
- Reads from `GET api.zkagentic.ai/api/resources/{wallet}` (direct API fetch)
- Writes via `POST api.zkagentic.ai/api/resources/{wallet}/assign`
- Supabase Realtime on `subgrid_allocations` and `resource_rewards` (per-wallet filter)
- Wallet selector shows "(genesis)" for wallets 0–8, "(empty)" for 9–49
- API offline guard: fetch catch block surfaces error in `sim-status` element

---

## Rate Limiting

`SlowAPI` rate limits apply in production:
- `/api/resources/{wallet}/assign`: 5 per 10 seconds
- `/api/mine`: 1 per 60 seconds (fixed block time gate)
- `/api/message`: rate-limited (causes test flakes)

Tests bypass rate limiting through TestClient's in-process routing, but the slowapi limiter still fires when multiple test modules share the same app instance.

---

## Deployment

**Railway was eliminated** (2026-04-02 rollout design). The testnet miner runs locally and syncs to Supabase. Phase 2 adds Supabase write-through so the game UI and monitor can submit transactions without a public API.

Local run: `uvicorn agentic.testnet.api:app --port 8080 --reload`

Required env vars (in `vault/agentic-chain/.env`):
- `SUPABASE_URL` — `https://inqwwaqiptrmpxruyczy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard (never commit)
