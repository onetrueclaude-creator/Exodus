# AGNTC Tokenomics v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the organic-growth tokenomics model from `docs/plans/2026-02-25-tokenomics-v2-design.md` — remove scheduled inflation, update hardness to 16N, make grid dynamic, set 25/25/25/25 faction distribution.

**Architecture:** Update `params.py` as source of truth, then propagate changes outward: EpochTracker (16N hardness) → MiningEngine (remove finite pool) → coordinate (dynamic bounds) → genesis (900 supply) → API (dynamic grid) → frontend (dynamic constants). Economics simulation layer (inflation.py, vesting.py, rewards.py) is gutted of removed constants but not fully redesigned yet.

**Tech Stack:** Python 3 (FastAPI, pytest), TypeScript (Next.js)

**Design doc:** `docs/plans/2026-02-25-tokenomics-v2-design.md`

---

### Task 1: Update params.py — Core Parameter Changes

**Files:**
- Modify: `vault/agentic-chain/agentic/params.py:19-31, 64-66, 96-99`
- Test: `vault/agentic-chain/tests/test_tokenomics_v2.py` (create)

**Step 1: Write the failing test**

Create `vault/agentic-chain/tests/test_tokenomics_v2.py`:

```python
"""Tests for tokenomics v2 parameter changes."""
import pytest


def test_distribution_sums_to_one():
    from agentic.params import (
        DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL,
    )
    total = DIST_COMMUNITY + DIST_MACHINES + DIST_FOUNDERS + DIST_PROFESSIONAL
    assert total == pytest.approx(1.0)


def test_distribution_is_equal():
    from agentic.params import (
        DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL,
    )
    assert DIST_COMMUNITY == 0.25
    assert DIST_MACHINES == 0.25
    assert DIST_FOUNDERS == 0.25
    assert DIST_PROFESSIONAL == 0.25


def test_old_inflation_constants_removed():
    import agentic.params as p
    assert not hasattr(p, "TOTAL_SUPPLY")
    assert not hasattr(p, "INITIAL_CIRCULATING")
    assert not hasattr(p, "INITIAL_INFLATION_RATE")
    assert not hasattr(p, "DISINFLATION_RATE")
    assert not hasattr(p, "INFLATION_FLOOR")


def test_old_distribution_constants_removed():
    import agentic.params as p
    assert not hasattr(p, "DIST_TREASURY")
    assert not hasattr(p, "DIST_TEAM")
    assert not hasattr(p, "DIST_AGENTS")


def test_old_grid_constants_removed():
    import agentic.params as p
    assert not hasattr(p, "GRID_MIN")
    assert not hasattr(p, "GRID_MAX")


def test_hardness_multiplier():
    from agentic.params import HARDNESS_MULTIPLIER
    assert HARDNESS_MULTIPLIER == 16


def test_max_epoch_hardness_removed():
    import agentic.params as p
    assert not hasattr(p, "MAX_EPOCH_HARDNESS")


def test_genesis_supply():
    from agentic.params import GENESIS_SUPPLY
    assert GENESIS_SUPPLY == 900


def test_machines_constraint():
    from agentic.params import MACHINES_MIN_SELL_RATIO
    assert MACHINES_MIN_SELL_RATIO == 1.0


def test_vesting_params():
    from agentic.params import SECURE_REWARD_IMMEDIATE, SECURE_REWARD_VEST_DAYS
    assert SECURE_REWARD_IMMEDIATE == 0.50
    assert SECURE_REWARD_VEST_DAYS == 30


def test_unchanged_params():
    from agentic.params import (
        FEE_BURN_RATE, BASE_MINING_RATE_PER_BLOCK,
        NODE_GRID_SPACING, MERKLE_TREE_DEPTH,
    )
    assert FEE_BURN_RATE == 0.50
    assert BASE_MINING_RATE_PER_BLOCK == 0.5
    assert NODE_GRID_SPACING == 10
    assert MERKLE_TREE_DEPTH == 26
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: Multiple FAIL (old constants still exist, new ones don't)

**Step 3: Update params.py**

Replace the `# Tokenomics` section (lines 19-25) with:

```python
# Tokenomics — organic growth model (v2)
# No scheduled inflation. Supply grows only when coordinates are claimed (1 AGNTC each).
# See docs/plans/2026-02-25-tokenomics-v2-design.md
GENESIS_SUPPLY = 900              # 9 genesis nodes × 100 coords × 1 AGNTC
FEE_BURN_RATE = 0.50              # 50% of fees burned, 50% to verifiers/stakers
```

Replace distribution section (lines 27-31) with:

```python
# Faction distribution — equal 25% per faction (applies to newly minted AGNTC)
DIST_COMMUNITY    = 0.25   # Free Community (N arm, teal)
DIST_MACHINES     = 0.25   # Machines Faction (E arm, reddish purple) — AI agent economy
DIST_FOUNDERS     = 0.25   # Founder Pool (S arm, gold-orange) — team & advisors (4yr vest, 12mo cliff)
DIST_PROFESSIONAL = 0.25   # Professional (W arm, blue) — paid-tier users

# Machines Faction constraint — agents cannot sell below acquisition cost
MACHINES_MIN_SELL_RATIO = 1.0
```

Replace Galaxy Grid section (lines 64-66) with:

```python
# Galaxy Grid — dynamic bounds derived from current epoch ring
# No fixed GRID_MIN/GRID_MAX — grid expands as epochs advance
MAX_PLANETS_PER_SYSTEM = 10
CLAIM_PROGRAM_ID = b"agentic_claim"
STORAGE_PROGRAM_ID = b"agentic_storage"
```

Replace Epoch system section (lines 96-99) with:

```python
# Epoch system — mining-driven grid expansion
GENESIS_EPOCH_RING = 1            # rings pre-revealed at genesis (ring 0 + ring 1)
HARDNESS_MULTIPLIER = 16          # hardness(ring) = 16 × ring (no cap)
HOMENODE_BASE_ANGLE = 137.5       # golden-prime twist base angle (degrees)

# Vesting — Secure action rewards
SECURE_REWARD_IMMEDIATE = 0.50    # 50% liquid on block confirmation
SECURE_REWARD_VEST_DAYS = 30      # remaining 50% vests linearly over 30 days
```

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/agentic/params.py vault/agentic-chain/tests/test_tokenomics_v2.py
git commit -m "feat(tokenomics-v2): update params.py — organic growth, 25/25/25/25 factions, 16N hardness"
```

---

### Task 2: Update EpochTracker — 16N Hardness, Dynamic Bounds

**Files:**
- Modify: `vault/agentic-chain/agentic/galaxy/epoch.py:6, 23-28, 46-48, 104-106`
- Test: `vault/agentic-chain/tests/test_tokenomics_v2.py` (append)

**Step 1: Write the failing test**

Append to `tests/test_tokenomics_v2.py`:

```python
def test_epoch_hardness_16n():
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    assert et.hardness(1) == 16
    assert et.hardness(10) == 160
    assert et.hardness(100) == 1600
    assert et.hardness(324) == 5184


def test_epoch_hardness_no_cap():
    """Hardness should NOT cap at 100 anymore."""
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    assert et.hardness(200) == 3200  # old code would cap at 100


def test_epoch_faction_names_updated():
    """Faction key 'treasury' renamed to 'machines'."""
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    # Should not raise
    coord = et.homenode_coordinate("machines", 1)
    assert isinstance(coord, tuple)
    assert len(coord) == 2


def test_homenode_no_grid_clamp():
    """Homenode coordinates should not be clamped to fixed ±3240."""
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    # At high ring numbers, coordinates can exceed old ±3240 bound
    coord = et.homenode_coordinate("community", 500)
    # Just verify it returns without error — no clamping to ±3240
    assert isinstance(coord, tuple)
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py::test_epoch_hardness_16n tests/test_tokenomics_v2.py::test_epoch_hardness_no_cap tests/test_tokenomics_v2.py::test_epoch_faction_names_updated tests/test_tokenomics_v2.py::test_homenode_no_grid_clamp -v`
Expected: FAIL (hardness still capped, treasury not renamed, GRID_MIN import broken)

**Step 3: Update epoch.py**

Update import line (line 6):
```python
from agentic.params import HARDNESS_MULTIPLIER, GENESIS_EPOCH_RING, HOMENODE_BASE_ANGLE
```

Update faction angles (lines 23-28):
```python
_FACTION_ANGLES = {
    "community":    135.0,   # NW arm — Free Community (N)
    "machines":      45.0,   # NE arm — Machines Faction (E)
    "founders":     315.0,   # SE arm — Founder Pool (S)
    "professional": 225.0,   # SW arm — Professional Pool (W)
}
```

Update hardness method (lines 46-48):
```python
    def hardness(self, ring: int) -> int:
        """Mining difficulty multiplier at ring N. Hardness = HARDNESS_MULTIPLIER × ring."""
        return HARDNESS_MULTIPLIER * max(ring, 1)
```

Remove grid clamping from `homenode_coordinate` (lines 104-106). Delete:
```python
        # Clamp to grid bounds
        x = max(GRID_MIN, min(GRID_MAX, x))
        y = max(GRID_MIN, min(GRID_MAX, y))
```

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/agentic/galaxy/epoch.py vault/agentic-chain/tests/test_tokenomics_v2.py
git commit -m "feat(tokenomics-v2): EpochTracker — 16N hardness, machines faction, no grid clamp"
```

---

### Task 3: Rewrite MiningEngine — Remove CommunityPool

**Files:**
- Modify: `vault/agentic-chain/agentic/galaxy/mining.py`
- Test: `vault/agentic-chain/tests/test_tokenomics_v2.py` (append)

**Context:** In v2, there's no finite CommunityPool. Supply grows organically. `MiningEngine.compute_block_yields` should apply the formula: `yield = BASE_MINING_RATE × density × stake_weight / hardness` with no pool cap. The `pool_frac` multiplier is removed.

**Step 1: Write the failing test**

Append to `tests/test_tokenomics_v2.py`:

```python
def test_mining_no_pool_exhaustion():
    """Mining should never exhaust — no finite pool in v2."""
    from agentic.galaxy.mining import MiningEngine
    from agentic.galaxy.epoch import EpochTracker
    engine = MiningEngine()
    et = EpochTracker()
    # Create a simple claim
    from agentic.galaxy.coordinate import GridCoordinate
    claims = [{"owner": b"\x01" * 32, "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]
    # Mine 1000 blocks — should never exhaust
    for _ in range(1000):
        yields = engine.compute_block_yields(claims, epoch_tracker=et)
        assert len(yields) > 0
    assert engine.total_blocks_processed == 1000


def test_mining_yield_formula_v2():
    """yield = BASE_RATE × density × stake_weight / hardness (no pool fraction)."""
    from agentic.galaxy.mining import MiningEngine
    from agentic.galaxy.epoch import EpochTracker
    from agentic.galaxy.coordinate import GridCoordinate, resource_density
    from agentic.params import BASE_MINING_RATE_PER_BLOCK
    engine = MiningEngine()
    et = EpochTracker()
    coord = GridCoordinate(x=0, y=0)
    density = resource_density(0, 0)
    claims = [{"owner": b"\x01" * 32, "coordinate": coord, "stake": 100}]
    yields = engine.compute_block_yields(claims, epoch_tracker=et)
    owner_yield = yields[b"\x01" * 32]
    # Expected: BASE_RATE * density * 1.0 (sole staker) / hardness(ring=1)
    hardness = et.hardness(et.current_ring)
    expected = BASE_MINING_RATE_PER_BLOCK * density * 1.0 / hardness
    assert owner_yield == pytest.approx(expected, rel=1e-6)
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py::test_mining_no_pool_exhaustion tests/test_tokenomics_v2.py::test_mining_yield_formula_v2 -v`
Expected: FAIL (MiningEngine still takes pool arg, imports TOTAL_SUPPLY)

**Step 3: Rewrite mining.py**

```python
"""Mining engine for galaxy grid — organic growth model (v2)."""
from __future__ import annotations

from dataclasses import dataclass, field

from agentic.params import BASE_MINING_RATE_PER_BLOCK
from agentic.galaxy.coordinate import resource_density


@dataclass
class MiningEngine:
    """Computes per-block mining yields for active claims.

    v2: No finite pool. Supply grows organically — yield is computed from
    BASE_MINING_RATE × density × stake_weight / epoch_hardness.
    """

    total_blocks_processed: int = 0
    total_rewards_distributed: float = 0.0
    _last_newly_opened: list[int] = field(default_factory=list, repr=False)

    def compute_block_yields(
        self, claims: list[dict], *, epoch_tracker=None,
    ) -> dict[bytes, float]:
        """Compute mining rewards for one block.

        Args:
            claims: list of dicts with keys: owner (bytes), coordinate (GridCoordinate), stake (int)
            epoch_tracker: optional EpochTracker — applies ring hardness as yield divisor
                           and records mined amount.

        Returns:
            dict mapping owner -> reward amount (float AGNTC)
        """
        if not claims:
            self.total_blocks_processed += 1
            return {}

        total_stake = sum(c["stake"] for c in claims)
        if total_stake <= 0:
            self.total_blocks_processed += 1
            return {}

        # Epoch hardness divides yield — no cap in v2
        hardness = 1
        if epoch_tracker is not None:
            hardness = epoch_tracker.hardness(epoch_tracker.current_ring)

        # Compute raw yields: BASE_RATE × density × stake_weight / hardness
        raw_yields: dict[bytes, float] = {}
        for claim in claims:
            density = resource_density(claim["coordinate"].x, claim["coordinate"].y)
            stake_weight = claim["stake"] / total_stake
            raw = BASE_MINING_RATE_PER_BLOCK * density * stake_weight / hardness
            owner = claim["owner"]
            raw_yields[owner] = raw_yields.get(owner, 0.0) + raw

        total_minted = sum(raw_yields.values())

        # Notify epoch tracker of mined amount — may trigger ring expansion
        if epoch_tracker is not None:
            self._last_newly_opened = epoch_tracker.record_mined(total_minted)
        else:
            self._last_newly_opened = []

        self.total_blocks_processed += 1
        self.total_rewards_distributed += total_minted
        return raw_yields

    def mint_block_rewards(
        self,
        yields: dict[bytes, float],
        state,
        viewing_keys: dict[bytes, bytes],
    ) -> int:
        """Convert float yields into ledger Records via validate_mint.

        Yields are scaled to microAGNTC (int, * 1_000_000) for integer-safe storage.
        Returns number of records created.
        """
        from agentic.ledger.transaction import MintTx, validate_mint
        from agentic.params import MINT_PROGRAM_ID

        records_created = 0
        slot = self.total_blocks_processed

        for owner, amount in yields.items():
            if amount <= 0:
                continue
            micro_amount = round(amount * 1_000_000)
            if micro_amount <= 0:
                continue
            vk = viewing_keys.get(owner, owner)
            tx = MintTx(
                recipient=owner,
                recipient_viewing_key=vk,
                amount=micro_amount,
                slot=slot,
            )
            validate_mint(tx, state)
            records_created += 1

        return records_created
```

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/agentic/galaxy/mining.py vault/agentic-chain/tests/test_tokenomics_v2.py
git commit -m "feat(tokenomics-v2): MiningEngine — remove CommunityPool, organic yield formula"
```

---

### Task 4: Update coordinate.py — Dynamic Grid Bounds

**Files:**
- Modify: `vault/agentic-chain/agentic/galaxy/coordinate.py:7, 10-26, 57-69`
- Test: `vault/agentic-chain/tests/test_tokenomics_v2.py` (append)

**Context:** Grid bounds are no longer fixed ±3240. `GridBounds` and `GLOBAL_BOUNDS` should start from the genesis ring and expand dynamically. `GridCoordinate.x_offset` / `y_offset` / `from_offsets` need updating since there's no fixed GRID_MIN.

**Step 1: Write the failing test**

Append to `tests/test_tokenomics_v2.py`:

```python
def test_grid_bounds_dynamic():
    """GridBounds should start small and expand."""
    from agentic.galaxy.coordinate import GridBounds
    bounds = GridBounds(initial_radius=10)
    assert bounds.min_val == -10
    assert bounds.max_val == 10
    assert bounds.contains(5, 5)
    assert not bounds.contains(15, 15)
    bounds.expand_to_ring(5)
    # ring 5 → radius = 5 * NODE_GRID_SPACING = 50
    assert bounds.contains(50, 50)
    assert bounds.min_val == -50
    assert bounds.max_val == 50


def test_grid_coordinate_creation_within_bounds():
    """Coordinates within dynamic bounds should work."""
    from agentic.galaxy.coordinate import GridCoordinate, GridBounds
    bounds = GridBounds(initial_radius=100)
    coord = GridCoordinate(x=50, y=-50, bounds=bounds)
    assert coord.x == 50
    assert coord.y == -50
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py::test_grid_bounds_dynamic tests/test_tokenomics_v2.py::test_grid_coordinate_creation_within_bounds -v`
Expected: FAIL (GridBounds doesn't have initial_radius or expand_to_ring)

**Step 3: Update coordinate.py**

Update import (line 7):
```python
from agentic.params import MAX_PLANETS_PER_SYSTEM, NODE_GRID_SPACING
```

Replace GridBounds class (lines 10-26):
```python
class GridBounds:
    """Dynamic grid bounds that expand as epoch rings open.

    v2: No fixed GRID_MIN/GRID_MAX. Bounds grow with the galaxy.
    """

    def __init__(self, initial_radius: int = NODE_GRID_SPACING):
        self.min_val = -initial_radius
        self.max_val = initial_radius

    def contains(self, x: int, y: int) -> bool:
        return self.min_val <= x <= self.max_val and self.min_val <= y <= self.max_val

    def expand_to_contain(self, x: int, y: int) -> None:
        self.min_val = min(self.min_val, x, y)
        self.max_val = max(self.max_val, x, y)

    def expand_to_ring(self, ring: int) -> None:
        """Expand bounds to contain all coordinates up to the given epoch ring."""
        radius = (ring + 1) * NODE_GRID_SPACING
        self.min_val = min(self.min_val, -radius)
        self.max_val = max(self.max_val, radius)


# Global bounds instance — starts at genesis ring, expands as epochs advance
GLOBAL_BOUNDS = GridBounds(initial_radius=2 * NODE_GRID_SPACING)  # ring 1 + fog
```

Replace `x_offset`, `y_offset`, `from_offsets` with simpler versions:
```python
    @property
    def x_offset(self) -> int:
        """Non-negative offset for Record.data encoding (relative to current bounds)."""
        b = self.bounds or GLOBAL_BOUNDS
        return self.x - b.min_val

    @property
    def y_offset(self) -> int:
        """Non-negative offset for Record.data encoding (relative to current bounds)."""
        b = self.bounds or GLOBAL_BOUNDS
        return self.y - b.min_val

    @classmethod
    def from_offsets(cls, x_offset: int, y_offset: int, bounds: 'GridBounds | None' = None) -> 'GridCoordinate':
        """Create from Record.data offsets."""
        b = bounds or GLOBAL_BOUNDS
        return cls(x=x_offset + b.min_val, y=y_offset + b.min_val, bounds=b)
```

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/agentic/galaxy/coordinate.py vault/agentic-chain/tests/test_tokenomics_v2.py
git commit -m "feat(tokenomics-v2): dynamic GridBounds — no fixed GRID_MIN/GRID_MAX"
```

---

### Task 5: Update genesis.py — 900 Supply, No CommunityPool

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/genesis.py:22-25, 129`
- Test: `vault/agentic-chain/tests/test_tokenomics_v2.py` (append)

**Step 1: Write the failing test**

Append to `tests/test_tokenomics_v2.py`:

```python
def test_genesis_creates_without_pool():
    """create_genesis should work without CommunityPool."""
    from agentic.testnet.genesis import create_genesis
    g = create_genesis(num_wallets=10, seed=42)
    assert g.mining_engine is not None
    assert g.mining_engine.total_blocks_processed == 0
    # 9 genesis nodes
    assert len(g.claim_registry.all_active_claims()) == 9
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py::test_genesis_creates_without_pool -v`
Expected: FAIL (genesis still imports GRID_MIN/GRID_MAX, creates CommunityPool)

**Step 3: Update genesis.py**

Update imports (lines 22-25):
```python
from agentic.params import (
    GENESIS_BALANCE, BIRTH_PROGRAM_ID, NODE_GRID_SPACING,
    GENESIS_ORIGIN, GENESIS_FACTION_MASTERS, GENESIS_HOMENODES,
)
```

Remove `CommunityPool` from import line 13:
```python
from agentic.galaxy.mining import MiningEngine
```

Remove `GenesisState.community_pool` field (line 33):
Delete or comment out the `community_pool: CommunityPool` field.

Replace pool + engine creation (around line 129):
```python
    engine = MiningEngine()
```

Remove `community_pool=pool` from GenesisState constructor, update field:
```python
    return GenesisState(
        ledger_state=state,
        wallets=wallets,
        claim_registry=claim_registry,
        mining_engine=engine,
        ...
    )
```

Also update `GenesisState` dataclass — remove `community_pool` field, keep pipeline.

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/agentic/testnet/genesis.py vault/agentic-chain/tests/test_tokenomics_v2.py
git commit -m "feat(tokenomics-v2): genesis — remove CommunityPool, no fixed grid imports"
```

---

### Task 6: Update api.py — Dynamic Grid Bounds, Remove Pool References

**Files:**
- Modify: `vault/agentic-chain/agentic/testnet/api.py:61-63, 99-114, 437-451, 557-563, 600-610, 683-695, 805-809, 955, 1054`
- Test: `vault/agentic-chain/tests/test_tokenomics_v2.py` (append)

**Context:** api.py uses `GRID_MIN/GRID_MAX` in ~10 places for bounds checking. Replace with dynamic bounds from the epoch tracker. Remove `community_pool_remaining` from status.

**Step 1: Write the failing test**

Append to `tests/test_tokenomics_v2.py`:

```python
def test_api_status_no_pool_field():
    """Status endpoint should not reference community_pool."""
    from agentic.testnet.api import TestnetStatus
    fields = TestnetStatus.model_fields
    assert "community_pool_remaining" not in fields
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py::test_api_status_no_pool_field -v`
Expected: FAIL

**Step 3: Update api.py**

Key changes:
1. Update import (line 61-63): remove `GRID_MIN, GRID_MAX`, add `NODE_GRID_SPACING`
2. Add helper to get dynamic bounds from epoch tracker:
```python
def _grid_bounds(g: GenesisState) -> tuple[int, int]:
    """Dynamic grid bounds derived from current epoch ring."""
    ring = g.epoch_tracker.current_ring
    radius = (ring + 1) * NODE_GRID_SPACING
    return -radius, radius
```
3. Remove `community_pool_remaining` from `TestnetStatus`
4. Replace all `GRID_MIN`/`GRID_MAX` references with `_grid_bounds(g)` calls
5. Remove `community_pool_remaining` from `/api/status` response
6. Update `/api/epoch` faction names: `"treasury"` → `"machines"`, `"founder"` → `"founders"`

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/agentic/testnet/api.py vault/agentic-chain/tests/test_tokenomics_v2.py
git commit -m "feat(tokenomics-v2): api — dynamic grid bounds, remove pool, update faction names"
```

---

### Task 7: Fix Economics Layer — Remove Broken Imports

**Files:**
- Modify: `vault/agentic-chain/agentic/economics/inflation.py`
- Modify: `vault/agentic-chain/agentic/economics/vesting.py`
- Modify: `vault/agentic-chain/agentic/economics/rewards.py`
- Modify: `vault/agentic-chain/agentic/economics/epoch.py` (if it exists)
- Modify: `vault/agentic-chain/agentic/simulation/engine.py`
- Modify: `vault/agentic-chain/agentic/simulation/growth.py`
- Modify: `vault/agentic-chain/agentic/visualization/capacity_charts.py`
- Modify: `vault/agentic-chain/agentic/visualization/streamlit_app.py`
- Modify: `vault/agentic-chain/run_genesis_dashboard.py`
- Modify: `vault/agentic-chain/run_genesis_sim.py`

**Context:** These files all import removed constants (`TOTAL_SUPPLY`, `INITIAL_INFLATION_RATE`, etc.). They must be updated so the codebase doesn't crash on import. The economics simulation layer doesn't need a full redesign now — just fix the imports and add `# TODO: redesign for v2 tokenomics` markers where logic needs future work.

**Step 1: Write the failing test**

Append to `tests/test_tokenomics_v2.py`:

```python
def test_all_modules_importable():
    """All modules should import without error after constant removal."""
    import importlib
    modules = [
        "agentic.economics.inflation",
        "agentic.economics.vesting",
        "agentic.economics.rewards",
        "agentic.galaxy.mining",
        "agentic.galaxy.epoch",
        "agentic.galaxy.coordinate",
        "agentic.testnet.genesis",
        "agentic.testnet.api",
    ]
    for mod in modules:
        importlib.import_module(mod)  # should not raise
```

**Step 2: Run test to verify it fails**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py::test_all_modules_importable -v`
Expected: FAIL (broken imports)

**Step 3: Fix each file's imports**

For each file, remove references to deleted constants and replace with local fallbacks or `GENESIS_SUPPLY`. Specific approach per file:

- **inflation.py**: Add `# TODO: redesign for v2 organic model` at top. Replace `TOTAL_SUPPLY` with `GENESIS_SUPPLY`, remove inflation rate imports, stub the class methods.
- **vesting.py**: Replace `TOTAL_SUPPLY` with `GENESIS_SUPPLY`, replace old `DIST_*` with new `DIST_*` names, update `create_default_schedules()` to 4 v2 factions.
- **rewards.py**: Remove `INITIAL_INFLATION_RATE`, `DISINFLATION_RATE`, `INFLATION_FLOOR` imports. Stub `inflation_rate_at_epoch` to return 0.0 (no scheduled inflation in v2).
- **economics/epoch.py** (if exists): Same pattern.
- **simulation/engine.py, growth.py**: Add `# TODO: redesign` stubs.
- **visualization/***: Add stubs.
- **run_genesis_*.py**: Add stubs.

**Step 4: Run test to verify it passes**

Run: `cd vault/agentic-chain && python3 -m pytest tests/test_tokenomics_v2.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add vault/agentic-chain/agentic/economics/ vault/agentic-chain/agentic/simulation/ vault/agentic-chain/agentic/visualization/ vault/agentic-chain/run_genesis_dashboard.py vault/agentic-chain/run_genesis_sim.py vault/agentic-chain/tests/test_tokenomics_v2.py
git commit -m "fix(tokenomics-v2): fix broken imports across economics/simulation/visualization layers"
```

---

### Task 8: Fix Existing Tests

**Files:**
- Modify: `vault/agentic-chain/tests/test_api.py`
- Modify: `vault/agentic-chain/tests/test_rewards.py`
- Modify: `vault/agentic-chain/tests/test_economics.py`
- Modify: `vault/agentic-chain/tests/test_epoch.py`
- Modify: `vault/agentic-chain/tests/test_growth.py`
- Modify: `vault/agentic-chain/tests/test_integration_audit.py`
- Modify: `vault/agentic-chain/tests/test_params_galaxy.py`
- Modify: `vault/agentic-chain/tests/test_integration_testnet.py`
- Modify: `vault/agentic-chain/tests/test_vesting.py`

**Context:** All test files that import removed constants will fail. Fix imports and update assertions to match v2 model.

**Step 1: Run existing test suite to see failures**

Run: `cd vault/agentic-chain && python3 -m pytest tests/ -v --tb=short 2>&1 | head -100`
Document all failures.

**Step 2: Fix each test file**

Key fixes:
- `test_api.py`: Replace `GRID_MIN, GRID_MAX` with inline bounds or dynamic bounds helper
- `test_rewards.py`: Remove inflation rate tests (or rewrite for v2)
- `test_economics.py`: Remove inflation model tests
- `test_epoch.py`: Remove inflation rate tests, update hardness assertions to 16N
- `test_growth.py`: Replace `INITIAL_CIRCULATING` with `GENESIS_SUPPLY`
- `test_integration_audit.py`: Replace `GRID_MIN, GRID_MAX`
- `test_params_galaxy.py`: Update constants tested
- `test_integration_testnet.py`: Replace `GRID_MIN, GRID_MAX`
- `test_vesting.py`: Update to v2 distribution

**Step 3: Run full test suite**

Run: `cd vault/agentic-chain && python3 -m pytest tests/ -v`
Expected: ALL PASS (or only pre-existing failures unrelated to tokenomics)

**Step 4: Commit**

```bash
git add vault/agentic-chain/tests/
git commit -m "fix(tokenomics-v2): update test suite for organic growth model"
```

---

### Task 9: Update Frontend — Dynamic Grid Bounds

**Files:**
- Modify: `src/types/testnet.ts:8-11`
- Modify: `src/app/api/subscribe/route.ts:6, 50-52`
- Modify: `src/__tests__/onboarding-flow.test.ts:40-57`
- Modify: `src/lib/spiral/SpiralClassifier.ts:30`

**Step 1: Write the failing test**

The frontend tests at `src/__tests__/onboarding-flow.test.ts` use hardcoded `-3240`/`3240`. These should be replaced with either dynamic values from the API or a generous default bound.

**Step 2: Update testnet.ts**

```typescript
/**
 * Grid bounds — dynamic in v2.
 * These defaults cover the genesis ring. Actual bounds come from the
 * epoch state in /api/status or /api/epoch.
 */
export const CHAIN_GRID_DEFAULT_RADIUS = 20; // genesis ring + fog
export const CHAIN_GRID_MIN = -CHAIN_GRID_DEFAULT_RADIUS;
export const CHAIN_GRID_MAX = CHAIN_GRID_DEFAULT_RADIUS;
export const CHAIN_GRID_SPAN = CHAIN_GRID_MAX - CHAIN_GRID_MIN;
```

Add `epoch_ring` to `TestnetStatus` interface:
```typescript
export interface TestnetStatus {
  state_root: string;
  record_count: number;
  total_claims: number;
  blocks_processed: number;
  total_mined: number;
  next_block_in: number;
  epoch_ring: number;
  epoch_total_mined: number;
  epoch_next_threshold: number;
  epoch_progress: number;
  epoch_agntc_remaining: number;
}
```

**Step 3: Update subscribe/route.ts**

Replace `CHAIN_GRID_MIN/MAX` import with a large default range or compute from epoch data.

**Step 4: Update SpiralClassifier.ts**

Replace hardcoded `R_MAX = 324.0` with a comment noting it's derived from epoch state.

**Step 5: Run frontend tests**

Run: `npm test -- --run`
Expected: PASS

**Step 6: Commit**

```bash
git add src/types/testnet.ts src/app/api/subscribe/route.ts src/__tests__/onboarding-flow.test.ts src/lib/spiral/SpiralClassifier.ts
git commit -m "feat(tokenomics-v2): frontend — dynamic grid bounds, epoch status in TestnetStatus"
```

---

### Task 10: Update CLAUDE.md Files and vault/seed.md

**Files:**
- Modify: `vault/agentic-chain/CLAUDE.md`
- Modify: `vault/CLAUDE.md`
- Modify: `CLAUDE.md` (root)

**Step 1: Update changelogs**

Add entries documenting the tokenomics v2 changes in all relevant CLAUDE.md files.

**Step 2: Commit**

```bash
git add vault/agentic-chain/CLAUDE.md vault/CLAUDE.md CLAUDE.md
git commit -m "docs: update CLAUDE.md changelogs for tokenomics v2"
```

---

## Execution Order

Tasks 1-6 are strictly sequential (each depends on the previous).
Task 7 depends on Task 1 (params changed).
Task 8 depends on Tasks 1-7 (all source changes done).
Task 9 is independent of 7-8 (frontend vs backend).
Task 10 is last (documentation).

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
                                        ↘
T9 (can run parallel with T7-T8)         → T10
```

## Deferred Work

These files reference removed constants but are not critical-path:
- `vault/agentic-chain/agentic/simulation/engine.py` — full simulation redesign
- `vault/agentic-chain/agentic/simulation/growth.py` — growth projections
- `vault/agentic-chain/agentic/visualization/capacity_charts.py` — charts
- `vault/agentic-chain/agentic/visualization/streamlit_app.py` — dashboard
- `vault/agentic-chain/run_genesis_dashboard.py` — dashboard runner
- `vault/agentic-chain/run_genesis_sim.py` — simulation runner

Task 7 stubs these with `# TODO: redesign for v2` markers. A full redesign of the economics simulation layer is future work.
