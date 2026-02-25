# Design — Blockchain Epoch System + Tokenomics Revision

**Date:** 2026-02-25
**Branch:** exodus-dev
**Status:** Approved — ready for implementation

---

## 1. Overview

The blockchain grid starts small and **expands only through mining**. Every mined block contributes AGNTC to a cumulative pool; when that pool crosses a threshold, a new ring of grid coordinates opens (one Epoch). The 2D galaxy grid always exactly mirrors the blockchain's current coordinate space — the visualization IS the blockchain state.

---

## 2. Epoch / Ring Expansion System

### Genesis State

- Ring 0 (origin) + Ring 1 (8 surrounding cells) = **9 cells pre-revealed**
- `epoch_ring = 1` at genesis
- Mining starts immediately; first Epoch opens ring 2

### Expansion Rule (cumulative)

Ring N opens when **cumulative total AGNTC mined ≥ threshold(N)**:

```
threshold(N) = 8×1 + 8×2 + ... + 8×N = 4 × N × (N+1)
```

| Ring | New cells (8N) | Cumulative AGNTC needed |
|------|---------------|------------------------|
| 2    | 16            | 24                     |
| 3    | 24            | 48                     |
| 4    | 32            | 80                     |
| 5    | 40            | 120                    |
| N    | 8N            | 4N(N+1)                |

### One Ring = One Epoch

The `epoch_ring` counter increments by 1 each time a ring opens. Epoch number = current ring number. The epoch is always readable via `/api/status`.

### When a Ring Opens

- The 8N new cells **appear on the 2D grid as shadowed/unclaimed nodes** — visible but not yet owned
- Players must spend AGNTC via the **Birth action** to claim a revealed cell
- A **WebSocket `epoch_advance` event** broadcasts the new `epoch_ring` to all connected frontends
- The frontend triggers a **ring reveal animation** on the newly visible cells

---

## 3. Homenode Placement

### One Homenode Per Ring

Each faction arm contains **exactly one homenode slot per ring**. When Epoch N opens ring N, a new user can enter the game in that faction by claiming that slot.

- Player 1 in a faction → ring 1 (genesis, pre-revealed)
- Player 2 → ring 2 (opens at Epoch 1 = 24 AGNTC mined)
- Player N → ring N (opens at Epoch N-1)

Player growth per faction is gated by mining speed. **More miners → faster Epochs → more players can join.**

### Prime-Angle Twist

The homenode in ring N is placed at angular offset `prime(N) × BASE_ANGLE mod faction_arc` within the faction's spiral arm. This creates a twisting path of homenodes through the arm — not a straight radial line.

```
prime(1)=2, prime(2)=3, prime(3)=5, prime(4)=7, prime(5)=11, ...
BASE_ANGLE = 137.5°  (golden-prime base angle)
```

The raw angular coordinate is **snapped to the nearest valid grid cell center** (integer x, y at Chebyshev distance N within the faction arc).

### Immediate Placement (No Gating)

When a user subscribes, their homenode is placed on the chain immediately at their ring's snapped coordinate — **regardless of whether that ring has opened yet via Epoch cycles**.

- If `homenode_ring ≤ epoch_ring` → homenode is immediately surrounded by revealed grid
- If `homenode_ring > epoch_ring` → homenode appears as an **isolated lit node in darkness**, floating in unrevealed space until the Epoch tide reaches its ring

### Backbone Link

Adjacent homenodes in the same faction (N-1 ↔ N ↔ N+1) connect via a **bright, thick backbone link** — visually distinct from regular faction connection lines. The backbone traces the twisted prime-angle path through the arm, not a radial line. Homenodes in unrevealed rings show as unlinked until neighboring rings open.

---

## 4. Tokenomics Revision

### Mining Yield Formula

```python
yield_per_block = BASE_MINING_RATE_PER_BLOCK × density × stake_weight / hardness(epoch_ring)

hardness(N) = min(N, MAX_EPOCH_HARDNESS)   # caps at ring 100
```

- At ring 1: hardness = 1 (baseline, full rate)
- At ring 2: hardness = 2 (2× harder)
- At ring N: hardness = N (N× harder)
- At ring 100+: hardness = 100 (permanent floor — 1% of baseline)

### Epoch Timing (Target: Medium / Hours)

`BASE_MINING_RATE_PER_BLOCK` calibrated to ~0.5 AGNTC/block (tune in testing):

| Epoch | Hardness | Est. yield/block | AGNTC needed | Est. duration |
|-------|----------|-----------------|--------------|---------------|
| 2     | 2×       | 0.125           | 16           | ~2 hours      |
| 3     | 3×       | 0.083           | 24           | ~5 hours      |
| 5     | 5×       | 0.05            | 40           | ~13 hours     |
| 10    | 10×      | 0.025           | 80           | ~2.2 days     |
| 20    | 20×      | 0.0125          | 160          | ~9 days       |
| 100   | 100× (cap)| 0.0025         | 800          | ~133 days     |

*Assumes avg density ≈ 0.5. Outer rings naturally have lower density (existing `resource_density()`) — no additional outer-ring penalty needed. Tune and adjust after testing.*

### Outer Ring Difficulty

Two natural sources of increasing difficulty at outer rings:

1. **Epoch hardness** (`/N`) — explicit, deterministic, tied to ring number
2. **Resource density** (`resource_density(x,y)`) — existing function, lower on average for outer coordinates

No additional mechanism needed. These two combine to make outer rings meaningfully harder. Test and adjust `BASE_MINING_RATE_PER_BLOCK` during testnet.

### Yield Floor

```python
MAX_EPOCH_HARDNESS = 100  # mining never harder than 100×
```

Matches existing `INFLATION_FLOOR = 0.01` — at epoch 100+, mining settles at 1% of baseline permanently. The economy reaches maturity; miners always have reason to keep going.

### Dynamic Block Time — Retired

The existing per-block dynamic difficulty (`INITIAL_BLOCK_TIME_S`, `BLOCK_TIME_GROWTH_S`, `MAX_BLOCK_TIME_S`) is removed. The per-epoch hardness (`/N`) replaces it — cleaner, epoch-aligned, more predictable.

**Block time:** Fixed at 60s (`BLOCK_TIME_MS = 60_000` — unchanged).

### Reward Halving — Retired

The existing halving every 50 blocks (`HALVING_INTERVAL = 50`) is removed. The epoch hardness curve provides equivalent long-term yield decay with better epoch alignment.

### Total Supply — Unchanged

42,000,000 AGNTC = 42,003,361 grid coordinates (6481×6481). Grid-coin parity: **1 AGNTC = 1 grid coordinate**. Mining a coin = opening a slot on the blockchain grid.

### Birth Cost — Unchanged

`BASE_BIRTH_COST × ring_number` — outer cells cost more to claim.

---

## 5. Implementation Plan (Approach A)

### New file: `agentic/galaxy/epoch.py`

```python
class EpochTracker:
    current_ring: int           # starts at 1
    total_mined: float          # cumulative AGNTC since genesis

    def threshold(self, ring: int) -> float:
        return 4 * ring * (ring + 1)

    def hardness(self, ring: int) -> int:
        return min(ring, MAX_EPOCH_HARDNESS)

    def record_mined(self, amount: float) -> list[int]:
        """Add amount to total, return list of newly opened rings (usually [])."""

    def homenode_coordinate(self, faction: str, ring_n: int) -> tuple[int, int]:
        """Prime-angle twist → snap to nearest grid cell center."""
```

### Modified: `agentic/params.py`

```python
# Epoch system (replaces INITIAL_BLOCK_TIME_S, BLOCK_TIME_GROWTH_S, HALVING_INTERVAL)
GENESIS_EPOCH_RING = 1
MAX_EPOCH_HARDNESS = 100
HOMENODE_BASE_ANGLE = 137.5       # degrees — golden-prime twist base
BASE_MINING_RATE_PER_BLOCK = 0.5  # AGNTC/block at hardness=1, full density (tune in testing)

# Retire:
# INITIAL_BLOCK_TIME_S, BLOCK_TIME_GROWTH_S, MAX_BLOCK_TIME_S, HALVING_INTERVAL
```

### Modified: `agentic/testnet/genesis.py`

- Add `EpochTracker` to `GenesisState`
- Initialize with `current_ring=1`, `total_mined=0.0`

### Modified: `agentic/galaxy/mining.py`

- `MiningEngine.compute_block_yields()`:
  - Apply `hardness = epoch_tracker.hardness(epoch_ring)` divisor to all yields
  - After distributing, call `epoch_tracker.record_mined(total_block_yield)`
  - Return newly opened rings in result

### Modified: `agentic/testnet/api.py`

- `TestnetStatus` adds: `epoch_ring`, `total_mined`, `next_epoch_at`, `next_epoch_threshold`
- `/api/mine` broadcasts `epoch_advance` WebSocket event on ring open
- `/api/epoch` *(new)*: full epoch state + homenode coordinates per faction for all open rings
- Remove dynamic block time logic

### Modified: `src/` (frontend)

- `GalaxyGrid.tsx`: read `epoch_ring` from chain status; render cells within `epoch_ring` only; reveal animation on new ring
- `useGameRealtime.ts`: subscribe to `epoch_advance` WebSocket; trigger grid animation
- `src/app/api/subscribe/`: place homenode via `EpochTracker.homenode_coordinate(faction, ring_n)` — always, regardless of epoch gate

---

## 6. Open Items (TBD during implementation)

- [ ] Exact `BASE_MINING_RATE_PER_BLOCK` value — calibrate during testnet (target: epoch 1 ≈ 2h)
- [ ] Faction arc angles — exact degree ranges for each of the 4 faction arms
- [ ] Homenode backbone link visual spec — thickness, brightness multiplier vs regular link
- [ ] Reveal animation spec — duration, easing, color flash on epoch_advance
- [ ] Isolated homenode visual — how dark/dim is the surrounding unrevealed space
