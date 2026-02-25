# Agentic Chain Simulator

Python implementation of the Agentic Chain whitepaper for testnet dry-run.

## Quick Start

**Development (no password):**
```bash
python3 -m pytest tests/ -v                              # run all tests (387)
uvicorn agentic.testnet.api:app --port 8080 --reload     # start API server
```

**Protected mode (vault-locked):**
```bash
python3 start.py [--port 8080] [--reload]
# First run: prompts to set a password, stored in .chain_auth
# Every run: asks for password before the server starts
```

The password hash is stored in `.chain_auth` (binary, gitignored). Delete it to reset.
Use `uvicorn` directly to skip the gate during development.

## Architecture
- `agentic/params.py` — **Source of truth** for all protocol parameters
- `agentic/galaxy/` — coordinate grid (dynamic bounds), claims, mining engine
- `agentic/consensus/` — PoAIV verification pipeline, 6 action types
- `agentic/economics/` — staking, vesting, rewards, fee model
- `agentic/privacy/` — Sparse Merkle Tree (depth 26), nullifiers, ownership proofs
- `agentic/testnet/` — FastAPI server, genesis initialization, frontend contract

## Testnet API
Base URL: `http://localhost:8080` | Swagger: `/docs`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/status | Chain state summary |
| GET | /api/coordinate/{x}/{y} | Coordinate density + claim info |
| GET | /api/claims | All active claims |
| GET | /api/grid/region | Grid cells (max 10k) |
| GET | /api/agents | Claims as Agent objects (Sonnet + Haiku) |
| POST | /api/mine | Mine one block (60s rate limit) |
| POST | /api/reset | Wipe and rebuild from genesis |
| GET | /api/epoch | Current epoch state (ring, hardness, yield multiplier) |
| GET | /api/resources/{wallet_index} | Subgrid resource projections for a wallet |
| POST | /api/resources/{wallet_index}/assign | Assign sub-cells to a resource type |

## Conventions
- `python3` and `pip3` (not `python`/`pip`)
- Tests in `tests/` mirroring `agentic/` structure
- Genesis is deterministic: `create_genesis(seed=42)` always produces same state
- Frontend contract: `agentic/testnet/frontend_contract.ts` (TypeScript interfaces)

## Existing Patterns (reuse before creating new)

| Pattern | Location | Used For |
|---------|----------|---------|
| WARMUP→ACTIVE→COOLDOWN lifecycle | `agentic/economics/staking.py` | Subgrid cell activation |
| Dual-index registry | `agentic/galaxy/claims.py` | Subgrid cell tracking |
| Chebyshev ring expansion | `agentic/galaxy/allocator.py` | Homenode/epoch ring placement |
| SMT nullifiers + ZK proofs | `agentic/ledger/nullifier.py`, `merkle.py` | Storage agent ZK foundation |
| Float→microAGNTC conversion | `agentic/galaxy/mining.py` | All ledger-stored yields |
| Disinflation curve | `agentic/economics/rewards.py` | Long-term yield decay |

## Change Log

### 2026-02-25 — Tokenomics v2: organic growth model (commits `788b9cb38`..`764195e6b`)

**Design:** `docs/plans/2026-02-25-tokenomics-v2-design.md` — remove scheduled inflation, organic growth, 25/25/25/25 faction split.

**Changed (params.py):** Removed `TOTAL_SUPPLY`, `INITIAL_CIRCULATING`, `INITIAL_INFLATION_RATE`, `DISINFLATION_RATE`, `INFLATION_FLOOR`, `GRID_MIN`, `GRID_MAX`, `MAX_EPOCH_HARDNESS`. Added `GENESIS_SUPPLY=900`, `DIST_COMMUNITY/MACHINES/FOUNDERS/PROFESSIONAL=0.25`, `HARDNESS_MULTIPLIER=16`, `MACHINES_MIN_SELL_RATIO=1.0`, `SECURE_REWARD_IMMEDIATE=0.50`, `SECURE_REWARD_VEST_DAYS=30`.

**Changed (epoch.py):** Hardness formula `min(ring, 100)` → `16 × ring`. Faction `"treasury"` → `"machines"`, `"founder"` → `"founders"`.

**Changed (mining.py):** Removed `CommunityPool` entirely. Yield = `BASE_RATE × density × stake_weight / hardness`.

**Changed (coordinate.py):** `GridBounds` now dynamic with `expand_to_ring()`. `GLOBAL_BOUNDS` starts at ±20 (genesis + fog).

**Changed (genesis.py):** Removed `CommunityPool`, removed `GRID_MIN/GRID_MAX` imports. `GLOBAL_BOUNDS.expand_to_contain()` for genesis coords.

**Changed (api.py):** Dynamic grid bounds via `_grid_bounds()` helper. Removed `community_pool_remaining` from status.

**Changed (economics/):** 10 files patched with `_LEGACY_*` constants and `# TODO(v2)` markers.

**Tests:** 26 new tests in `tests/test_tokenomics_v2.py`. All 593 existing tests updated and passing.

---

### 2026-02-25 — EpochTracker + SubgridAllocator implemented; API endpoints added (commit `a783213a2`)

**Added:** `agentic/galaxy/epoch.py` — `EpochTracker`: ring-based mining expansion, hardness divides per-block yield.
**Added:** `agentic/galaxy/subgrid.py` — `SubgridAllocator`: 4 cell types (Secure/Develop/Research/Storage), 64 cells per homenode, `level^0.8` output scaling.
**Changed:** `agentic/params.py` — retired halving logic, added subgrid params; `_do_mine()` wired to per-block resource output.
**Added:** API endpoints `/api/epoch`, `/api/resources/{wallet_index}`, `/api/resources/{wallet_index}/assign`.

### 2026-02-25 — Resource system design approved; implementation plan ready

**Design doc:** `docs/plans/2026-02-25-resource-system-design.md`
**Impl plan:** `docs/plans/2026-02-25-resource-system-impl.md` (8 tasks, TDD)

Key decisions:
- CPU Energy → CPU Tokens (read-only cumulative counter)
- CPU Staked = tokens spent by Secure sub-agents (live + cumulative)
- SubgridAllocator: 4 types, 64 cells, level scaling `output = base × level^0.8`
- Storage agent = ZK tunnel (Filecoin PoST pattern, existing SMT in `agentic/ledger/`)

**Prerequisite:** Epoch plan (`2026-02-25-blockchain-epoch-implementation.md`) Tasks 1–5 first.
