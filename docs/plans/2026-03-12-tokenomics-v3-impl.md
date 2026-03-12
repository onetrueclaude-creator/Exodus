# Tokenomics v3: BME City Economics — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the tokenomics v3 redesign: BME claim economics, city real estate pricing, Machines Faction as permanent accumulator, inflation ceiling, and signup bonus minting. Remove all legacy v1 constants.

**Architecture:** Backend-first (Python agentic-chain), then API surface, then frontend state/display, then whitepaper and stack layer updates. Each task is independently testable. TDD throughout.

**Tech Stack:** Python 3.12 (pytest), FastAPI, TypeScript/React (Zustand), Markdown (whitepaper, stack layers)

**Design doc:** `docs/plans/2026-03-12-tokenomics-v3-design.md` (APPROVED)

---

## Task 1: Clean up params.py — remove legacy v1 constants, add v3 constants

**Files:**
- Modify: `apps/agentic-chain/agentic/params.py`
- Test: `apps/agentic-chain/tests/test_params_v3.py` (new)

**Step 1: Write the failing test**

```python
"""Tests for v3 tokenomics parameters."""
import pytest


def test_v3_claim_constants_exist():
    from agentic.params import BASE_CLAIM_COST, BASE_CLAIM_CPU, MIN_CLAIM_COST, MIN_CLAIM_CPU
    assert BASE_CLAIM_COST == 10
    assert BASE_CLAIM_CPU == 100
    assert MIN_CLAIM_COST == 0.1
    assert MIN_CLAIM_CPU == 10


def test_v3_inflation_ceiling_exists():
    from agentic.params import ANNUAL_INFLATION_CEILING
    assert ANNUAL_INFLATION_CEILING == 0.05


def test_v3_machines_faction_constants():
    from agentic.params import MACHINES_SELL_POLICY, MACHINES_VOTING_POWER, MACHINES_AUTO_MINE
    from agentic.params import MACHINES_EMERGENCY_UNLOCK_THRESHOLD
    assert MACHINES_SELL_POLICY == "NEVER"
    assert MACHINES_VOTING_POWER == 0
    assert MACHINES_AUTO_MINE is True
    assert MACHINES_EMERGENCY_UNLOCK_THRESHOLD == 0.75


def test_v3_signup_bonus():
    from agentic.params import SIGNUP_BONUS_AGNTC
    assert SIGNUP_BONUS_AGNTC == 1


def test_v3_claim_requires_active_stake():
    from agentic.params import CLAIM_REQUIRES_ACTIVE_STAKE
    assert CLAIM_REQUIRES_ACTIVE_STAKE is True


def test_v3_faction_distribution_equal():
    from agentic.params import DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL
    assert DIST_COMMUNITY == 0.25
    assert DIST_MACHINES == 0.25
    assert DIST_FOUNDERS == 0.25
    assert DIST_PROFESSIONAL == 0.25


def test_v1_legacy_constants_removed():
    """Ensure legacy v1 constants no longer exist in params."""
    import agentic.params as p
    # These should all be gone
    assert not hasattr(p, 'TOTAL_SUPPLY'), "TOTAL_SUPPLY should be removed (v1 legacy)"
    assert not hasattr(p, 'INITIAL_CIRCULATING'), "INITIAL_CIRCULATING should be removed"
    assert not hasattr(p, 'INITIAL_INFLATION_RATE'), "INITIAL_INFLATION_RATE should be removed"
    assert not hasattr(p, 'DISINFLATION_RATE'), "DISINFLATION_RATE should be removed"
    assert not hasattr(p, 'INFLATION_FLOOR'), "INFLATION_FLOOR should be removed"
    assert not hasattr(p, 'MAX_EPOCH_HARDNESS'), "MAX_EPOCH_HARDNESS should be removed"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_params_v3.py -v`
Expected: FAIL — new constants don't exist yet, legacy constants still present

**Step 3: Update params.py**

In `params.py`, replace the Tokenomics section (lines 19–31) and remove legacy grid bounds (lines 64–68). Add new v3 sections. The full params.py should have:

```python
# Tokenomics v3 — BME City Economics
GENESIS_SUPPLY = 900              # 9 genesis nodes × 100 coordinates each
FEE_BURN_RATE = 0.50              # 50% of fees burned, 50% to verifiers/stakers
ANNUAL_INFLATION_CEILING = 0.05   # 5% max annual supply growth (governance-adjustable)
SIGNUP_BONUS_AGNTC = 1            # fresh mint per new user registration

# Faction distribution (equal 25% each)
DIST_COMMUNITY = 0.25
DIST_MACHINES = 0.25
DIST_FOUNDERS = 0.25
DIST_PROFESSIONAL = 0.25

# Node Claim Economics (City Real Estate Model)
BASE_CLAIM_COST = 10        # AGNTC base cost for node claims
BASE_CLAIM_CPU = 100        # CPU Energy base cost for node claims
MIN_CLAIM_COST = 0.1        # AGNTC floor for outer-ring claims
MIN_CLAIM_CPU = 10          # CPU floor for outer-ring claims
CLAIM_REQUIRES_ACTIVE_STAKE = True

# Machines Faction (Permanent Accumulator / Treasury)
MACHINES_SELL_POLICY = "NEVER"
MACHINES_VOTING_POWER = 0
MACHINES_AUTO_MINE = True
MACHINES_EMERGENCY_UNLOCK_THRESHOLD = 0.75  # 75% supermajority to unlock
```

Remove these legacy constants entirely:
- `TOTAL_SUPPLY`, `INITIAL_CIRCULATING`
- `INITIAL_INFLATION_RATE`, `DISINFLATION_RATE`, `INFLATION_FLOOR`
- `DIST_COMMUNITY = 0.40`, `DIST_TREASURY`, `DIST_TEAM`, `DIST_AGENTS`
- `GRID_MIN`, `GRID_MAX` (dynamic bounds only — already exists via `GridBounds`)
- `MAX_EPOCH_HARDNESS` (hardness is now uncapped: `16 × ring`)

**Step 4: Run test to verify it passes**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_params_v3.py -v`
Expected: All 7 tests PASS

**Step 5: Fix all import errors from removed constants**

Files that import removed constants — update each:
- `mining.py` — imports `TOTAL_SUPPLY`, `DIST_COMMUNITY` → remove
- `rewards.py` — imports `INITIAL_INFLATION_RATE`, `DISINFLATION_RATE`, `INFLATION_FLOOR` → remove
- `epoch.py` — imports `MAX_EPOCH_HARDNESS`, `GRID_MIN`, `GRID_MAX` → remove
- `coordinate.py` — imports `GRID_MIN`, `GRID_MAX` → use defaults in GridBounds
- `api.py` — imports `GRID_MIN`, `GRID_MAX` → use dynamic bounds
- `genesis.py` — imports `GRID_MIN`, `GRID_MAX` → use dynamic bounds

For each file: replace removed constant with the v3 equivalent or remove the usage. This is tracked in subsequent tasks.

**Step 6: Run full test suite to find all breakages**

Run: `cd apps/agentic-chain && python3 -m pytest tests/ -v --tb=short 2>&1 | head -100`
Expected: Many failures — this is expected, subsequent tasks fix them

**Step 7: Commit**

```bash
git add apps/agentic-chain/agentic/params.py apps/agentic-chain/tests/test_params_v3.py
git commit -m "feat(params): tokenomics v3 constants — BME, city model, Machines faction

Remove legacy v1 constants (TOTAL_SUPPLY, INITIAL_INFLATION_RATE, etc).
Add v3: claim costs, inflation ceiling, Machines never-sell policy,
equal 25% faction distribution, signup bonus."
```

---

## Task 2: Rewrite mining.py — remove CommunityPool, pure mining engine

**Files:**
- Modify: `apps/agentic-chain/agentic/galaxy/mining.py`
- Modify: `apps/agentic-chain/tests/test_mining.py`

**Step 1: Write the failing test**

Add to `tests/test_mining.py` (replace existing tests that reference CommunityPool):

```python
"""Tests for v3 MiningEngine — no CommunityPool, hardness-based rewards only."""
from agentic.galaxy.mining import MiningEngine
from agentic.galaxy.coordinate import GridCoordinate
from agentic.galaxy.epoch import EpochTracker
from agentic.params import BASE_MINING_RATE_PER_BLOCK


def test_mining_engine_no_pool():
    """MiningEngine v3 has no pool argument."""
    engine = MiningEngine()
    assert engine.total_blocks_processed == 0
    assert engine.total_rewards_distributed == 0.0


def test_mining_yields_with_epoch_tracker():
    """Mining yields should be BASE_RATE * density * stake_weight / hardness."""
    engine = MiningEngine()
    tracker = EpochTracker()  # ring 1, hardness = 16
    coord = GridCoordinate(x=0, y=0)
    claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
    yields = engine.compute_block_yields(claims, epoch_tracker=tracker)
    assert b"alice" in yields
    # hardness at ring 1 = 16, stake_weight = 1.0 (sole claimer)
    from agentic.galaxy.coordinate import resource_density
    density = resource_density(0, 0)
    expected = BASE_MINING_RATE_PER_BLOCK * density * 1.0 / 16
    assert abs(yields[b"alice"] - expected) < 1e-10


def test_mining_empty_claims():
    engine = MiningEngine()
    yields = engine.compute_block_yields([])
    assert yields == {}
    assert engine.total_blocks_processed == 1


def test_mining_no_community_pool_class():
    """CommunityPool should not exist in mining module."""
    import agentic.galaxy.mining as m
    assert not hasattr(m, 'CommunityPool'), "CommunityPool removed in v3"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_mining.py -v`
Expected: FAIL — CommunityPool still exists, MiningEngine still requires pool arg

**Step 3: Rewrite mining.py**

Replace `mining.py` entirely:

```python
"""Mining engine for galaxy grid — v3 (no CommunityPool, hardness-only)."""
from __future__ import annotations

from dataclasses import dataclass, field

from agentic.params import BASE_MINING_RATE_PER_BLOCK
from agentic.galaxy.coordinate import resource_density


@dataclass
class MiningEngine:
    """Computes per-block mining yields for active claims.

    v3: No CommunityPool — mining creates new supply directly.
    Yield = BASE_RATE * density * stake_weight / hardness.
    Supply growth is bounded by ANNUAL_INFLATION_CEILING (checked by RewardsEngine).
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
            epoch_tracker: optional EpochTracker — applies ring hardness as yield divisor.

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

        # Epoch hardness: 16 * ring (uncapped in v3)
        hardness = 1
        if epoch_tracker is not None:
            hardness = epoch_tracker.hardness(epoch_tracker.current_ring)

        # Compute raw yields — no pool cap, direct supply creation
        raw_yields: dict[bytes, float] = {}
        for claim in claims:
            density = resource_density(claim["coordinate"].x, claim["coordinate"].y)
            stake_weight = claim["stake"] / total_stake
            raw = BASE_MINING_RATE_PER_BLOCK * density * stake_weight / hardness
            owner = claim["owner"]
            raw_yields[owner] = raw_yields.get(owner, 0.0) + raw

        total_mined = sum(raw_yields.values())

        # Notify epoch tracker of mined amount — may trigger ring expansion
        if epoch_tracker is not None:
            self._last_newly_opened = epoch_tracker.record_mined(total_mined)
        else:
            self._last_newly_opened = []

        self.total_blocks_processed += 1
        self.total_rewards_distributed += total_mined
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

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_mining.py -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/agentic-chain/agentic/galaxy/mining.py apps/agentic-chain/tests/test_mining.py
git commit -m "feat(mining): remove CommunityPool, pure hardness-based mining engine

v3 mining: supply created directly via block rewards.
No pool cap — inflation ceiling enforced at epoch level.
Formula: BASE_RATE * density * stake_weight / hardness."
```

---

## Task 3: Update epoch.py — uncapped hardness (16 × ring), remove legacy imports

**Files:**
- Modify: `apps/agentic-chain/agentic/galaxy/epoch.py`
- Modify: `apps/agentic-chain/tests/test_epoch.py` and `tests/test_galaxy_epoch.py`

**Step 1: Write the failing test**

Add to `tests/test_galaxy_epoch.py`:

```python
def test_hardness_uncapped_v3():
    """Hardness = 16 * ring, uncapped (no MAX_EPOCH_HARDNESS)."""
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    assert et.hardness(1) == 16
    assert et.hardness(10) == 160
    assert et.hardness(100) == 1600  # was capped at 100 in v2
    assert et.hardness(500) == 8000


def test_no_grid_min_max_in_epoch():
    """epoch.py should not import GRID_MIN/GRID_MAX (dynamic bounds only)."""
    import inspect
    import agentic.galaxy.epoch as mod
    source = inspect.getsource(mod)
    assert 'GRID_MIN' not in source
    assert 'GRID_MAX' not in source
```

**Step 2: Run test to verify it fails**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_galaxy_epoch.py::test_hardness_uncapped_v3 -v`
Expected: FAIL — hardness still capped at `min(ring, MAX_EPOCH_HARDNESS)`

**Step 3: Update epoch.py**

Replace line 6 import:
```python
# OLD:
from agentic.params import MAX_EPOCH_HARDNESS, GENESIS_EPOCH_RING, HOMENODE_BASE_ANGLE, GRID_MIN, GRID_MAX
# NEW:
from agentic.params import GENESIS_EPOCH_RING, HOMENODE_BASE_ANGLE
```

Replace `hardness()` method (line 46-48):
```python
# OLD:
def hardness(self, ring: int) -> int:
    """Mining difficulty multiplier at ring N. Caps at MAX_EPOCH_HARDNESS."""
    return min(ring, MAX_EPOCH_HARDNESS)
# NEW:
def hardness(self, ring: int) -> int:
    """Mining difficulty multiplier at ring N. Uncapped: 16 * ring."""
    return 16 * ring
```

Replace `homenode_coordinate()` grid clamping (lines 104-106):
```python
# OLD:
x = max(GRID_MIN, min(GRID_MAX, x))
y = max(GRID_MIN, min(GRID_MAX, y))
# NEW (no clamping — grid is dynamic):
# Grid bounds are dynamic in v3, no static clamping needed
```

**Step 4: Run test to verify it passes**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_galaxy_epoch.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/agentic-chain/agentic/galaxy/epoch.py apps/agentic-chain/tests/test_galaxy_epoch.py
git commit -m "feat(epoch): uncapped hardness 16×ring, remove static grid bounds"
```

---

## Task 4: Add claim cost calculation to coordinate.py

**Files:**
- Modify: `apps/agentic-chain/agentic/galaxy/coordinate.py`
- Create: `apps/agentic-chain/tests/test_claim_cost.py`

**Step 1: Write the failing test**

```python
"""Tests for v3 city real estate claim cost model."""
import pytest
from agentic.galaxy.coordinate import claim_cost, resource_density


def test_claim_cost_inner_ring_high_density():
    """Inner ring (1), high density should be most expensive."""
    cost = claim_cost(x=0, y=0, ring=1)
    density = resource_density(0, 0)
    assert cost["agntc"] == pytest.approx(10 * density * (1 / 1), rel=1e-4)
    assert cost["cpu"] == pytest.approx(100 * density * (1 / 1), rel=1e-4)


def test_claim_cost_outer_ring_cheap():
    """Outer ring (20), low density should hit floor."""
    # Pick a coordinate we know has low density
    cost = claim_cost(x=200, y=200, ring=20)
    assert cost["agntc"] >= 0.1   # MIN_CLAIM_COST floor
    assert cost["cpu"] >= 10      # MIN_CLAIM_CPU floor


def test_claim_cost_city_model_inner_more_expensive():
    """Same density node: ring 1 should cost more than ring 10."""
    cost_inner = claim_cost(x=0, y=10, ring=1)
    cost_outer = claim_cost(x=0, y=10, ring=10)
    assert cost_inner["agntc"] > cost_outer["agntc"]
    assert cost_inner["cpu"] > cost_outer["cpu"]


def test_claim_cost_floor_applied():
    """Very outer ring should hit the minimum floor."""
    cost = claim_cost(x=500, y=500, ring=100)
    from agentic.params import MIN_CLAIM_COST, MIN_CLAIM_CPU
    assert cost["agntc"] >= MIN_CLAIM_COST
    assert cost["cpu"] >= MIN_CLAIM_CPU


def test_claim_cost_returns_dict_with_keys():
    cost = claim_cost(x=0, y=0, ring=1)
    assert "agntc" in cost
    assert "cpu" in cost
```

**Step 2: Run test to verify it fails**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_claim_cost.py -v`
Expected: FAIL — `claim_cost` function doesn't exist

**Step 3: Add claim_cost() to coordinate.py**

Append to `coordinate.py`:

```python
def claim_cost(x: int, y: int, ring: int) -> dict[str, float]:
    """Compute AGNTC and CPU cost to claim node at (x, y) in the given ring.

    City real estate model: inner rings are expensive, outer rings are cheap.
    Formula: base_cost * density * (1 / ring), floored at minimums.
    """
    from agentic.params import BASE_CLAIM_COST, BASE_CLAIM_CPU, MIN_CLAIM_COST, MIN_CLAIM_CPU

    density = resource_density(x, y)
    ring_factor = 1.0 / max(ring, 1)

    agntc = max(BASE_CLAIM_COST * density * ring_factor, MIN_CLAIM_COST)
    cpu = max(BASE_CLAIM_CPU * density * ring_factor, MIN_CLAIM_CPU)

    return {"agntc": round(agntc, 6), "cpu": round(cpu, 6)}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_claim_cost.py -v`
Expected: All 5 PASS

**Step 5: Commit**

```bash
git add apps/agentic-chain/agentic/galaxy/coordinate.py apps/agentic-chain/tests/test_claim_cost.py
git commit -m "feat(coordinate): city real estate claim cost model

claim_cost(x, y, ring) returns AGNTC + CPU cost.
Inner rings expensive, outer cheap. Floor at MIN_CLAIM_COST/MIN_CLAIM_CPU."
```

---

## Task 5: Rewrite rewards.py — replace scheduled inflation with ceiling enforcement

**Files:**
- Modify: `apps/agentic-chain/agentic/economics/rewards.py`
- Modify: `apps/agentic-chain/tests/test_rewards.py`

**Step 1: Write the failing test**

Replace `tests/test_rewards.py` contents:

```python
"""Tests for v3 RewardsEngine — ceiling enforcement, BME, no scheduled inflation."""
import pytest
from agentic.economics.rewards import RewardsEngine, EpochRewardReport


def test_rewards_engine_init():
    engine = RewardsEngine()
    assert engine.cumulative_burned == 0
    assert engine.cumulative_minted == 0


def test_fee_burn_50_percent():
    """50% of fees should be burned."""
    engine = RewardsEngine()
    from unittest.mock import Mock
    validators = [Mock(id=0, token_stake=1000, cpu_vpu=100, online=True)]
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=1000,
        mining_minted=0, validators=validators,
    )
    assert report.fees_burned == 500


def test_no_scheduled_inflation():
    """v3 has no inflation minting in rewards — mining handles supply creation."""
    engine = RewardsEngine()
    from unittest.mock import Mock
    validators = [Mock(id=0, token_stake=1000, cpu_vpu=100, online=True)]
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=0,
        mining_minted=100, validators=validators,
    )
    # No inflation minted by rewards engine — mining_minted is informational only
    assert report.inflation_minted == 0


def test_verifier_staker_split():
    """Rewards split 60/40 between verifiers and stakers."""
    engine = RewardsEngine()
    from unittest.mock import Mock
    validators = [Mock(id=0, token_stake=1000, cpu_vpu=100, online=True)]
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=1000,
        mining_minted=0, validators=validators,
    )
    # Fee remainder after burn: 500. Verifier 60% = 300, Staker 40% = 200
    assert report.verifier_rewards[0] == 300
    assert report.staker_rewards[0] == 200


def test_inflation_ceiling_check():
    """Engine should report whether mining exceeded the inflation ceiling."""
    engine = RewardsEngine(epochs_per_year=12)
    from unittest.mock import Mock
    validators = [Mock(id=0, token_stake=1000, cpu_vpu=100, online=True)]
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=0,
        mining_minted=1000, validators=validators,  # 10% in one epoch!
    )
    # 10% in 1 epoch > 5%/12 annual ceiling per epoch
    assert report.ceiling_exceeded is True
    assert report.compression_ratio < 1.0


def test_bme_claim_mints_distributed():
    """BME verifier mints from claims should be distributed 60/40."""
    engine = RewardsEngine()
    from unittest.mock import Mock
    validators = [Mock(id=0, token_stake=1000, cpu_vpu=100, online=True)]
    report = engine.compute_epoch_rewards(
        epoch=1, circulating_supply=10000, fee_revenue=0,
        mining_minted=0, bme_claim_burns=100, validators=validators,
    )
    # BME: 100 burned, 100 minted to verifiers. Split 60/40.
    assert report.bme_verifier_rewards[0] == 60
    assert report.bme_staker_rewards[0] == 40
```

**Step 2: Run test to verify it fails**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_rewards.py -v`
Expected: FAIL — old signature, no ceiling enforcement

**Step 3: Rewrite rewards.py**

Replace `rewards.py` entirely with the v3 engine that:
- Accepts `mining_minted` (informational) and `bme_claim_burns` as inputs
- No longer computes `inflation_minted` internally (mining engine handles supply creation)
- Distributes fee remainder + BME mints using 60/40 split
- Checks inflation ceiling and reports `compression_ratio`
- Tracks `cumulative_burned` and `cumulative_minted`

```python
"""Epoch-level reward distribution engine for AGNTC — v3 (ceiling enforcement, BME)."""
from __future__ import annotations
from dataclasses import dataclass, field
from agentic.params import (
    FEE_BURN_RATE, REWARD_SPLIT_VERIFIER, REWARD_SPLIT_STAKER,
    ALPHA, BETA, ANNUAL_INFLATION_CEILING,
)


@dataclass
class EpochRewardReport:
    """Complete reward accounting for one epoch."""
    epoch: int
    inflation_minted: int           # always 0 in v3 — mining handles supply
    fee_revenue: int
    fees_burned: int
    total_rewards: int              # fee remainder distributed
    verifier_rewards: dict[int, int]
    staker_rewards: dict[int, int]
    total_burned: int
    # BME fields
    bme_claim_burns: int = 0
    bme_verifier_rewards: dict[int, int] = field(default_factory=dict)
    bme_staker_rewards: dict[int, int] = field(default_factory=dict)
    # Inflation ceiling
    mining_minted: int = 0          # informational — total mined this epoch
    ceiling_exceeded: bool = False
    compression_ratio: float = 1.0


class RewardsEngine:
    """Computes and distributes epoch rewards — v3.

    - No scheduled inflation (mining engine creates supply directly)
    - 50% of transaction fees burned
    - Remaining fees split: Verifier 60%, Staker 40%
    - BME claim burns re-minted to verifiers/stakers at same 60/40 split
    - Inflation ceiling enforcement: reports compression_ratio if exceeded
    """

    def __init__(self, epochs_per_year: int = 12):
        self.epochs_per_year = epochs_per_year
        self.cumulative_burned: int = 0
        self.cumulative_minted: int = 0

    def compute_epoch_rewards(
        self,
        epoch: int,
        circulating_supply: int,
        fee_revenue: int,
        mining_minted: int,
        validators: list,
        bme_claim_burns: int = 0,
    ) -> EpochRewardReport:
        """Compute full reward distribution for one epoch."""
        # Fee burn
        fees_burned = int(fee_revenue * FEE_BURN_RATE)
        fee_remainder = fee_revenue - fees_burned

        # Inflation ceiling check
        epoch_ceiling = circulating_supply * (ANNUAL_INFLATION_CEILING / self.epochs_per_year)
        ceiling_exceeded = mining_minted > epoch_ceiling
        compression_ratio = (epoch_ceiling / mining_minted) if (ceiling_exceeded and mining_minted > 0) else 1.0

        # Online validators
        online = [v for v in validators if v.online]
        if not online:
            self.cumulative_burned += fees_burned
            return EpochRewardReport(
                epoch=epoch, inflation_minted=0, fee_revenue=fee_revenue,
                fees_burned=fees_burned, total_rewards=0,
                verifier_rewards={}, staker_rewards={},
                total_burned=fees_burned, mining_minted=mining_minted,
                ceiling_exceeded=ceiling_exceeded, compression_ratio=compression_ratio,
                bme_claim_burns=bme_claim_burns,
            )

        # Effective stakes for distribution weighting
        total_token = sum(v.token_stake for v in online)
        total_cpu = sum(v.cpu_vpu for v in online)

        effective_stakes = {}
        for v in online:
            if total_token > 0 and total_cpu > 0:
                es = ALPHA * (v.token_stake / total_token) + BETA * (v.cpu_vpu / total_cpu)
            else:
                es = 1.0 / len(online)
            effective_stakes[v.id] = es
        total_es = sum(effective_stakes.values())

        # Distribute fee remainder: 60% verifiers, 40% stakers
        verifier_pool = int(fee_remainder * REWARD_SPLIT_VERIFIER)
        staker_pool = fee_remainder - verifier_pool

        verifier_rewards = self._distribute(online, verifier_pool, effective_stakes, total_es)
        staker_rewards = self._distribute_by_token(online, staker_pool, total_token)

        # BME claim mints: burned amount re-minted to verifiers/stakers
        bme_verifier_rewards = {}
        bme_staker_rewards = {}
        if bme_claim_burns > 0:
            bme_verifier_pool = int(bme_claim_burns * REWARD_SPLIT_VERIFIER)
            bme_staker_pool = bme_claim_burns - bme_verifier_pool
            bme_verifier_rewards = self._distribute(online, bme_verifier_pool, effective_stakes, total_es)
            bme_staker_rewards = self._distribute_by_token(online, bme_staker_pool, total_token)

        total_distributed = sum(verifier_rewards.values()) + sum(staker_rewards.values())
        self.cumulative_burned += fees_burned
        self.cumulative_minted += bme_claim_burns  # BME mints

        return EpochRewardReport(
            epoch=epoch, inflation_minted=0, fee_revenue=fee_revenue,
            fees_burned=fees_burned, total_rewards=total_distributed,
            verifier_rewards=verifier_rewards, staker_rewards=staker_rewards,
            total_burned=fees_burned, mining_minted=mining_minted,
            ceiling_exceeded=ceiling_exceeded, compression_ratio=compression_ratio,
            bme_claim_burns=bme_claim_burns,
            bme_verifier_rewards=bme_verifier_rewards,
            bme_staker_rewards=bme_staker_rewards,
        )

    def _distribute(self, validators, pool, effective_stakes, total_es) -> dict[int, int]:
        """Distribute pool proportional to effective stake."""
        rewards = {}
        remaining = pool
        for i, v in enumerate(validators):
            share = effective_stakes[v.id] / total_es if total_es > 0 else 1.0 / len(validators)
            reward = int(pool * share) if i < len(validators) - 1 else remaining
            rewards[v.id] = reward
            remaining -= reward
        return rewards

    def _distribute_by_token(self, validators, pool, total_token) -> dict[int, int]:
        """Distribute pool proportional to token stake."""
        rewards = {}
        remaining = pool
        for i, v in enumerate(validators):
            share = v.token_stake / total_token if total_token > 0 else 1.0 / len(validators)
            reward = int(pool * share) if i < len(validators) - 1 else remaining
            rewards[v.id] = reward
            remaining -= reward
        return rewards
```

**Step 4: Run test to verify it passes**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_rewards.py -v`
Expected: All 6 PASS

**Step 5: Commit**

```bash
git add apps/agentic-chain/agentic/economics/rewards.py apps/agentic-chain/tests/test_rewards.py
git commit -m "feat(rewards): v3 engine — no scheduled inflation, BME distribution, ceiling check

Removes inflation minting from rewards (mining handles supply).
Adds BME claim burn redistribution to verifiers/stakers.
Adds inflation ceiling enforcement with compression_ratio reporting."
```

---

## Task 6: Update genesis.py — remove CommunityPool, flag Machines nodes

**Files:**
- Modify: `apps/agentic-chain/agentic/testnet/genesis.py`
- Modify: `apps/agentic-chain/tests/test_genesis.py`

**Step 1: Write the failing test**

Add to `tests/test_genesis.py`:

```python
def test_genesis_no_community_pool():
    """GenesisState should not have community_pool in v3."""
    from agentic.testnet.genesis import create_genesis
    g = create_genesis()
    assert not hasattr(g, 'community_pool'), "community_pool removed in v3"


def test_genesis_mining_engine_no_pool():
    """MiningEngine should not require pool arg."""
    from agentic.testnet.genesis import create_genesis
    g = create_genesis()
    assert g.mining_engine is not None
    assert g.mining_engine.total_blocks_processed == 0
```

**Step 2: Run test to verify it fails**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_genesis.py::test_genesis_no_community_pool -v`
Expected: FAIL — `community_pool` still in GenesisState

**Step 3: Update genesis.py**

- Remove `CommunityPool` import and usage
- Remove `community_pool` from `GenesisState` dataclass
- Change `MiningEngine` instantiation to `MiningEngine()` (no pool arg)
- Remove `GRID_MIN`, `GRID_MAX` imports (use dynamic bounds)

Key changes:
```python
# Remove from imports:
from agentic.galaxy.mining import CommunityPool, MiningEngine
# Replace with:
from agentic.galaxy.mining import MiningEngine

# Remove from GenesisState:
community_pool: CommunityPool  # DELETE THIS LINE

# Replace pool/engine creation (lines 129-130):
# OLD:
pool = CommunityPool()
engine = MiningEngine(pool=pool)
# NEW:
engine = MiningEngine()

# Remove from return:
# community_pool=pool,  # DELETE
```

**Step 4: Run test to verify it passes**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_genesis.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/agentic-chain/agentic/testnet/genesis.py apps/agentic-chain/tests/test_genesis.py
git commit -m "feat(genesis): remove CommunityPool from genesis state

MiningEngine is now pool-free. GenesisState no longer carries community_pool.
Mining creates supply directly, bounded by inflation ceiling."
```

---

## Task 7: Update api.py — add claim cost endpoint, remove community_pool_remaining

**Files:**
- Modify: `apps/agentic-chain/agentic/testnet/api.py`
- Modify: `apps/agentic-chain/tests/test_api.py`

**Step 1: Write the failing test**

Add to `tests/test_api.py`:

```python
from fastapi.testclient import TestClient
from agentic.testnet.api import app

client = TestClient(app)


def test_coordinate_includes_claim_cost():
    """GET /api/coordinate should include claim_cost field."""
    resp = client.get("/api/coordinate/0/0")
    assert resp.status_code == 200
    data = resp.json()
    assert "claim_cost" in data
    assert "agntc" in data["claim_cost"]
    assert "cpu" in data["claim_cost"]


def test_status_no_community_pool():
    """GET /api/status should not have community_pool_remaining."""
    resp = client.get("/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "community_pool_remaining" not in data
```

**Step 2: Run test to verify it fails**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_api.py::test_coordinate_includes_claim_cost -v`
Expected: FAIL — no claim_cost in response

**Step 3: Update api.py**

1. Remove `community_pool_remaining` from `TestnetStatus` model and `get_status()` endpoint
2. Add `claim_cost` to `CoordinateInfo` model and `get_coordinate()` endpoint
3. Remove `GRID_MIN`, `GRID_MAX` imports — use dynamic bounds from epoch tracker
4. Import `claim_cost` from coordinate module

Key changes to `CoordinateInfo`:
```python
class CoordinateInfo(BaseModel):
    x: int
    y: int
    density: float
    storage_slots: int
    claimed: bool
    claim_cost: Optional[dict] = None  # {"agntc": float, "cpu": float}
    owner: Optional[str] = None
    stake: Optional[int] = None
```

Key changes to `get_coordinate()`:
```python
from agentic.galaxy.coordinate import claim_cost as compute_claim_cost

# In the endpoint, after computing density:
ring = _g().epoch_tracker.current_ring
cost = compute_claim_cost(x, y, ring)
# Add to return: claim_cost=cost
```

**Step 4: Run test to verify it passes**

Run: `cd apps/agentic-chain && python3 -m pytest tests/test_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/agentic-chain/agentic/testnet/api.py apps/agentic-chain/tests/test_api.py
git commit -m "feat(api): add claim_cost to coordinate endpoint, remove community_pool

GET /api/coordinate/{x}/{y} now returns claim_cost with agntc and cpu fields.
TestnetStatus no longer reports community_pool_remaining."
```

---

## Task 8: Fix all remaining import errors and run full test suite

**Files:**
- Modify: any files still importing removed constants
- Test: `apps/agentic-chain/tests/` (full suite)

**Step 1: Run full test suite**

Run: `cd apps/agentic-chain && python3 -m pytest tests/ -v --tb=short 2>&1 | tail -50`

**Step 2: Fix each failing test**

Common fixes needed:
- `test_economics.py` — references old `inflation_rate_at_epoch`, old signature
- `test_growth.py` — may reference `TOTAL_SUPPLY` or `CommunityPool`
- `test_integration_testnet.py` — `community_pool` in genesis state
- `test_simulation.py` — `CommunityPool` usage
- `coordinate.py` — remove `GRID_MIN`/`GRID_MAX` imports, use dynamic bounds defaults
- Any test importing `GRID_MIN`/`GRID_MAX` from params

For each failure: fix the import/usage, re-run. Do NOT change the behavior, only the references.

**Step 3: Run full suite until green**

Run: `cd apps/agentic-chain && python3 -m pytest tests/ -v`
Expected: All tests PASS (target: 0 failures)

**Step 4: Commit**

```bash
git add -A apps/agentic-chain/
git commit -m "fix: resolve all import errors from v3 constant removal

Update all files referencing removed v1 constants (TOTAL_SUPPLY,
INITIAL_INFLATION_RATE, GRID_MIN/MAX, CommunityPool, etc)."
```

---

## Task 9: Update stack layers (intent, judgement, coherence, context)

**Files:**
- Modify: `stack/intent.md`
- Modify: `stack/judgement.md`
- Modify: `stack/coherence.md`
- Modify: `stack/context.md`

**Step 1: Update intent.md**

In the Tradeoffs section, replace:
```
- Organic tokenomics (no scheduled inflation) — accept slower growth for healthier economics
```
With:
```
- BME tokenomics with inflation ceiling — accept complexity for self-balancing economics
- Machines Faction never sells — accept permanent supply lock for market stability
- City real estate model (inner expensive, outer cheap) — accept early-adopter advantage for natural economic gravity
```

Add to Goals:
```
4. Machines Faction operates as autonomous protocol treasury — never sells, no voting power, permanent accumulator
5. Token economics self-balance via BME + fee burn + hardness curve — minimal governance intervention needed
```

Add to Decision Boundaries:
```
- **Human decides (governance):** Inflation ceiling rate, emergency Machines treasury unlock, claim cost base parameters
```

**Step 2: Update judgement.md**

In Risk Categories, update High:
```
- **High:** Breaking game economics (wrong fee burn %, wrong staking ratios, claim cost miscalculation, Machines sell policy override), UI showing incorrect chain data
```

In Confidence Calibration, update:
```
- Protocol parameters: fee burn 50%, staking alpha 40%/beta 60%, hardness 16×ring (uncapped), BASE_CLAIM_COST=10, ANNUAL_INFLATION_CEILING=5%, Machines never-sell — all verified in v3 design doc
- Claim cost formula: BASE_CLAIM_COST × density × (1/ring), floored at MIN_CLAIM_COST — verified
- BME flow: claim burn → equivalent mint to verifiers (60/40 split) — verified
```

**Step 3: Update coherence.md**

Add to Behavioral Consistency:
```
- **Machines Faction identity:** Always mining, always accumulating, never selling, never voting — this is invariant across all implementations
- **City real estate model:** Inner rings always more expensive than outer rings — this gradient must be preserved in all grid visualizations and economic calculations
```

**Step 4: Update context.md**

In Selecting Context, add:
```
- **Tokenomics v3 design doc:** `docs/plans/2026-03-12-tokenomics-v3-design.md` — authoritative reference for BME, city model, Machines Faction, inflation ceiling
```

**Step 5: Commit**

```bash
git add stack/
git commit -m "docs(stack): update all layers for tokenomics v3

intent: BME tradeoffs, Machines Faction goals, governance boundaries
judgement: claim cost risk, v3 confidence calibration
coherence: Machines identity invariant, city model consistency
context: v3 design doc as authoritative reference"
```

---

## Task 10: Update whitepaper tokenomics sections

**Files:**
- Modify: `vault/whitepaper.md` (sections 9-13, add governance section)

This is a large documentation task. Key sections to rewrite:

**Step 1: Read current whitepaper sections 9-13**

Run: Read `vault/whitepaper.md` — identify exact line ranges for each section.

**Step 2: Rewrite §9 Token Overview**

- Remove "1 AGNTC per coordinate claimed"
- Add: claims cost AGNTC + CPU (city model), signup bonus 1 AGNTC
- Add: BME explanation

**Step 3: Rewrite §10 Supply & Distribution**

- Remove scheduled inflation, old supply numbers
- Add: soft cap with 5% annual ceiling
- Add: 25/25/25/25 equal faction split (confirm already matches v2)
- Add: supply growth = mining only + negligible signups
- Add: supply burns = 50% fee burn + Machines accumulation (effective lock)

**Step 4: Rewrite §11 Mining & Hardness**

- Confirm: hardness = 16 × ring (uncapped)
- Add: mining is the ONLY supply-expanding mechanism
- Add: inflation ceiling enforcement per epoch

**Step 5: Rewrite §12 Fee Model**

- Add: node claim burns (BME)
- Add: CPU energy burn on claims
- Keep: 50% transaction fee burn

**Step 6: Add §16 Governance**

New section covering:
- Human-only voting (Machines excluded)
- Vote weight = staked AGNTC
- Threshold table (51% param change, 67% protocol upgrade, 75% emergency unlock)
- On-chain, public, auditable

**Step 7: Rewrite Machines Faction description**

- Permanent accumulator, never sells
- No voting power
- Autonomous miner + validator
- Emergency governance override (75% supermajority)

**Step 8: Commit**

```bash
git add vault/whitepaper.md
git commit -m "docs(whitepaper): tokenomics v3 rewrite — BME, city model, governance

Major sections rewritten: token overview, supply, mining, fee model.
New governance section: human-only voting, Machines exclusion.
Machines Faction: permanent accumulator, never sells, no vote."
```

---

## Task 11: Update website tokenomics.html

**Files:**
- Modify: `ZkAgentic/projects/web/zkagentic-deploy/tokenomics.html`

**Step 1: Update key stats**

- Remove any reference to "1B supply" or fixed max
- Update to "Soft cap with 5% annual inflation ceiling"
- Update supply model description to BME
- Update Machines Faction description to "permanent accumulator, never sells"

**Step 2: Update economic model section**

- Add city real estate model explanation
- Add BME flow diagram description
- Update comparison table if it references old mechanics

**Step 3: Verify locally**

Open: `http://localhost:8888/tokenomics` and visually verify changes render correctly.

**Step 4: Commit**

```bash
git add ZkAgentic/projects/web/zkagentic-deploy/tokenomics.html
git commit -m "feat(web): update tokenomics page for v3 — BME, city model, governance"
```

---

## Task 12: Update CLAUDE.md with v3 change log entry

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add change log entry**

Add to the Change Log section:

```markdown
### 2026-03-12 — Tokenomics v3: BME City Economics

**Design:** Node claims cost AGNTC + CPU (no longer mint tokens). Burn-Mint Equilibrium: claim burns flow to verifiers. City real estate model: inner rings expensive, outer cheap. Machines Faction as permanent accumulator (never sells, no voting power). Soft cap with 5% annual inflation ceiling. Human-only governance with 75% supermajority for emergency treasury unlock. 1 AGNTC fresh mint signup bonus.
**Backend:** params.py (v3 constants, removed legacy v1), mining.py (no CommunityPool), rewards.py (ceiling enforcement + BME), epoch.py (uncapped 16×ring hardness), coordinate.py (claim_cost function), genesis.py (no pool), api.py (claim cost endpoint).
**Stack:** All 4 layers updated (intent, judgement, coherence, context).
**Docs:** Whitepaper sections 9-13 rewritten, new §16 Governance, website tokenomics page updated.
**Design doc:** `docs/plans/2026-03-12-tokenomics-v3-design.md`
```

**Step 2: Update Key Concepts section**

Update the AGNTC entry to reflect v3:
```
- AGNTC = tradeable coins; supply grows via mining only (soft cap with 5% ceiling)
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md change log + key concepts update for tokenomics v3"
```

---

## Execution Order & Dependencies

```
Task 1 (params.py) ← foundation, must be first
  ├── Task 2 (mining.py) ← depends on params changes
  ├── Task 3 (epoch.py) ← depends on params changes
  ├── Task 4 (coordinate.py) ← depends on params changes
  └── Task 5 (rewards.py) ← depends on params changes
Task 6 (genesis.py) ← depends on Tasks 2 (no CommunityPool)
Task 7 (api.py) ← depends on Tasks 4, 6
Task 8 (fix all imports) ← depends on all above
Task 9 (stack layers) ← independent, can run in parallel with 8
Task 10 (whitepaper) ← independent, can run in parallel with 8-9
Task 11 (website) ← depends on Task 10 (content alignment)
Task 12 (CLAUDE.md) ← last, after everything else
```

Tasks 2-5 can be parallelized after Task 1 completes.
Tasks 9-10 can be parallelized with Task 8.
