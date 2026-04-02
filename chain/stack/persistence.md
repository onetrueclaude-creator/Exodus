# Layer 1: State Persistence

**Question:** *Can we survive a restart?*

> State persistence is the foundation of any production blockchain. Without it, every process restart wipes the ledger and all economic activity with it.

## Why This Is Layer 1

Every other layer depends on this. You cannot monitor a chain that forgets its state. You cannot deploy a chain that loses all data on restart. Persistence is the foundation everything else builds on.

## Current State: IMPLEMENTED ✓ (2026-03-29)

SQLite persistence is live via `agentic/testnet/persistence.py`. Thin-overlay pattern:

- Genesis always reconstructs from `create_genesis(seed=42)` first (deterministic 9 nodes, 50 wallets)
- SQLite stores only the mutable delta on top of genesis: user claims, subgrid allocations, resource totals, block count, epoch ring, circulating supply, burned fees, intro messages, message history
- `save_state()` called after every block mine
- `load_state()` called at startup after genesis — restores all post-genesis activity
- `clear_state()` called on `/api/reset` before fresh genesis
- DB path controlled by `DB_PATH` env var (default: `testnet_state.db` local, `/app/data/testnet_state.db` on Railway)
- Railway Volume must be mounted at `/app/data/` for state to survive container restarts

### Key Invariant
`GLOBAL_BOUNDS.expand_to_contain(x, y)` must be called **before** `GridCoordinate(x=x, y=y)` when restoring user claims from SQLite. Grid bounds start at ±20 (genesis); restoring out-of-range coords raises `ValueError` if bounds not expanded first.

### What is NOT persisted (always reconstructed)
Genesis claims (9 nodes), wallets 0–49, validators/VerificationAgents, LedgerState records, SubgridAllocators for genesis wallets, VerificationPipeline.

## Industry Standard Approaches

| Approach | Used By | Trade-offs |
|----------|---------|------------|
| **Embedded KV store** (LevelDB/RocksDB) | Bitcoin, Ethereum, CometBFT | Fast, no external deps, proven. Harder to query ad-hoc |
| **SQLite** | Lightweight chains, sidechains | SQL queryability, single-file, good for single-node |
| **PostgreSQL** | Indexing layers (The Graph, Subsquid) | Rich queries, but overkill for chain state — use for indexing only |
| **Custom binary format** | Solana (AccountsDB) | Maximum performance, maximum complexity |

**Recommendation for Agentic Chain:** SQLite for state persistence (single-node testnet, Python-native, zero external deps), with Supabase remaining as the dashboard/frontend feed.

## Target Architecture

```
                  ┌─────────────┐
                  │  GenesisState │  (in-memory, hot state)
                  └──────┬──────┘
                         │
              ┌──────────┴──────────┐
              │                     │
     ┌────────▼────────┐  ┌────────▼────────┐
     │  SQLite WAL      │  │  Supabase Sync   │
     │  (persistence)   │  │  (dashboard feed) │
     │  LOCAL, fast     │  │  REMOTE, async    │
     └─────────────────┘  └─────────────────┘
```

## Key Files

| File | Role | Status |
|------|------|--------|
| `agentic/testnet/genesis.py` | Creates initial state | Exists |
| `agentic/testnet/api.py` | Holds global `GenesisState`, wires save/load/clear | Exists |
| `agentic/testnet/supabase_sync.py` | Push-only Supabase feed | Exists |
| `agentic/testnet/persistence.py` | SQLite save/load/clear | **Implemented 2026-03-29** |

## Remaining Gaps

- [ ] **Graceful shutdown** — no SIGTERM handler; process kill loses at most one in-progress block (save happens post-mine, so crash during mine = 1 block lost). Acceptable for testnet.
- [ ] **Read-back from Supabase** — fallback if local SQLite is lost. Not implemented; manual reset is the recovery path.
- [ ] **Snapshot export** — no JSON/binary dump for migration. Not needed until mainnet.

## Success Criteria — MET ✓

- Chain process restarts and resumes from the last block ✓
- Recovery time < 5 seconds ✓ (load_state is synchronous, finishes before first mine)
- At most 1 block loss on crash ✓ (save happens after each mine completes)
