# Design — Resource System Revision (CPU Tokens, Subgrid Allocation, Per-Block Economy)

**Date:** 2026-02-25
**Branch:** exodus-dev
**Status:** Approved — ready for implementation

---

## 1. Overview

This document revises the resource model to reflect a verifiable, compute-backed economy.
**CPU Energy is renamed CPU Tokens** and becomes a read-only cumulative proof-of-work counter.
A new **subgrid allocation panel** lets users assign inner sub-cells to 4 autonomous agent types
that each produce a distinct resource per block. **CPU Staked** is introduced as a live measure
of compute committed to mining.

---

## 2. Resource Definitions

| Resource | Type | Direction | Source |
|----------|------|-----------|--------|
| **CPU Tokens** | Personal cumulative | ↑ only | All active Claude terminals (tokens spent) |
| **CPU Staked (active)** | Live | ↑↓ | Tokens spent by Secure sub-agents this block |
| **CPU Staked (total)** | Cumulative | ↑ only | All-time Secure token spend |
| **AGNTC** | Spendable coin | ↑↓ | Mined by Secure sub-agents |
| **Secured Chains** | Counter | ↑ | Blocks secured per mining cycle |
| **Dev Points** | Spendable | ↑↓ | Develop sub-agents → spent to level up subsquares |
| **Research Points** | Spendable | ↑↓ | Research sub-agents → spent to unlock skills |
| **Storage Size** | Capacity counter | ↑↓ | ZK Storage sub-agents (data on-chain) |

### CPU Tokens — Accumulation Rule

```
user_cpu_tokens_per_block += tokens_spent(homenode_terminal)
                           + Σ tokens_spent(deployed_agent_i)

network_cpu_tokens = Σ all users' cpu_tokens
```

Every Claude terminal the user has active contributes. Token spend is broadcast to the API
in real-time; block cycle is the settlement rhythm. **CPU Tokens is never spent or destroyed.**

### CPU Staked — Measurement Rule

```
cpu_staked_active  = tokens_spent(Secure sub-agents this block)   [live, resets each block]
cpu_staked_total  += cpu_staked_active                             [cumulative, never decreases]
```

CPU Staked is a measurement of actual token spend on Secure actions — not a formula.
More Secure subsquares = more staked compute = more mining power.

---

## 3. Subgrid Allocation System

### Inner Grid

Each homenode contains a **private 8×8 = 64 sub-cell minigrid** (same minigrid from galaxy grid design).
This tab is **visible only to the owner** — other users cannot see the allocation.

Users assign each sub-cell to one of 4 types. Allocation is by count; the system converts
to percentage of total compute budget automatically.

### Sub-cell Types

| Type | Agent Behaviour | Produces |
|------|----------------|----------|
| **Secure** | Looping puppet agent — mines/secures blockchain blocks via agentic action | AGNTC + Secured Chains |
| **Develop** | Looping puppet agent — generates development points | Development Points |
| **Research** | Looping puppet agent — generates research points | Research Points |
| **Storage** | ZK tunnel puppet agent — reads/writes/modifies private data in ledger blocks | Storage Size (bytes on-chain) |

All sub-agents run autonomously each block. Users set the allocation; agents loop without
manual intervention.

### Storage Agent Architecture

The Storage sub-agent uses zero-knowledge agentic protocols (reference: Filecoin Proof of
Spacetime architecture). It functions as a pure data tunnel:
- **Write**: store data in ledger blocks (encrypted, owner-private)
- **Read**: retrieve owned data without revealing to others
- **Modify**: update existing stored data (versioned on-chain)

Storage Size = total bytes/units of private data this user owns on-chain.
Verifiable via ZK proof without exposing contents.

---

## 4. Per-Block Calculations

### Level Scaling

Each sub-cell has an integer level ≥ 1. Leveling costs Development Points.

```
output(type, level) = base_rate[type] × level^0.8
```

Reference values (to calibrate during testing):

| Level | Multiplier |
|-------|-----------|
| 1     | 1.00×     |
| 2     | 1.74×     |
| 5     | 3.62×     |
| 10    | 6.31×     |
| 20    | 10.99×    |

### Per-Block Formulas

```python
# Secure squares → AGNTC (epoch hardness applied)
agntc_per_block = Σ [base_secure × level_i^0.8 × density(x, y)] / epoch_hardness

# Secure squares → CPU Staked (actual token spend, not formula)
cpu_staked_active = Σ tokens_spent(Secure_sub_agent_i, this_block)

# Develop squares → Development Points
dev_points_per_block = Σ base_develop × level_i^0.8

# Research squares → Research Points
research_points_per_block = Σ base_research × level_i^0.8

# Storage squares → Storage capacity added
storage_delta = Σ base_storage × level_i^0.8   # units of on-chain data capacity

# CPU Tokens (measured from all terminals)
cpu_tokens_delta = Σ tokens_spent(all_active_terminals, this_block)
```

### Base Rates (TBD — calibrate in testing)

| Type | Param | Notes |
|------|-------|-------|
| Secure | `BASE_SECURE_RATE` | Aligns with existing `BASE_MINING_RATE_PER_BLOCK` |
| Develop | `BASE_DEVELOP_RATE` | Calibrate for upgrade economy pacing |
| Research | `BASE_RESEARCH_RATE` | Calibrate for skill unlock pacing |
| Storage | `BASE_STORAGE_RATE` | Calibrate for Filecoin-comparable storage units |

---

## 5. ResourceBar UI Changes

### Current → Revised

| Current Label | Revised Label | Change |
|---------------|--------------|--------|
| CPU Energy | CPU Tokens | Renamed; now read-only cumulative |
| (none) | CPU Staked | New — two values: active + total |
| Secured Chains | Secured Chains | Unchanged |
| AGNTC | AGNTC | Unchanged |
| (none) | Dev Points | New |
| (none) | Research Points | New |
| (none) | Storage Size | New |

### Timechain Stats Panel — New Network Stats

- **Network CPU Tokens** — cumulative across all users ever
- **Network CPU Staked (active)** — total actively staking this block

---

## 6. Subgrid Allocation Tab

- New tab in the dock panel (visible only to owner)
- Renders the 8×8 inner grid with color-coded cell types
- Drag or click to assign cells to Secure / Develop / Research / Storage
- Shows per-type count, percentage, and projected output per block
- Shows total level across each type (sum of all cell levels of that type)
- Level upgrade button per cell: shows Dev Points cost to level up

---

## 7. Open Items (TBD during implementation)

- [ ] Exact `BASE_SECURE_RATE`, `BASE_DEVELOP_RATE`, `BASE_RESEARCH_RATE`, `BASE_STORAGE_RATE`
- [ ] Max level per subsquare (cap at 10? 20? 100?)
- [ ] Dev Points cost formula for leveling: flat cost? exponential?
- [ ] Storage unit definition (bytes? abstract "data blocks"? tied to NCP packet size?)
- [ ] ZK proof protocol for Storage agent (Sparse Merkle Tree nullifiers already in `agentic/privacy/`)
- [ ] How CPU Tokens are broadcast to API (WebSocket? polling? new `/api/token-spend` endpoint?)
- [ ] Whether Develop/Research/Storage sub-agents also contribute to CPU Tokens (they do — they run Claude too)

---

## 8. Dependencies

- Extends: `docs/plans/2026-02-25-blockchain-epoch-tokenomics-design.md` (epoch/ring expansion)
- Affected files:
  - `apps/agentic-chain/agentic/params.py` — new base rate params
  - `apps/agentic-chain/agentic/galaxy/` — subgrid allocation model
  - `apps/agentic-chain/agentic/testnet/api.py` — new resource endpoints
  - `src/store/gameStore.ts` — new resource state fields
  - `src/components/ResourceBar.tsx` — renamed + new counters
  - `src/components/` — new SubgridAllocation panel/tab
  - `src/hooks/useGameRealtime.ts` — fetch + broadcast new resource fields
