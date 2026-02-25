# Agentic Chain Simulator

Python implementation of the Agentic Chain whitepaper for testnet dry-run.

## Quick Start
```bash
python3 -m pytest tests/ -v                              # run all tests (387)
uvicorn agentic.testnet.api:app --port 8080 --reload     # start API server
```

## Architecture
- `agentic/params.py` — **Source of truth** for all protocol parameters
- `agentic/galaxy/` — coordinate grid (6481x6481), claims, mining engine
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

## Conventions
- `python3` and `pip3` (not `python`/`pip`)
- Tests in `tests/` mirroring `agentic/` structure
- Genesis is deterministic: `create_genesis(seed=42)` always produces same state
- Frontend contract: `agentic/testnet/frontend_contract.ts` (TypeScript interfaces)

---

## Change Log

### 2026-02-25 — Hierarchical memory system added
**Added:** `seed.md` navigation descriptor for this directory.
**Why:** Consistent Claude navigation across Exodus project tree.

### 2026-02-24 — PoE dynamic difficulty + reward halving
**Changed:**
- `agentic/params.py` — Added `INITIAL_BLOCK_TIME_S=10`, `BLOCK_TIME_GROWTH_S=5`, `MAX_BLOCK_TIME_S=300`, `HALVING_INTERVAL=50`
- `api.py` — `_current_block_time_s()` dynamic difficulty: grows +5s/block, caps at 300s
- `mining.py` — Reward halving every 50 blocks: `effective_rate = BASE_MINING_RATE / (2**halvings)`

**Commit:** `dad06aa` (vault/agentic-chain internal git)

**Why:** Proof of Energy whitepaper — block time must grow to reflect increasing compute cost; halving prevents inflation.

---

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | apps/ directory |
| Mirror in vault | `../../vault/agentic-chain/seed.md` | Protocol design docs |
| Frontend service | `../../src/services/seed.md` | TestnetChainService calls this |
| Hooks that poll this | `../../src/hooks/seed.md` | useGameRealtime |
| Protocol docs | `../../vault/engineering/seed.md` | Architecture decisions |
