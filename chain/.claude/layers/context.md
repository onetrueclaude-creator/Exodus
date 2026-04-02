---
priority: 80
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Context — What This Child Knows

## Source Layout

```
vault/agentic-chain/
  agentic/                    # Python package root
    galaxy/                   # Grid topology, coordinates, node placement
    consensus/                # PoAIV consensus engine
    economics/                # Tokenomics, rewards, mining, epoch
    privacy/                  # ZK privacy layer
    testnet/                  # FastAPI server, Supabase sync, persistence
      api.py                  # FastAPI app — all endpoints
      supabase_sync.py        # Sync chain state to Supabase after mining
      persistence.py          # SQLite save/load for crash recovery
      params.py               # ALL protocol constants (source of truth)
      genesis.py              # Deterministic genesis (seed=42)
      mining.py               # Block mining logic
      epoch.py                # Epoch advancement, ring expansion
      coordinate.py           # Claim cost calculation (city model)
      rewards.py              # Verifier/staker reward distribution
    actions/                  # Chain action types
    ledger/                   # Block/transaction ledger
    verification/             # Verification logic
  tests/                      # 387+ pytest tests
    monitor_crosscheck/       # 82 crosscheck tests (API ↔ Supabase)
  stack/                      # Operational layer docs (NOT identity layers)
    persistence.md
    consensus.md
    network.md
    monitoring.md
    deployment.md
  docs/                       # Deploy runbooks, gap reports
  Dockerfile                  # Railway deploy image
  requirements.txt            # Python dependencies
  start.py                    # Entrypoint script
```

## External Dependencies

- **Supabase:** Project `inqwwaqiptrmpxruyczy` — tables: `chain_status`, `agents`, `subgrid_allocations`, `resource_rewards`, `waitlist`
- **Railway:** Docker deploy with SQLite volume at `/app/data/`
- **Public URL:** `api.zkagentic.ai`

## Consumers

- **zkagentic.ai** (testnet monitor) — reads chain_status, agents via Supabase Realtime
- **zkagenticnetwork.com** (game UI, future) — will call API endpoints directly
- **Exodus origin orchestrator** — dispatches tasks, reads status

## Key Parameters (from params.py)

- Fee Burn: 50%
- Staking: alpha=40% token, beta=60% CPU
- Rewards: Verifier 60%, Staker 40%
- Hardness: 16N
- Genesis Supply: 900 AGNTC
- Signup Bonus: 1 AGNTC fresh mint
- Claim Cost: BASE=100 AGNTC + 50 CPU (city model: cost x density x 1/ring)
- Inflation Ceiling: 5% annual
