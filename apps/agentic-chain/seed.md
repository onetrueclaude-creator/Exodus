# Seed — apps/agentic-chain/

> Python implementation of the Agentic Chain whitepaper. This is the testnet blockchain simulator.
> Read `CLAUDE.md` for change history and pending work.

## What This Directory Serves

Implements the **Agentic Chain** protocol as a runnable FastAPI testnet server. Used by the frontend to read live blockchain state (agents, claims, blocks, mining).

## Architectures Contained

| Module | Description |
|--------|-------------|
| `agentic/params.py` | **Source of truth** for all protocol parameters |
| `agentic/galaxy/` | Coordinate grid (6481×6481), claims, mining engine |
| `agentic/consensus/` | PoAIV verification pipeline, 6 action types |
| `agentic/economics/` | Staking, vesting, rewards, fee model |
| `agentic/privacy/` | Sparse Merkle Tree (depth 26), nullifiers, ownership proofs |
| `agentic/testnet/` | FastAPI server, genesis initialization, frontend contract |
| `tests/` | 387 pytest tests mirroring `agentic/` structure |

## Key Concepts

- **Proof of Energy (PoE):** Block time grows +5s/block (10s → 300s max); rewards halve every 50 blocks
- **Resource density:** Deterministic SHA-256 hash of (x, y) → float [0,1], higher near origin
- **Genesis:** `create_genesis(seed=42)` → 9 deterministic claims at (0,0), (0,10), (10,0), etc.
- **Dynamic difficulty:** `_current_block_time_s()` in `api.py`

## Start Commands

```bash
uvicorn agentic.testnet.api:app --port 8080 --reload   # dev mode
python3 start.py                                        # protected mode (password gate)
python3 -m pytest tests/ -v                             # run all 387 tests
```

## API Base URL

`http://localhost:8080` — Swagger at `/docs`
