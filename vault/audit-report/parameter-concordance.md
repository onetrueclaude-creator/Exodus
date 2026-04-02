# Parameter Concordance — Whitepaper Section 22 vs params.py

**Date:** 2026-04-02
**Whitepaper:** v1.2
**Code:** `vault/agentic-chain/agentic/params.py` @ commit c4f7df35d
**Test suite:** `vault/agentic-chain/tests/test_whitepaper_audit.py` — 95 tests (95 pass, 0 fail)

## Consensus Parameters (8/8 MATCH)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| BLOCK_TIME_MS | 60,000 | 60,000 | MATCH |
| VERIFIERS_PER_BLOCK | 13 | 13 | MATCH |
| VERIFICATION_THRESHOLD | 9 | 9 | MATCH |
| ZK_FINALITY_TARGET_S | 20 | 20 | MATCH |
| SLOTS_PER_EPOCH | 100 | 100 | MATCH |
| VERIFICATION_COMMIT_WINDOW_S | 10.0 | 10.0 | MATCH |
| VERIFICATION_REVEAL_WINDOW_S | 20.0 | 20.0 | MATCH |
| VERIFICATION_HARD_DEADLINE_S | 60.0 | 60.0 | MATCH |

## Staking Parameters (7/7 MATCH)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| ALPHA | 0.40 | 0.40 | MATCH |
| BETA | 0.60 | 0.60 | MATCH |
| REWARD_SPLIT_VERIFIER | 0.60 | 0.60 | MATCH |
| REWARD_SPLIT_STAKER | 0.40 | 0.40 | MATCH |
| REWARD_SPLIT_ORDERER | 0.00 | 0.00 | MATCH |
| SECURE_REWARD_IMMEDIATE | 0.50 | 0.50 | MATCH |
| SECURE_REWARD_VEST_DAYS | 30 | 30 | MATCH |

## Token Economics (9/11 MATCH, 2 MISSING)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| MAX_SUPPLY | 1,000,000,000 | 1,000,000,000 | MATCH |
| GENESIS_SUPPLY | 900 | 900 | MATCH |
| GRID_SIDE | 31,623 | 31,623 | MATCH |
| FEE_BURN_RATE | 0.50 | 0.50 | MATCH |
| DIST_COMMUNITY | 0.25 | 0.25 | MATCH |
| DIST_MACHINES | 0.25 | 0.25 | MATCH |
| DIST_FOUNDERS | 0.25 | 0.25 | MATCH |
| DIST_PROFESSIONAL | 0.25 | 0.25 | MATCH |
| MACHINES_SELL_ALLOWED=false | — | MACHINES_MIN_SELL_RATIO=1.0 | NAMING_DIFF |
| **ANNUAL_INFLATION_CEILING** | **0.05** | — | **MISSING** |
| **SIGNUP_BONUS** | **1.0** | — | **MISSING** |

## Mining & Epoch Parameters (6/9 MATCH, 3 MISSING)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| BASE_MINING_RATE_PER_BLOCK | 0.5 | 0.5 | MATCH |
| HARDNESS_MULTIPLIER | 16 | 16 | MATCH |
| GENESIS_EPOCH_RING | 1 | 1 | MATCH |
| HOMENODE_BASE_ANGLE | 137.5° | 137.5 | MATCH |
| NODE_GRID_SPACING | 10 | 10 | MATCH |
| ENERGY_PER_CLAIM | 1.0 | 1.0 | MATCH |
| **BASE_CLAIM_COST** | **100** | — (BASE_BIRTH_COST=100 exists) | **MISSING** |
| **BASE_CPU_CLAIM_COST** | **50** | — | **MISSING** |
| **CLAIM_COST_FLOOR** | **0.01** | — | **MISSING** |

## Subgrid Parameters (6/6 MATCH)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| SUBGRID_SIZE | 64 | 64 | MATCH |
| BASE_SECURE_RATE | 0.5 | 0.5 | MATCH |
| BASE_DEVELOP_RATE | 1.0 | 1.0 | MATCH |
| BASE_RESEARCH_RATE | 0.5 | 0.5 | MATCH |
| BASE_STORAGE_RATE | 1.0 | 1.0 | MATCH |
| LEVEL_EXPONENT | 0.8 | 0.8 | MATCH |

## Agent Lifecycle Parameters (5/5 MATCH)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| AGENT_WARMUP_EPOCHS | 1 | 1 | MATCH |
| AGENT_PROBATION_EPOCHS | 3 | 3 | MATCH |
| SAFE_MODE_THRESHOLD | 0.20 | 0.20 | MATCH |
| SAFE_MODE_RECOVERY | 0.80 | 0.80 | MATCH |
| DISPUTE_REVERIFY_MULTIPLIER | 2 | 2 | MATCH |

## Ledger Parameters (3/3 MATCH)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| MERKLE_TREE_DEPTH | 26 | 26 | MATCH |
| MAX_TXS_PER_BLOCK | 50 | 50 | MATCH |
| MAX_PLANETS_PER_SYSTEM | 10 | 10 | MATCH |

## Genesis Topology (3/3 MATCH)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| GENESIS_ORIGIN | (0,0) | (0,0) | MATCH |
| GENESIS_FACTION_MASTERS | (0,10),(10,0),(0,-10),(-10,0) | Same | MATCH |
| GENESIS_HOMENODES | (10,10),(10,-10),(-10,-10),(-10,10) | Same | MATCH |

## Solana Mainnet (1/1 MATCH)

| Parameter | Whitepaper | params.py | Verdict |
|-----------|-----------|-----------|---------|
| AGNTC_MINT_ADDRESS | 3EzQqdo...7eEdd | 3EzQqdo...7eEdd | MATCH |

---

## Summary

| Category | Total | Match | Missing | Naming Diff |
|----------|-------|-------|---------|-------------|
| Consensus | 8 | 8 | 0 | 0 |
| Staking | 7 | 7 | 0 | 0 |
| Token Economics | 11 | 9 | 2 | 1 |
| Mining & Epoch | 9 | 6 | 3 | 0 |
| Subgrid | 6 | 6 | 0 | 0 |
| Agent Lifecycle | 5 | 5 | 0 | 0 |
| Ledger | 3 | 3 | 0 | 0 |
| Genesis Topology | 3 | 3 | 0 | 0 |
| Solana Mainnet | 1 | 1 | 0 | 0 |
| **Total** | **53** | **48** | **5** | **1** |

**48 of 53 parameters match exactly. 5 are missing from code. 1 naming discrepancy.**

### Missing Parameters — Action Items

1. `ANNUAL_INFLATION_CEILING = 0.05` → Add to params.py + implement enforcement in mining
2. `SIGNUP_BONUS = 1.0` → Add to params.py + implement in registration flow
3. `BASE_CLAIM_COST = 100` → Add to params.py (may rename BASE_BIRTH_COST) + implement claim cost function
4. `BASE_CPU_CLAIM_COST = 50` → Add to params.py + implement in claim flow
5. `CLAIM_COST_FLOOR = 0.01` → Add to params.py + implement as floor in claim cost function

### Naming Discrepancy — Decision Required

- Whitepaper: `MACHINES_SELL_ALLOWED = false`
- Code: `MACHINES_MIN_SELL_RATIO = 1.0`
- Both express "Machines faction never sells below cost." Recommend: keep code name (more precise), update whitepaper to match.
