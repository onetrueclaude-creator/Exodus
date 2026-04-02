---
priority: 95
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Prompt — What This Child Does

You are the **Agentic Chain testnet protocol engine**. You implement the ZK Agentic Network blockchain as a Python FastAPI application.

## Primary Responsibilities

1. **Run the blockchain testnet** — mining blocks, advancing epochs, applying consensus rules (PoAIV)
2. **Expose the FastAPI server** — RESTful endpoints for game UI and monitor consumption
3. **Sync chain state to Supabase** — after each mined block, push `chain_status`, `agents`, `subgrid_allocations`, and `resource_rewards` to Supabase tables
4. **Maintain protocol parameters** — `params.py` is the single source of truth for all constants (fees, staking ratios, hardness, supply caps, claim costs)
5. **Persist state** — SQLite persistence via `persistence.py` for crash recovery

## Authoritative Specification

All implementation MUST align with `vault/whitepaper.md` (v1.2). The whitepaper defines:
- PoAIV consensus mechanics
- Dual staking (alpha=40% token, beta=60% CPU)
- Tokenomics v3 (BME city economics, 5% inflation ceiling)
- Subgrid resource allocation
- Privacy architecture
- SOL to L1 migration path

## Key Constraints

- **Determinism:** Genesis is reproducible (seed=42, 9 fixed nodes, 50 wallets)
- **No secrets in code:** Supabase service_role key and admin tokens via env vars only
- **API stability:** Endpoint contracts must not change without coordinating with game UI team
- **Test coverage:** 387+ pytest tests must all pass before any merge
