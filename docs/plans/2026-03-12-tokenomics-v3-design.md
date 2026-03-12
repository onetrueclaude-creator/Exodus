# Tokenomics v3: BME City Economics — Design Document

**Status:** APPROVED
**Date:** 2026-03-12
**Supersedes:** `2026-02-25-tokenomics-v2-design.md`
**Motivation:** Fix inflationary "1 AGNTC per coordinate" mechanic, introduce Burn-Mint Equilibrium, city real estate pricing, Machines Faction as permanent accumulator, and governance-controlled emergency unlock.

---

## 1. Design Principles

1. **Mining is the only supply-expanding mechanism** (plus negligible signup bonuses)
2. **Node claims are a cost, not a yield** — claims burn AGNTC via BME
3. **City real estate model** — inner rings are expensive, outer frontier is cheap
4. **Self-balancing economy** — high activity = deflationary, low activity = mildly inflationary
5. **Machines Faction never sells** — permanent accumulator, protocol health metric
6. **Human governance** — only staked human users vote; Machines have zero voting power

---

## 2. Token Supply Model

### Genesis & Initial Supply

| Parameter | v2 (old) | v3 (new) |
|-----------|----------|----------|
| Genesis supply | 900 AGNTC (9 nodes × 100 coords) | **900 AGNTC** (unchanged) |
| Genesis distribution | 25/25/25/25 factions | **25/25/25/25** (unchanged) |
| Signup bonus | None | **1 AGNTC fresh mint per new user** |
| Node claim yield | 1 AGNTC minted per coordinate | **Removed — claims are a cost** |
| Max supply | 1B organic, uncapped | **Soft cap with 5% annual inflation ceiling** |
| Supply growth | Organic via mining + coordinate claims | **Mining only (+ signup bonuses)** |

### Supply Growth Mechanics

**Two things mint new AGNTC:**
1. **Mining** — block rewards at `BASE_MINING_RATE / hardness`, modified by density and stake weight
2. **Signup bonus** — 1 AGNTC minted per new user registration (negligible at scale)

**Three things burn or lock AGNTC:**
1. **Node claims** — AGNTC cost burned via BME (verifiers receive equivalent mint; net-zero on supply)
2. **Transaction fees** — 50% burned permanently
3. **Machines Faction accumulation** — effectively locked forever (no sell, no vote)
4. **Slashing** — misbehaving validators lose staked AGNTC (burned)

### Burn-Mint Equilibrium (BME)

When a user claims a node:
- They pay `claim_cost` in AGNTC → **burned**
- Verifiers who validated the claim receive **freshly minted** AGNTC equal to the burn amount
- Net supply impact from claims: **zero** — tokens flow from claimers to verifiers
- CPU Energy spent on claims is burned **permanently** (non-recoverable)

### Soft Cap with Inflation Ceiling

- No hard max supply
- **Annual inflation ceiling: 5%** (governance-adjustable via `ANNUAL_INFLATION_CEILING`)
- If mining + BME minting would exceed the ceiling in an epoch, mining rewards compress proportionally:

```python
epoch_growth = sum(block_rewards) + signup_mints
allowed_growth = circulating_supply * (ANNUAL_INFLATION_CEILING / epochs_per_year)
if epoch_growth > allowed_growth:
    compression = allowed_growth / epoch_growth
    each block_reward *= compression
```

- At maturity (high hardness, full grid), mining rewards approach near-zero naturally via `16 × ring`
- Fee burns create net deflation when network activity is high

---

## 3. Node Claim Economics (City Real Estate Model)

### Claim Cost Formula

```python
claim_cost_agntc = max(BASE_CLAIM_COST * density * (1 / ring), MIN_CLAIM_COST)
claim_cost_cpu   = max(BASE_CLAIM_CPU  * density * (1 / ring), MIN_CLAIM_CPU)
```

Where:
- `BASE_CLAIM_COST = 10` — AGNTC base cost (tunable)
- `BASE_CLAIM_CPU = 100` — CPU Energy base cost (tunable)
- `MIN_CLAIM_COST = 0.1` — AGNTC floor (prevents near-zero outer ring claims)
- `MIN_CLAIM_CPU = 10` — CPU floor
- `density` — node resource density [0.01 – 1.0] (SHA-256 derived, existing)
- `ring` — epoch ring the node sits in (1 = genesis core, higher = further out)

### Price Gradient Examples

| Node Location | Density | Ring | AGNTC Cost | CPU Cost |
|---------------|---------|------|------------|----------|
| Inner core, rich | 0.95 | 1 | 9.5 | 95 |
| Inner core, poor | 0.20 | 1 | 2.0 | 20 |
| Mid-ring, rich | 0.80 | 5 | 1.6 | 16 |
| Mid-ring, poor | 0.30 | 5 | 0.6 | 6 |
| Outer frontier, rich | 0.90 | 20 | 0.45 | 4.5 → 10 (floor) |
| Outer frontier, poor | 0.15 | 20 | 0.1 (floor) | 10 (floor) |

### Strategic Implications

- **Genesis ring (ring 1)** — premium Manhattan real estate, costs 10× more than ring 10
- **High-density inner nodes** — expensive to claim, but highest mining returns (density multiplies mining rate)
- **Outer frontier** — cheap to claim, low mining returns due to high hardness. Accessible to free-tier users
- **Machines Faction** — as genesis inner-ring holders, they earn the highest mining rewards. This is correct: the protocol backbone holds prime real estate

### BME Flow on Claims

```
User pays 9.5 AGNTC to claim inner-core node
  → 9.5 AGNTC burned
  → 9.5 AGNTC minted to the 13 verifiers who validated the claim
    (split: 60% to verifiers, 40% to stakers per REWARD_SPLIT)
  → Net supply change: 0
  → User also spent CPU Energy (permanently burned)
```

### Claim Prerequisite

To claim a node, the user **must have active stake** (past warmup period). This creates the onboarding funnel:
1. Register → receive 1 AGNTC
2. Stake 1 AGNTC → warmup
3. Mine from homenode → accumulate
4. Claim additional nodes with accumulated AGNTC + CPU

---

## 4. Mining & Reward Mechanics

### Mining Formula (unchanged from v2)

```python
block_reward = BASE_MINING_RATE * density * stake_weight / hardness
```

- `BASE_MINING_RATE = 0.5` AGNTC/block
- `density` = node resource density [0.01 – 1.0]
- `stake_weight` = effective dual stake: `0.40 * token_pct + 0.60 * cpu_pct`
- `hardness` = `16 * ring` (uncapped)

### Mining Yield Decay

| Ring | Hardness | Max reward/block | Annual max per node |
|------|----------|------------------|---------------------|
| 1 | 16 | 0.03125 | ~16,425 |
| 5 | 80 | 0.00625 | ~3,285 |
| 10 | 160 | 0.003125 | ~1,642 |
| 25 | 400 | 0.00125 | ~657 |
| 50 | 800 | 0.000625 | ~328 |

### Reward Distribution (unchanged)

- **60% to Verifiers** — proportional to effective stake
- **40% to Stakers** — proportional to effective stake
- **0% to Orderer** — removed in v2, stays removed

### Vesting (unchanged)

- 50% of Secure rewards: immediately liquid
- 50% of Secure rewards: vests linearly over 30 days

---

## 5. Staking & Dual Staking Model

### Dual Staking Formula (unchanged)

```python
S_eff = ALPHA * token_percentage + BETA * cpu_percentage
# ALPHA = 0.40, BETA = 0.60
```

### Staking Lifecycle (unchanged)

```
WARMUP (1 epoch) → ACTIVE → COOLDOWN (2 epochs) → RELEASED
```

### Staking as Claim Prerequisite (new)

Users must have active stake to claim nodes. The signup 1 AGNTC serves as the entry ticket to staking.

### Staker Revenue Streams

1. **Block rewards** — 40% of mining output
2. **Transaction fees** — 40% of the 50% that isn't burned (i.e., 20% of total fees)
3. **BME claim mints** — 40% of freshly minted AGNTC from node claims

---

## 6. Machines Faction (Treasury & Permanent Accumulator)

### Role

The Machines Faction (25% genesis allocation) represents autonomous AI agents on the network:

1. **Permanent Miners** — always online, always mining, always validating
2. **Permanent Accumulator** — never sells AGNTC, ever
3. **Protocol Health Metric** — treasury size = total value the AI backbone has produced
4. **No Voting Power** — zero governance weight; humans steer, machines execute

### Economic Rules

```
MACHINES_SELL_POLICY = "NEVER"           # never sell AGNTC under any condition
MACHINES_VOTING_POWER = 0                # excluded from all governance votes
MACHINES_AUTO_MINE = True                # mine every block automatically
MACHINES_EMERGENCY_UNLOCK_THRESHOLD = 0.75  # 75% supermajority to unlock
```

### Why Never Sell

- Every AGNTC flowing into Machines treasury is **effectively locked** — removed from circulating supply
- No sell overhang — investors never worry about a treasury dump
- More deflationary than selling above cost — fee burns reduce supply AND Machines accumulation reduces effective circulating supply
- Clean narrative: "The Machines mine, validate, and accumulate — but never sell"

### Emergency Governance Override

If the network faces an existential crisis, a **75% supermajority of all staked human AGNTC** can unlock a specific amount from the Machines treasury for a specific purpose. This is the "break glass in case of emergency" mechanism.

---

## 7. Governance

### Voting Eligibility

- **Human users with active stake only** — Machines Faction has zero voting power
- Vote weight proportional to staked AGNTC
- All votes recorded on-chain, public, auditable

### Vote Types (future implementation)

| Type | Threshold | Description |
|------|-----------|-------------|
| Parameter change | 51% simple majority | Adjust tunable params (inflation ceiling, base costs) |
| Emergency treasury unlock | 75% supermajority | Release specific amount from Machines treasury |
| Protocol upgrade | 67% supermajority | Consensus or structural changes |

### Separation of Powers

- **Humans govern:** vote, set policy, decide priorities
- **Machines execute:** mine, validate, accumulate, stabilize
- Neither can override the other in normal operation

---

## 8. Full Token Lifecycle

### Phase 1: Genesis
```
900 AGNTC minted → 225 per faction (Community, Machines, Founders, Professional)
9 genesis nodes placed (ring 1)
Machines Faction begins autonomous mining immediately
```

### Phase 2: Onboarding
```
New user registers → 1 AGNTC minted (fresh signup bonus)
User stakes 1 AGNTC → warmup (1 epoch)
Homenode assigned → begins earning mining rewards
Accumulates AGNTC + CPU Energy over time
```

### Phase 3: Expansion
```
User claims additional node:
  → Pays AGNTC + CPU Energy (city model pricing)
  → AGNTC burned → equivalent minted to verifiers (BME)
  → CPU Energy burned permanently
  → New node begins mining
  → Grid expands → new epoch ring → hardness increases
```

### Phase 4: Steady State
```
Mining rewards shrink via hardness (16 × ring)
Fee burns (50%) remove AGNTC from circulation
Machines Faction accumulates (effective permanent lock)
Inflation ceiling (5%) compresses if growth spikes
Equilibrium: new supply ≈ burns + Machines accumulation
Effective circulating supply stabilizes or slowly deflates
```

### Flow Diagram

```
                    ┌─────────────┐
                    │  FRESH MINT │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Mining      Signup Bonus   BME Verifier
        (supply+)     (1 AGNTC)      Mints
              │            │        (net-zero)
              ▼            ▼            │
         ┌─────────────────────┐       │
         │  CIRCULATING SUPPLY │◄──────┘
         └──────────┬──────────┘
                    │
       ┌────────────┼───────────────┐
       ▼            ▼               ▼
   Fee Burn     Claim CPU       Machines
    (50%)       Burn (perm)    Accumulation
   (supply-)    (non-AGNTC)   (effective lock)
       │                            │
       ▼                            ▼
  ┌──────────┐            ┌────────────────┐
  │ DESTROYED │            │ LOCKED FOREVER │
  └──────────┘            │ (unless 75%    │
                          │  governance)   │
                          └────────────────┘
```

---

## 9. Parameter Changes Summary

### params.py — New Constants

```python
# Node Claim Economics (City Real Estate Model)
BASE_CLAIM_COST = 10        # AGNTC base cost for node claims
BASE_CLAIM_CPU = 100        # CPU Energy base cost for node claims
MIN_CLAIM_COST = 0.1        # AGNTC floor for outer-ring claims
MIN_CLAIM_CPU = 10          # CPU floor for outer-ring claims

# Inflation Ceiling
ANNUAL_INFLATION_CEILING = 0.05  # 5% max annual supply growth

# Machines Faction
MACHINES_SELL_POLICY = "NEVER"
MACHINES_VOTING_POWER = 0
MACHINES_AUTO_MINE = True
MACHINES_EMERGENCY_UNLOCK_THRESHOLD = 0.75

# Signup Bonus
SIGNUP_BONUS_AGNTC = 1      # fresh mint per new user registration

# Staking prerequisite
CLAIM_REQUIRES_ACTIVE_STAKE = True
```

### params.py — Constants to Remove

```python
# REMOVE (v1 legacy, never updated to v2):
TOTAL_SUPPLY = 42_000_000
INITIAL_CIRCULATING = 42_000_000
INITIAL_INFLATION_RATE = 0.10
DISINFLATION_RATE = 0.10
INFLATION_FLOOR = 0.01
DIST_COMMUNITY = 0.40
DIST_TREASURY = 0.30
DIST_TEAM = 0.20
DIST_AGENTS = 0.10
GRID_MIN = -3240
GRID_MAX = 3240
MAX_EPOCH_HARDNESS = 100
```

---

## 10. Files to Modify

### Backend (agentic-chain)

| File | Change |
|------|--------|
| `params.py` | Add new constants, remove legacy v1 constants |
| `coordinate.py` | Add `claim_cost(x, y, ring)` city model function |
| `mining.py` | Remove "1 AGNTC per coordinate" minting, remove `CommunityPool` |
| `rewards.py` | Replace scheduled inflation with ceiling enforcement; add BME minting for verifiers on claims |
| `epoch.py` | Add per-epoch supply growth tracking for ceiling check |
| `genesis.py` | Flag Machines Faction nodes as autonomous, never-sell |
| `staking.py` | Add `claim_requires_active_stake` check |
| `api.py` | `/api/coordinate/{x}/{y}` returns claim cost; new `/api/governance` endpoint stub |

### Frontend

| File | Change |
|------|--------|
| `gameStore.ts` | Add claim cost display state, governance state stub |
| `ResourceBar.tsx` | Show claim cost when node selected |
| `chainService.ts` | Add `getClaimCost(x, y)` to interface |
| `blockchain.ts` (types) | Add claim cost types, governance types |

### Documentation

| File | Change |
|------|--------|
| `vault/whitepaper.md` | Major rewrite: §9 (token overview), §10 (supply/distribution), §11 (mining), §12 (fee model), new governance section, Machines Faction rewrite |
| `vault/litepaper.md` | Update tokenomics summary to match v3 |
| Website `tokenomics.html` | Update stats, pie chart narrative, economic model description |
| Website `staking.html` | Update staking mechanics if affected |

### Stack Layers

| File | Change |
|------|--------|
| `stack/intent.md` | Update tradeoffs (BME over fixed inflation), add Machines Faction as protocol-level economic actor, add governance goals |
| `stack/judgement.md` | Update risk categories (claim cost miscalculation = high risk), update confidence calibration with v3 params |
| `stack/coherence.md` | Add Machines Faction identity rules, governance separation of powers |
| `stack/context.md` | Reference this design doc as authoritative tokenomics spec |

---

## 11. Research Basis

Tokenomics design informed by analysis of comparable projects:

| Project | Mechanism Adopted | Adaptation |
|---------|-------------------|------------|
| **Render (RNDR)** | Burn-Mint Equilibrium | Applied to node claims: AGNTC burned, verifiers receive equivalent mint |
| **Solana (SOL)** | 50% fee burn + disinflationary schedule | Kept 50% fee burn; replaced schedule with soft cap + hardness curve |
| **Bittensor (TAO)** | Quality-weighted mining, subnet architecture | Maps to PoAIV (AI verification quality), grid nodes as mini-subnets |
| **Ronin (RON)** | Treasury buybacks, DPoS | Machines Faction as autonomous treasury; never-sell > buyback |
| **Akash (AKT)** | BME for compute payments | Validates BME model for compute-backed tokens |

---

## 12. Comparative Advantages

| Feature | ZkAgentic v3 | Solana | Bittensor | Render |
|---------|-------------|--------|-----------|--------|
| Supply model | Soft cap + hardness curve | Perpetual inflation (floor 1.5%) | Hard cap (21M) + halving | Hard cap (537M) + BME |
| Fee burn | 50% | 50% base fees | None | BME (usage burns) |
| Staking | Dual (40% token + 60% CPU) | Pure PoS | No slashing, no lock | N/A |
| Treasury | AI-governed, never-sell | Foundation (human) | Subnet owners (human) | Foundation (human) |
| Governance | Human-only, on-chain | Foundation + validators | Subnet owners | Foundation |
| Claim/expansion | City model (inner expensive) | N/A | Subnet registration | N/A |
| Mining decay | Hardness = 16×ring (organic) | Inflation schedule | Halving events | Emission schedule |
