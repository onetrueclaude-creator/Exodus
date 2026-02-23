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
