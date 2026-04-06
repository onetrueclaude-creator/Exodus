# Blockchain Epoch System + Tokenomics Implementation Plan


**Goal:** Implement mining-driven grid expansion — the galaxy grid grows one ring per Epoch, gated by cumulative AGNTC mined, with per-epoch hardness scaling.

**Architecture:** New `EpochTracker` class in `agentic/galaxy/epoch.py` tracks cumulative mined AGNTC and `current_ring`. `MiningEngine` applies epoch hardness (`BASE_RATE / min(N, 100)`) to all yields and notifies `EpochTracker` after each block. API exposes epoch state; WebSocket broadcasts `epoch_advance` events on ring opens. Frontend renders only cells within `epoch_ring`.

**Tech Stack:** Python 3.11, FastAPI, pytest, TypeScript/React, PixiJS 8, Zustand 5.

**Working directory (blockchain):** `apps/agentic-chain/`
**Working directory (frontend):** ``

---

## Task 1: Update params.py — add epoch constants, retire old ones

**Files:**
- Modify: `agentic/params.py`

**Step 1: Open params.py and make these exact changes**

Add after the `# Mining` block:

```python
# Epoch system — mining-driven grid expansion
GENESIS_EPOCH_RING = 1            # rings pre-revealed at genesis (ring 0 + ring 1)
MAX_EPOCH_HARDNESS = 100          # hardness caps here; yield floor = 1% of base
HOMENODE_BASE_ANGLE = 137.5       # golden-prime twist base angle (degrees)
BASE_MINING_RATE_PER_BLOCK = 0.5  # AGNTC/block at hardness=1, full density (tune in testing)
```

Remove or comment out these retired params (add `# RETIRED:` prefix):

```python
# RETIRED: replaced by per-epoch hardness in EpochTracker
# INITIAL_BLOCK_TIME_S = 10
# BLOCK_TIME_GROWTH_S = 5
# MAX_BLOCK_TIME_S = 300
# HALVING_INTERVAL = 50
```

Replace the existing `BASE_MINING_RATE_PER_BLOCK = 1.0` line with the new value (0.5).

**Step 2: Verify no import errors**

```bash
cd apps/agentic-chain
python3 -c "from agentic.params import GENESIS_EPOCH_RING, MAX_EPOCH_HARDNESS, HOMENODE_BASE_ANGLE, BASE_MINING_RATE_PER_BLOCK; print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add agentic/params.py
git commit -m "feat(epoch): add epoch params, retire dynamic block time and halving params"
```

---

## Task 2: Create EpochTracker — core expansion logic (TDD)

**Files:**
- Create: `agentic/galaxy/epoch.py`
- Create: `tests/test_galaxy_epoch.py`

Note: `tests/test_epoch.py` already exists for `EpochManager` (economic inflation). Use `test_galaxy_epoch.py` for the new grid `EpochTracker`.

### Step 1: Write failing tests

Create `tests/test_galaxy_epoch.py`:

```python
"""Tests for the grid expansion EpochTracker."""
from __future__ import annotations
import math
import pytest
from agentic.galaxy.epoch import EpochTracker


class TestThreshold:
    def test_ring_2_threshold(self):
        t = EpochTracker()
        assert t.threshold(2) == 24.0  # 4*2*3

    def test_ring_3_threshold(self):
        t = EpochTracker()
        assert t.threshold(3) == 48.0  # 4*3*4

    def test_ring_10_threshold(self):
        t = EpochTracker()
        assert t.threshold(10) == 440.0  # 4*10*11

    def test_formula(self):
        t = EpochTracker()
        for n in range(1, 20):
            assert t.threshold(n) == 4.0 * n * (n + 1)


class TestHardness:
    def test_ring_1_hardness_is_1(self):
        t = EpochTracker()
        assert t.hardness(1) == 1

    def test_ring_n_hardness_is_n(self):
        t = EpochTracker()
        for n in range(1, 50):
            assert t.hardness(n) == n

    def test_hardness_caps_at_100(self):
        t = EpochTracker()
        assert t.hardness(100) == 100
        assert t.hardness(150) == 100
        assert t.hardness(1000) == 100


class TestRecordMined:
    def test_no_expansion_below_threshold(self):
        t = EpochTracker()  # starts at ring 1
        newly = t.record_mined(10.0)  # threshold(2) = 24, not reached
        assert newly == []
        assert t.current_ring == 1

    def test_ring_2_opens_at_24(self):
        t = EpochTracker()
        newly = t.record_mined(24.0)
        assert newly == [2]
        assert t.current_ring == 2

    def test_ring_2_opens_just_above_threshold(self):
        t = EpochTracker()
        t.record_mined(23.9)
        assert t.current_ring == 1
        newly = t.record_mined(0.2)  # crosses 24.0
        assert newly == [2]
        assert t.current_ring == 2

    def test_multiple_rings_open_in_one_block(self):
        t = EpochTracker()
        newly = t.record_mined(1000.0)  # blows past many thresholds
        assert len(newly) > 1
        assert t.current_ring > 2

    def test_ring_3_opens_at_48_cumulative(self):
        t = EpochTracker()
        t.record_mined(24.0)  # opens ring 2
        newly = t.record_mined(24.0)  # cumulative = 48, opens ring 3
        assert newly == [3]
        assert t.current_ring == 3

    def test_total_mined_accumulates(self):
        t = EpochTracker()
        t.record_mined(5.0)
        t.record_mined(3.0)
        assert abs(t.total_mined - 8.0) < 1e-9


class TestNextEpoch:
    def test_next_threshold_is_ring_2_at_start(self):
        t = EpochTracker()
        assert t.next_epoch_threshold() == 24.0

    def test_progress_zero_at_start(self):
        t = EpochTracker()
        assert t.progress_to_next() == 0.0

    def test_progress_half(self):
        t = EpochTracker()
        t.record_mined(12.0)  # half of 24
        assert abs(t.progress_to_next() - 0.5) < 0.01

    def test_progress_one_after_epoch(self):
        t = EpochTracker()
        t.record_mined(24.0)  # ring 2 opens
        p = t.progress_to_next()
        assert 0.0 <= p <= 1.0


class TestHomenodeCoordinate:
    def test_returns_tuple_of_ints(self):
        t = EpochTracker()
        coord = t.homenode_coordinate('community', 1)
        assert isinstance(coord, tuple)
        assert len(coord) == 2
        assert isinstance(coord[0], int)
        assert isinstance(coord[1], int)

    def test_ring_1_is_near_origin(self):
        t = EpochTracker()
        x, y = t.homenode_coordinate('community', 1)
        # Chebyshev distance from origin should be 1
        assert max(abs(x), abs(y)) == 1

    def test_different_factions_different_coords(self):
        t = EpochTracker()
        c = t.homenode_coordinate('community', 3)
        p = t.homenode_coordinate('professional', 3)
        assert c != p

    def test_same_faction_ring_prime_twist(self):
        t = EpochTracker()
        r2 = t.homenode_coordinate('community', 2)
        r3 = t.homenode_coordinate('community', 3)
        # Different rings = different coordinates
        assert r2 != r3

    def test_coord_within_grid_bounds(self):
        from agentic.params import GRID_MIN, GRID_MAX
        t = EpochTracker()
        for ring in [1, 2, 5, 10, 50]:
            x, y = t.homenode_coordinate('community', ring)
            assert GRID_MIN <= x <= GRID_MAX
            assert GRID_MIN <= y <= GRID_MAX
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/agentic-chain
python3 -m pytest tests/test_galaxy_epoch.py -v 2>&1 | head -20
```

Expected: `ImportError: No module named 'agentic.galaxy.epoch'`

**Step 3: Create `agentic/galaxy/epoch.py`**

```python
"""EpochTracker — mining-driven galaxy grid ring expansion."""
from __future__ import annotations

import math

from agentic.params import MAX_EPOCH_HARDNESS, GENESIS_EPOCH_RING, HOMENODE_BASE_ANGLE, GRID_MIN, GRID_MAX


def _nth_prime(n: int) -> int:
    """Return the N-th prime number (1-indexed: prime(1)=2, prime(2)=3, ...)."""
    if n <= 0:
        raise ValueError(f"n must be >= 1, got {n}")
    primes = []
    candidate = 2
    while len(primes) < n:
        if all(candidate % p != 0 for p in primes):
            primes.append(candidate)
        candidate += 1
    return primes[-1]


# Faction arm center angles (degrees from positive x-axis, CCW)
_FACTION_ANGLES = {
    "community":    135.0,   # NW arm — Free Community
    "treasury":      45.0,   # NE arm — Treasury
    "founder":      315.0,   # SE arm — Founder Pool
    "professional": 225.0,   # SW arm — Professional Pool
}


class EpochTracker:
    """Tracks cumulative AGNTC mined and opens grid rings as thresholds are crossed.

    One Epoch = one ring expansion. Ring N opens when total_mined >= threshold(N).
    threshold(N) = 4 * N * (N+1)  [cumulative AGNTC required]
    """

    def __init__(self, genesis_ring: int = GENESIS_EPOCH_RING) -> None:
        self.current_ring: int = genesis_ring
        self.total_mined: float = 0.0

    def threshold(self, ring: int) -> float:
        """Cumulative AGNTC needed to open ring N."""
        return 4.0 * ring * (ring + 1)

    def hardness(self, ring: int) -> int:
        """Mining difficulty multiplier at ring N. Caps at MAX_EPOCH_HARDNESS."""
        return min(ring, MAX_EPOCH_HARDNESS)

    def record_mined(self, amount: float) -> list[int]:
        """Add amount to total_mined. Returns list of newly opened rings (usually [])."""
        self.total_mined += amount
        newly_opened: list[int] = []
        while self.threshold(self.current_ring + 1) <= self.total_mined:
            self.current_ring += 1
            newly_opened.append(self.current_ring)
        return newly_opened

    def next_epoch_threshold(self) -> float:
        """Cumulative AGNTC needed to open next ring."""
        return self.threshold(self.current_ring + 1)

    def agntc_to_next_epoch(self) -> float:
        """Remaining AGNTC needed to trigger next ring expansion."""
        return max(0.0, self.next_epoch_threshold() - self.total_mined)

    def progress_to_next(self) -> float:
        """Fraction [0.0, 1.0] of progress toward next epoch threshold."""
        prev = self.threshold(self.current_ring) if self.current_ring > 1 else 0.0
        next_ = self.next_epoch_threshold()
        span = next_ - prev
        if span <= 0:
            return 1.0
        progress = (self.total_mined - prev) / span
        return max(0.0, min(1.0, progress))

    def homenode_coordinate(self, faction: str, ring_n: int) -> tuple[int, int]:
        """Compute homenode position for the N-th player in a faction.

        Uses prime-angle twist: angle = faction_base + prime(ring_n) * BASE_ANGLE.
        Snaps to nearest integer grid cell center.
        Chebyshev distance from origin = ring_n.
        """
        base_angle = _FACTION_ANGLES.get(faction, 0.0)
        prime_n = _nth_prime(ring_n)
        angle_deg = (base_angle + prime_n * HOMENODE_BASE_ANGLE) % 360.0
        angle_rad = math.radians(angle_deg)

        # Project ring_n outward in angular direction
        raw_x = ring_n * math.cos(angle_rad)
        raw_y = ring_n * math.sin(angle_rad)

        # Snap to nearest integer
        x = round(raw_x)
        y = round(raw_y)

        # Ensure Chebyshev distance = ring_n by adjusting dominant axis if needed
        chebyshev = max(abs(x), abs(y))
        if chebyshev != ring_n and chebyshev > 0:
            scale = ring_n / chebyshev
            x = round(raw_x * scale)
            y = round(raw_y * scale)

        # Clamp to grid bounds
        x = max(GRID_MIN, min(GRID_MAX, x))
        y = max(GRID_MIN, min(GRID_MAX, y))

        return x, y
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/agentic-chain
python3 -m pytest tests/test_galaxy_epoch.py -v
```

Expected: all tests PASS

**Step 5: Commit**

```bash
git add agentic/galaxy/epoch.py tests/test_galaxy_epoch.py
git commit -m "feat(epoch): add EpochTracker with ring expansion, hardness, and homenode placement"
```

---

## Task 3: Integrate EpochTracker into GenesisState

**Files:**
- Modify: `agentic/testnet/genesis.py`
- Modify: `tests/test_genesis.py` (add epoch assertions)

**Step 1: Write failing test**

Open `tests/test_genesis.py`. Add to the existing test class (or create a new one):

```python
def test_genesis_has_epoch_tracker():
    from agentic.testnet.genesis import create_genesis
    g = create_genesis(num_wallets=2, num_claims=1, seed=42)
    assert hasattr(g, "epoch_tracker")
    assert g.epoch_tracker.current_ring == 1
    assert g.epoch_tracker.total_mined == 0.0
```

**Step 2: Run to verify it fails**

```bash
python3 -m pytest tests/test_genesis.py::test_genesis_has_epoch_tracker -v
```

Expected: `AttributeError: 'GenesisState' object has no attribute 'epoch_tracker'`

**Step 3: Modify `agentic/testnet/genesis.py`**

Add import at top:
```python
from agentic.galaxy.epoch import EpochTracker
```

Add field to `GenesisState` dataclass:
```python
epoch_tracker: EpochTracker = field(default_factory=EpochTracker)
```

Add initialization in `create_genesis()` before the `return GenesisState(...)`:
```python
epoch_tracker = EpochTracker()
```

Add `epoch_tracker=epoch_tracker` to the `return GenesisState(...)` call.

**Step 4: Run test to verify it passes**

```bash
python3 -m pytest tests/test_genesis.py -v
```

Expected: all PASS

**Step 5: Commit**

```bash
git add agentic/testnet/genesis.py tests/test_genesis.py
git commit -m "feat(epoch): add EpochTracker to GenesisState"
```

---

## Task 4: Apply epoch hardness to MiningEngine

**Files:**
- Modify: `agentic/galaxy/mining.py`
- Modify: `tests/test_mining.py`

**Step 1: Write failing test**

Add to `tests/test_mining.py`:

```python
def test_epoch_hardness_halves_yield_at_ring_2():
    """At epoch ring 2, yield should be ~half of ring 1 yield."""
    from agentic.galaxy.epoch import EpochTracker
    from agentic.galaxy.mining import CommunityPool, MiningEngine
    from agentic.galaxy.coordinate import GridCoordinate

    pool = CommunityPool()
    engine = MiningEngine(pool=pool)
    tracker_ring1 = EpochTracker()  # ring 1
    tracker_ring2 = EpochTracker()
    tracker_ring2.current_ring = 2  # force ring 2

    claims = [{"owner": b"owner1", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]

    yields_r1 = engine.compute_block_yields(claims, epoch_tracker=tracker_ring1)
    yield_r1 = sum(yields_r1.values())

    pool2 = CommunityPool()
    engine2 = MiningEngine(pool=pool2)
    yields_r2 = engine2.compute_block_yields(claims, epoch_tracker=tracker_ring2)
    yield_r2 = sum(yields_r2.values())

    # Ring 2 hardness = 2, so yield should be approx half
    assert abs(yield_r2 - yield_r1 / 2) < 0.001

def test_epoch_tracker_updated_after_block():
    """After compute_block_yields, epoch_tracker.total_mined should increase."""
    from agentic.galaxy.epoch import EpochTracker
    from agentic.galaxy.mining import CommunityPool, MiningEngine
    from agentic.galaxy.coordinate import GridCoordinate

    pool = CommunityPool()
    engine = MiningEngine(pool=pool)
    tracker = EpochTracker()
    claims = [{"owner": b"owner1", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]

    engine.compute_block_yields(claims, epoch_tracker=tracker)
    assert tracker.total_mined > 0.0
```

**Step 2: Run to verify it fails**

```bash
python3 -m pytest tests/test_mining.py::test_epoch_hardness_halves_yield_at_ring_2 -v
```

Expected: `TypeError: compute_block_yields() got an unexpected keyword argument 'epoch_tracker'`

**Step 3: Modify `agentic/galaxy/mining.py`**

Add import at top:
```python
from agentic.params import MAX_EPOCH_HARDNESS
```

Change the `compute_block_yields` signature and body:

```python
def compute_block_yields(
    self,
    claims: list[dict],
    epoch_tracker=None,   # EpochTracker | None — apply hardness if provided
) -> dict[bytes, float]:
    """Compute mining rewards for one block, applying epoch hardness if tracker given."""
    if not claims or self.pool.is_exhausted:
        self.total_blocks_processed += 1
        return {}

    total_stake = sum(c["stake"] for c in claims)
    if total_stake <= 0:
        self.total_blocks_processed += 1
        return {}

    pool_frac = self.pool.fraction_remaining

    # Epoch hardness divisor
    hardness = 1
    if epoch_tracker is not None:
        hardness = epoch_tracker.hardness(epoch_tracker.current_ring)

    # Compute raw yields
    raw_yields: dict[bytes, float] = {}
    for claim in claims:
        density = resource_density(claim["coordinate"].x, claim["coordinate"].y)
        stake_weight = claim["stake"] / total_stake
        raw = BASE_MINING_RATE_PER_BLOCK * density * stake_weight * pool_frac / hardness
        owner = claim["owner"]
        raw_yields[owner] = raw_yields.get(owner, 0.0) + raw

    # Withdraw total from pool (capped)
    total_raw = sum(raw_yields.values())
    actual_total = self.pool.withdraw(total_raw)

    # Scale if pool didn't have enough
    if total_raw > 0 and actual_total < total_raw:
        scale = actual_total / total_raw
        raw_yields = {k: v * scale for k, v in raw_yields.items()}

    # Notify epoch tracker of mined amount
    if epoch_tracker is not None:
        epoch_tracker.record_mined(actual_total)

    self.total_blocks_processed += 1
    self.total_rewards_distributed += actual_total
    return raw_yields
```

**Step 4: Run tests to verify they pass**

```bash
python3 -m pytest tests/test_mining.py -v
```

Expected: all PASS (including new tests)

**Step 5: Run full test suite to check for regressions**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -30
```

Expected: all PASS (or same failures as before this task)

**Step 6: Commit**

```bash
git add agentic/galaxy/mining.py tests/test_mining.py
git commit -m "feat(epoch): apply epoch hardness divisor in MiningEngine, notify EpochTracker per block"
```

---

## Task 5: Wire EpochTracker into API — expose state, broadcast events

**Files:**
- Modify: `agentic/testnet/api.py`

**Step 1: Update `TestnetStatus` model** — add epoch fields:

```python
class TestnetStatus(BaseModel):
    state_root: str
    record_count: int
    total_claims: int
    community_pool_remaining: float
    blocks_processed: int
    total_mined: float
    next_block_in: float
    # Epoch fields (new)
    epoch_ring: int
    epoch_total_mined: float
    epoch_next_threshold: float
    epoch_progress: float        # [0.0, 1.0] progress to next ring
    epoch_agntc_remaining: float # AGNTC still needed to open next ring
```

**Step 2: Update `get_status()` to include epoch fields:**

```python
@app.get("/api/status", response_model=TestnetStatus)
def get_status() -> TestnetStatus:
    g = _g()
    elapsed = time.time() - _last_block_time if _last_block_time > 0 else _BLOCK_TIME_S
    next_in = max(0.0, _BLOCK_TIME_S - elapsed)
    return TestnetStatus(
        state_root=g.ledger_state.get_state_root().hex(),
        record_count=g.ledger_state.record_count,
        total_claims=len(g.claim_registry.all_active_claims()),
        community_pool_remaining=g.community_pool.remaining,
        blocks_processed=g.mining_engine.total_blocks_processed,
        total_mined=g.mining_engine.total_rewards_distributed,
        next_block_in=round(next_in, 1),
        # Epoch
        epoch_ring=g.epoch_tracker.current_ring,
        epoch_total_mined=g.epoch_tracker.total_mined,
        epoch_next_threshold=g.epoch_tracker.next_epoch_threshold(),
        epoch_progress=g.epoch_tracker.progress_to_next(),
        epoch_agntc_remaining=g.epoch_tracker.agntc_to_next_epoch(),
    )
```

**Step 3: Update `_do_mine()` to pass epoch_tracker to mining engine and broadcast epoch_advance:**

Find the `_do_mine` function. Change the `compute_block_yields` call:

```python
yields = g.mining_engine.compute_block_yields(claims_input, epoch_tracker=g.epoch_tracker)
```

After `_last_block_time = time.time()`, add epoch event broadcast:

```python
# Broadcast epoch_advance if new rings opened
newly_opened = []  # populated by record_mined inside compute_block_yields
# Re-check: epoch_tracker.current_ring may have advanced
# (EpochTracker.record_mined returns newly opened rings — capture in mining engine)
```

Note: To capture newly opened rings, update `MiningEngine.compute_block_yields` to store them:

In `mining.py`, after `epoch_tracker.record_mined(actual_total)`:
```python
self._last_newly_opened = epoch_tracker.record_mined(actual_total)
```

Wait — `record_mined` is already called inside `compute_block_yields`. Store the result on the engine:
```python
newly_opened = epoch_tracker.record_mined(actual_total)
self._last_newly_opened = newly_opened  # expose to _do_mine
```

Then in `_do_mine`, after mining:
```python
newly_opened = getattr(g.mining_engine, '_last_newly_opened', [])
if newly_opened:
    loop.create_task(_ws_manager.broadcast("epoch_advance", {
        "epoch_ring": g.epoch_tracker.current_ring,
        "newly_opened_rings": newly_opened,
        "total_mined": g.epoch_tracker.total_mined,
    }))
```

**Step 4: Add `/api/epoch` endpoint:**

```python
class EpochStatus(BaseModel):
    current_ring: int
    total_mined: float
    next_threshold: float
    progress: float
    agntc_remaining: float
    homenode_coordinates: dict  # faction -> list of (x,y) per ring


@app.get("/api/epoch", response_model=EpochStatus)
def get_epoch_status() -> EpochStatus:
    g = _g()
    et = g.epoch_tracker
    factions = ["community", "treasury", "founder", "professional"]
    homenodes = {
        f: [et.homenode_coordinate(f, r) for r in range(1, et.current_ring + 1)]
        for f in factions
    }
    return EpochStatus(
        current_ring=et.current_ring,
        total_mined=et.total_mined,
        next_threshold=et.next_epoch_threshold(),
        progress=et.progress_to_next(),
        agntc_remaining=et.agntc_to_next_epoch(),
        homenode_coordinates=homenodes,
    )
```

**Step 5: Remove dynamic block time logic**

Find and remove/comment the `_current_block_time_s()` function if it exists. Ensure `_BLOCK_TIME_S` stays as a fixed constant (`BLOCK_TIME_MS / 1000.0`).

**Step 6: Smoke test the API**

```bash
# Start the server
cd apps/agentic-chain
uvicorn agentic.testnet.api:app --port 8080 --reload &
sleep 2

# Check status includes epoch fields
curl -s http://localhost:8080/api/status | python3 -m json.tool | grep epoch

# Check epoch endpoint
curl -s http://localhost:8080/api/epoch | python3 -m json.tool
```

Expected: `epoch_ring`, `epoch_total_mined`, etc. in status response; `/api/epoch` returns homenode coordinates.

**Step 7: Run API tests**

```bash
python3 -m pytest tests/test_api.py tests/test_integration_testnet.py -v --tb=short
```

Expected: PASS

**Step 8: Commit**

```bash
git add agentic/testnet/api.py agentic/galaxy/mining.py
git commit -m "feat(epoch): expose epoch state in API, broadcast epoch_advance WebSocket event"
```

---

## Task 6: Frontend — read epoch_ring, render only revealed cells

**Files:**
- Modify: `src/hooks/useGameRealtime.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/components/GalaxyGrid.tsx`

**Working directory:** ``

**Step 1: Add `epochRing` to Zustand store**

In `src/store/gameStore.ts`, add to state:

```typescript
epochRing: number;           // current revealed ring
epochProgress: number;       // [0,1] progress to next ring
epochTotalMined: number;     // cumulative AGNTC mined
```

Add to initial state: `epochRing: 1, epochProgress: 0, epochTotalMined: 0`

Add action:
```typescript
setEpochState: (ring: number, progress: number, totalMined: number) => void;
```

Implement:
```typescript
setEpochState: (ring, progress, totalMined) =>
  set({ epochRing: ring, epochProgress: progress, epochTotalMined: totalMined }),
```

**Step 2: Read epoch from `/api/status` in `useGameRealtime.ts`**

After fetching status, extract epoch fields and call `setEpochState`:

```typescript
const status = await fetchStatus(); // existing call
store.getState().setEpochState(
  status.epoch_ring ?? 1,
  status.epoch_progress ?? 0,
  status.epoch_total_mined ?? 0,
);
```

**Step 3: Subscribe to `epoch_advance` WebSocket event in `useTestnetWebSocket.ts`**

In the WebSocket message handler, add:

```typescript
if (data.event === 'epoch_advance') {
  const { epoch_ring, total_mined } = data.data;
  store.getState().setEpochState(epoch_ring, 0, total_mined);
  // Trigger reveal animation flag
  store.getState().setNewlyOpenedRing(epoch_ring);
}
```

Add `newlyOpenedRing: number | null` state + `setNewlyOpenedRing` action to store.

**Step 4: Filter GalaxyGrid.tsx rendering by epochRing**

In `GalaxyGrid.tsx`, read `epochRing` from store:

```typescript
const epochRing = useGameStore(s => s.epochRing);
```

When rendering grid cells (in the PixiJS draw loop), skip cells outside current epoch ring:

```typescript
// Only render cells within current epochRing (Chebyshev distance from origin)
const chebyshev = Math.max(Math.abs(cellX), Math.abs(cellY));
if (chebyshev > epochRing) continue; // cell not yet revealed
```

Cells at Chebyshev distance exactly `epochRing` (newest ring) render as shadowed/unclaimed (dim alpha, no fill color) until claimed via Birth action.

**Step 5: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: builds without TypeScript errors

**Step 6: Commit**

```bash
git add src/store/gameStore.ts src/hooks/useGameRealtime.ts src/hooks/useTestnetWebSocket.ts src/components/GalaxyGrid.tsx
git commit -m "feat(epoch): frontend reads epoch_ring from chain, renders only revealed cells"
```

---

## Task 7: Full integration test + calibration

**Step 1: Start both servers**

```bash
# Terminal 1: blockchain
cd apps/agentic-chain
uvicorn agentic.testnet.api:app --port 8080 --reload

# Terminal 2: frontend
cd .
npm run dev
```

**Step 2: Reset testnet with fresh genesis**

```bash
curl -X POST "http://localhost:8080/api/reset?wallets=10&claims=5&seed=42"
```

**Step 3: Mine several blocks and watch epoch progression**

```bash
# Mine 10 blocks manually, check epoch state after each
for i in {1..10}; do
  curl -s -X POST http://localhost:8080/api/mine | python3 -m json.tool
  sleep 2
  curl -s http://localhost:8080/api/status | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"Ring: {d['epoch_ring']} | Mined: {d['epoch_total_mined']:.4f} | Progress: {d['epoch_progress']:.1%} | Remaining: {d['epoch_agntc_remaining']:.4f}\")
"
done
```

**Step 4: Calibrate BASE_MINING_RATE_PER_BLOCK if needed**

Target: epoch 1 (ring 2) opens after ~2 hours = ~120 blocks at 60s/block.
Ring 2 requires 24 AGNTC cumulative. With 5 claims at mixed density:
- Expected yield ≈ `0.5 × avg_density × 1.0 / 2` per block
- If epoch 1 completes too fast → lower `BASE_MINING_RATE_PER_BLOCK` in params.py
- If too slow → raise it

Edit `agentic/params.py` to adjust, restart server, re-test.

**Step 5: Commit calibrated params**

```bash
git add agentic/params.py
git commit -m "tune(epoch): calibrate BASE_MINING_RATE_PER_BLOCK for ~2h epoch 1 target"
```

---

## Open Items (post-implementation)

- Faction arm exact degree ranges (currently: community=135°, treasury=45°, founder=315°, professional=225°) — adjust based on visual testing
- Reveal animation spec for newly opened ring cells in `GalaxyGrid.tsx`
- Isolated homenode visual (dim glow for homenodes in unrevealed rings)
- Backbone link rendering between sequential homenodes in same faction
