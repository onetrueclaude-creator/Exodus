# Layer 2: Consensus & Block Production

**Question:** *Are blocks being produced correctly?*

> Consensus governs how new blocks are created, validated, and finalized. On a single-node testnet, "consensus" is simplified to the auto-miner loop and epoch advancement — but the mechanics must be correct because they define the economic model.

## Why This Is Layer 2

Block production depends on persistence (Layer 1) — blocks must be stored after they're created. Everything above (API, monitoring, deployment) depends on blocks being produced correctly.

## Current State

The auto-miner is functional but fragile:

| Component | Status | File |
|-----------|--------|------|
| Auto-miner loop | Working — mines every 60s via `asyncio` background task | `api.py` |
| Epoch advancement | Working — ring expands, hardness = 16 x ring | `epoch.py` |
| Mining engine | Working — `compute_block_yields()` distributes rewards | `mining.py` |
| PoAIV validation | Simulated — `VerificationAgent` exists but no real CPU verification | `consensus/validator.py` |
| Block finality | Instant — single validator, 100% voting power | `consensus/block.py` |
| Rate limiting | 60s cooldown on manual `/api/mine` | `api.py` |

### Single-Node Consensus

The testnet runs a single validator with 100% voting power. This is standard practice for early testnets (CometBFT/Cosmos SDK documents this pattern). Block production is deterministic:

```
auto_miner_loop:
    while True:
        sleep(BLOCK_TIME_S)        # 60s fixed interval
        mine_block()               # compute yields, advance epoch if needed
        broadcast("new_block")     # WebSocket event
        sync_to_supabase()         # async push
```

## Key Concerns

### Block Time Stability
- Fixed 60s interval via `BLOCK_TIME_MS` in `params.py`
- The `asyncio.sleep()` drift is acceptable for testnet (wall-clock drift < 1s/hour)
- Production would need monotonic clock or epoch-based scheduling

### Epoch Advancement
- Ring expands when claim count exceeds ring capacity
- Hardness = `HARDNESS_MULTIPLIER (16) x ring_number`
- This divides mining yield, making early rings significantly more profitable

### Reward Distribution
- Burn-Mint Equilibrium: claim fees burned, equivalent value minted to verifiers/stakers
- Verifier 60% / Staker 40% split (from `params.py`)
- 5% annual inflation ceiling enforced in `rewards.py`

### Genesis Determinism
- `create_genesis(seed=42)` always produces the same initial state
- 9 nodes: 1 Origin at (0,0), 4 Faction Masters at corners, 4 Unclaimed on diagonals
- Genesis supply: 900 AGNTC

## Implementation Checklist

- [ ] **Persist each block** to SQLite immediately after mining (depends on Layer 1)
- [ ] **Block height tracking** — sequential block numbers, no gaps on restart
- [ ] **Auto-miner resilience** — if the loop crashes, it should restart automatically
- [ ] **Epoch state checkpoint** — save ring number and claim count alongside block data
- [ ] **Transaction replay** — ability to replay transactions from WAL to rebuild state

## Failure Mode

**Silent block production halt.** The auto-miner `asyncio` task dies (unhandled exception, memory pressure) but the FastAPI process stays alive. The API returns stale data. No new blocks are produced. The monitor dashboard shows "last block: 47 minutes ago" but no alert fires because monitoring (Layer 4) isn't configured yet.

## Success Criteria

- Blocks produced at consistent ~60s intervals (±5s drift acceptable)
- Epoch advancement triggers correctly at ring capacity boundaries
- Block height is sequential with no gaps, even across restarts
- Reward calculations match whitepaper formulas (verifiable via `/api/status`)
