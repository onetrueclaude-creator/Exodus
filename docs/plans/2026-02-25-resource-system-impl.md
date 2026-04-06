# Resource System Implementation Plan


**Goal:** Implement the CPU Tokens rename, CPU Staked counter, and 4-type subgrid allocation system (Secure/Develop/Research/Storage) with per-block autonomous agent outputs.

**Architecture:** New `SubgridAllocator` in `agentic/galaxy/subgrid.py` tracks 64 sub-cell allocations per homenode; `MiningEngine` calls it each block to compute all resource outputs. API exposes full resource state. Frontend renames CPU Energy → CPU Tokens and adds 5 new resource counters to the ResourceBar.

**Tech Stack:** Python 3.11, FastAPI, pytest, TypeScript 5, React 19, Zustand 5, Tailwind CSS 4.

**Prerequisite:** `docs/plans/2026-02-25-blockchain-epoch-implementation.md` Tasks 1–5 must be complete first (EpochTracker in params + genesis + mining + API).

**Working directories:**
- Blockchain: `apps/agentic-chain/`
- Frontend: ``

---

## Task 1: Add subgrid base-rate params to params.py

**Files:**
- Modify: `agentic/params.py`

**Step 1: Open params.py and add after the `# Mining` block:**

```python
# Subgrid allocation — 4 autonomous sub-cell agent types (base output at level 1, full density)
SUBGRID_SIZE = 64                   # 8×8 sub-cells per homenode inner grid
BASE_SECURE_RATE = 0.5              # AGNTC/block at level 1, hardness 1, full density (tune in testing)
BASE_DEVELOP_RATE = 1.0             # Dev Points/block at level 1
BASE_RESEARCH_RATE = 0.5            # Research Points/block at level 1
BASE_STORAGE_RATE = 1.0             # Storage units/block at level 1
LEVEL_EXPONENT = 0.8                # output = base × level^LEVEL_EXPONENT
```

**Step 2: Verify import works**

```bash
cd apps/agentic-chain
python3 -c "from agentic.params import SUBGRID_SIZE, BASE_SECURE_RATE, BASE_DEVELOP_RATE, BASE_RESEARCH_RATE, BASE_STORAGE_RATE, LEVEL_EXPONENT; print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add agentic/params.py
git commit -m "feat(subgrid): add subgrid base-rate params to params.py"
```

---

## Task 2: Create SubgridAllocator (TDD)

**Files:**
- Create: `agentic/galaxy/subgrid.py`
- Create: `tests/test_galaxy_subgrid.py`

**Step 1: Write the failing tests**

Create `tests/test_galaxy_subgrid.py`:

```python
"""Tests for SubgridAllocator — 4-type autonomous sub-cell allocation."""
from __future__ import annotations
import pytest
from agentic.galaxy.subgrid import SubgridAllocator, SubcellType, SubgridOutput


class TestSubcellType:
    def test_four_types_exist(self):
        assert SubcellType.SECURE.value == "secure"
        assert SubcellType.DEVELOP.value == "develop"
        assert SubcellType.RESEARCH.value == "research"
        assert SubcellType.STORAGE.value == "storage"


class TestSubgridAllocatorInit:
    def test_starts_empty(self):
        a = SubgridAllocator(owner=b"user1")
        assert a.total_cells == 0
        assert a.free_cells == 64

    def test_total_capacity_is_64(self):
        a = SubgridAllocator(owner=b"user1")
        assert a.capacity == 64

    def test_count_by_type_zero_at_start(self):
        a = SubgridAllocator(owner=b"user1")
        assert a.count(SubcellType.SECURE) == 0
        assert a.count(SubcellType.DEVELOP) == 0


class TestSubgridAllocatorAssign:
    def test_assign_cells(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=10)
        assert a.count(SubcellType.SECURE) == 10
        assert a.free_cells == 54

    def test_assign_multiple_types(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=10)
        a.assign(SubcellType.DEVELOP, count=10)
        a.assign(SubcellType.RESEARCH, count=10)
        assert a.total_cells == 30
        assert a.free_cells == 34

    def test_cannot_exceed_capacity(self):
        a = SubgridAllocator(owner=b"user1")
        with pytest.raises(ValueError, match="Not enough free cells"):
            a.assign(SubcellType.SECURE, count=65)

    def test_reassign_frees_old_cells(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=20)
        a.assign(SubcellType.SECURE, count=10)  # replaces, frees 10
        assert a.count(SubcellType.SECURE) == 10
        assert a.free_cells == 54

    def test_assign_zero_removes_type(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=10)
        a.assign(SubcellType.SECURE, count=0)
        assert a.count(SubcellType.SECURE) == 0
        assert a.free_cells == 64


class TestSubgridLevels:
    def test_default_level_is_1(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=5)
        assert a.get_level(SubcellType.SECURE) == 1

    def test_set_level(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=5)
        a.set_level(SubcellType.SECURE, 3)
        assert a.get_level(SubcellType.SECURE) == 3

    def test_level_must_be_positive(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=5)
        with pytest.raises(ValueError):
            a.set_level(SubcellType.SECURE, 0)


class TestSubgridOutput:
    def test_zero_output_with_no_cells(self):
        a = SubgridAllocator(owner=b"user1")
        out = a.compute_output(density=1.0)
        assert out.agntc == 0.0
        assert out.dev_points == 0.0
        assert out.research_points == 0.0
        assert out.storage_units == 0.0

    def test_secure_cells_produce_agntc(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=10)
        out = a.compute_output(density=1.0)
        assert out.agntc > 0.0
        assert out.dev_points == 0.0

    def test_develop_cells_produce_dev_points(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.DEVELOP, count=10)
        out = a.compute_output(density=1.0)
        assert out.dev_points > 0.0
        assert out.agntc == 0.0

    def test_research_cells_produce_research_points(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.RESEARCH, count=10)
        out = a.compute_output(density=1.0)
        assert out.research_points > 0.0

    def test_storage_cells_produce_storage_units(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.STORAGE, count=10)
        out = a.compute_output(density=1.0)
        assert out.storage_units > 0.0

    def test_level_2_produces_more_than_level_1(self):
        a1 = SubgridAllocator(owner=b"user1")
        a1.assign(SubcellType.DEVELOP, count=5)

        a2 = SubgridAllocator(owner=b"user2")
        a2.assign(SubcellType.DEVELOP, count=5)
        a2.set_level(SubcellType.DEVELOP, 2)

        out1 = a1.compute_output(density=1.0)
        out2 = a2.compute_output(density=1.0)
        assert out2.dev_points > out1.dev_points

    def test_more_cells_produce_more_output(self):
        a1 = SubgridAllocator(owner=b"user1")
        a1.assign(SubcellType.SECURE, count=5)

        a2 = SubgridAllocator(owner=b"user2")
        a2.assign(SubcellType.SECURE, count=10)

        out1 = a1.compute_output(density=1.0)
        out2 = a2.compute_output(density=1.0)
        assert out2.agntc > out1.agntc

    def test_epoch_hardness_reduces_agntc(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=10)
        out_r1 = a.compute_output(density=1.0, epoch_hardness=1)
        out_r2 = a.compute_output(density=1.0, epoch_hardness=2)
        assert abs(out_r2.agntc - out_r1.agntc / 2) < 0.001

    def test_density_scales_agntc_not_dev(self):
        a = SubgridAllocator(owner=b"user1")
        a.assign(SubcellType.SECURE, count=5)
        a.assign(SubcellType.DEVELOP, count=5)
        out_half = a.compute_output(density=0.5)
        out_full = a.compute_output(density=1.0)
        # AGNTC scales with density
        assert abs(out_half.agntc - out_full.agntc * 0.5) < 0.001
        # Dev points do NOT scale with density (compute resources, not geographic)
        assert abs(out_half.dev_points - out_full.dev_points) < 0.001
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/agentic-chain
python3 -m pytest tests/test_galaxy_subgrid.py -v 2>&1 | head -10
```

Expected: `ImportError: No module named 'agentic.galaxy.subgrid'`

**Step 3: Create `agentic/galaxy/subgrid.py`**

```python
"""SubgridAllocator — 4-type autonomous sub-cell allocation per homenode."""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum

from agentic.params import (
    SUBGRID_SIZE,
    BASE_SECURE_RATE,
    BASE_DEVELOP_RATE,
    BASE_RESEARCH_RATE,
    BASE_STORAGE_RATE,
    LEVEL_EXPONENT,
)


class SubcellType(Enum):
    SECURE = "secure"
    DEVELOP = "develop"
    RESEARCH = "research"
    STORAGE = "storage"


@dataclass
class SubgridOutput:
    """Per-block output from a homenode's subgrid allocation."""
    agntc: float = 0.0           # from Secure cells (epoch hardness + density applied)
    dev_points: float = 0.0      # from Develop cells
    research_points: float = 0.0 # from Research cells
    storage_units: float = 0.0   # from Storage cells


def _level_multiplier(level: int) -> float:
    """output = base × level^LEVEL_EXPONENT. Level 1 = 1.0×."""
    return math.pow(max(1, level), LEVEL_EXPONENT)


@dataclass
class SubgridAllocator:
    """Manages 64 sub-cell allocation for one homenode.

    Each sub-cell is assigned to one of 4 types and has an integer level >= 1.
    All sub-agents loop autonomously each block, producing resources.
    The inner grid is private — never exposed to other users.
    """

    owner: bytes
    capacity: int = SUBGRID_SIZE  # 64 sub-cells

    # Internal: type → (count, level)
    _allocations: dict[SubcellType, int] = field(default_factory=dict)
    _levels: dict[SubcellType, int] = field(default_factory=dict)

    def count(self, cell_type: SubcellType) -> int:
        return self._allocations.get(cell_type, 0)

    def get_level(self, cell_type: SubcellType) -> int:
        return self._levels.get(cell_type, 1)

    @property
    def total_cells(self) -> int:
        return sum(self._allocations.values())

    @property
    def free_cells(self) -> int:
        return self.capacity - self.total_cells

    def assign(self, cell_type: SubcellType, count: int) -> None:
        """Assign `count` sub-cells to `cell_type`.

        Replaces any previous allocation for this type.
        count=0 removes the type.
        Raises ValueError if the total would exceed capacity.
        """
        if count < 0:
            raise ValueError(f"count must be >= 0, got {count}")

        current = self._allocations.get(cell_type, 0)
        delta = count - current
        if self.free_cells - delta < 0:
            raise ValueError(
                f"Not enough free cells: need {delta} more, have {self.free_cells}"
            )

        if count == 0:
            self._allocations.pop(cell_type, None)
            self._levels.pop(cell_type, None)
        else:
            self._allocations[cell_type] = count
            if cell_type not in self._levels:
                self._levels[cell_type] = 1  # default level

    def set_level(self, cell_type: SubcellType, level: int) -> None:
        """Set the level for cells of a given type. Level must be >= 1."""
        if level < 1:
            raise ValueError(f"level must be >= 1, got {level}")
        self._levels[cell_type] = level

    def compute_output(
        self,
        density: float = 1.0,
        epoch_hardness: int = 1,
    ) -> SubgridOutput:
        """Compute per-block resource output from current allocation.

        Args:
            density: resource density at this homenode's coordinate [0.0, 1.0]
            epoch_hardness: current epoch ring number (min 1) — divides AGNTC only

        Returns:
            SubgridOutput with all 4 resource values for this block
        """
        hardness = max(1, epoch_hardness)
        out = SubgridOutput()

        for cell_type, count in self._allocations.items():
            if count <= 0:
                continue
            level = self._levels.get(cell_type, 1)
            mult = _level_multiplier(level)

            if cell_type == SubcellType.SECURE:
                # AGNTC: scaled by density AND epoch hardness
                out.agntc += BASE_SECURE_RATE * count * mult * density / hardness

            elif cell_type == SubcellType.DEVELOP:
                # Dev points: NOT density-scaled (compute resource, not geographic)
                out.dev_points += BASE_DEVELOP_RATE * count * mult

            elif cell_type == SubcellType.RESEARCH:
                # Research points: NOT density-scaled
                out.research_points += BASE_RESEARCH_RATE * count * mult

            elif cell_type == SubcellType.STORAGE:
                # Storage units: NOT density-scaled
                out.storage_units += BASE_STORAGE_RATE * count * mult

        return out
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/agentic-chain
python3 -m pytest tests/test_galaxy_subgrid.py -v
```

Expected: all PASS

**Step 5: Commit**

```bash
git add agentic/galaxy/subgrid.py tests/test_galaxy_subgrid.py
git commit -m "feat(subgrid): SubgridAllocator with 4-type allocation, level scaling, per-block output"
```

---

## Task 3: Add SubgridAllocator to GenesisState

**Files:**
- Modify: `agentic/testnet/genesis.py`
- Modify: `tests/test_genesis.py`

**Step 1: Write the failing test**

Add to `tests/test_genesis.py`:

```python
def test_genesis_has_subgrid_allocators():
    from agentic.testnet.genesis import create_genesis
    g = create_genesis(num_wallets=2, num_claims=2, seed=42)
    assert hasattr(g, "subgrid_allocators")
    # One allocator per claim owner
    assert len(g.subgrid_allocators) == 2
    # Each is a SubgridAllocator instance
    from agentic.galaxy.subgrid import SubgridAllocator
    for alloc in g.subgrid_allocators.values():
        assert isinstance(alloc, SubgridAllocator)
        assert alloc.free_cells == 64  # fresh genesis = all free
```

**Step 2: Run to verify it fails**

```bash
python3 -m pytest tests/test_genesis.py::test_genesis_has_subgrid_allocators -v
```

Expected: `AttributeError: 'GenesisState' object has no attribute 'subgrid_allocators'`

**Step 3: Modify `agentic/testnet/genesis.py`**

Add import at top:
```python
from agentic.galaxy.subgrid import SubgridAllocator
```

Add field to `GenesisState` dataclass:
```python
# key: owner public_key (bytes) → SubgridAllocator
subgrid_allocators: dict = field(default_factory=dict)
```

In `create_genesis()`, after the claims loop, add:
```python
# Create one default SubgridAllocator per claim owner
subgrid_allocators: dict = {}
for claim in claim_registry.all_active_claims():
    if claim.owner not in subgrid_allocators:
        subgrid_allocators[claim.owner] = SubgridAllocator(owner=claim.owner)
```

Add `subgrid_allocators=subgrid_allocators` to `return GenesisState(...)`.

**Step 4: Run all genesis tests**

```bash
python3 -m pytest tests/test_genesis.py -v
```

Expected: all PASS

**Step 5: Commit**

```bash
git add agentic/testnet/genesis.py tests/test_genesis.py
git commit -m "feat(subgrid): add SubgridAllocator per claim owner in GenesisState"
```

---

## Task 4: Expose subgrid output in API — new /api/resources endpoint

**Files:**
- Modify: `agentic/testnet/api.py`

**Step 1: Add ResourceState and SubgridState models** (after existing Pydantic models):

```python
class SubgridAllocationInfo(BaseModel):
    secure_count: int = 0
    develop_count: int = 0
    research_count: int = 0
    storage_count: int = 0
    secure_level: int = 1
    develop_level: int = 1
    research_level: int = 1
    storage_level: int = 1
    free_cells: int = 64

class SubgridAssignRequest(BaseModel):
    wallet_index: int
    secure: int = 0
    develop: int = 0
    research: int = 0
    storage: int = 0

class ResourceState(BaseModel):
    # Per-block projections (what this user earns next block)
    agntc_per_block: float
    dev_points_per_block: float
    research_points_per_block: float
    storage_per_block: float
    # Cumulative totals (lifetime)
    total_dev_points: float
    total_research_points: float
    total_storage_units: float
    # Subgrid allocation
    subgrid: SubgridAllocationInfo
```

**Step 2: Add GET /api/resources/{wallet_index}**

```python
@app.get("/api/resources/{wallet_index}", response_model=ResourceState)
def get_resources(wallet_index: int) -> ResourceState:
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")

    wallet = g.wallets[wallet_index]
    owner = wallet.public_key
    alloc = g.subgrid_allocators.get(owner)

    if alloc is None:
        # Return empty allocation
        return ResourceState(
            agntc_per_block=0.0,
            dev_points_per_block=0.0,
            research_points_per_block=0.0,
            storage_per_block=0.0,
            total_dev_points=0.0,
            total_research_points=0.0,
            total_storage_units=0.0,
            subgrid=SubgridAllocationInfo(),
        )

    # Find homenode density
    claims = g.claim_registry.all_active_claims()
    density = 0.5  # default if no claim found
    for c in claims:
        if c.owner == owner:
            density = resource_density(c.coordinate.x, c.coordinate.y)
            break

    # Get epoch hardness if tracker exists
    epoch_hardness = 1
    if hasattr(g, "epoch_tracker"):
        from agentic.galaxy.epoch import EpochTracker
        epoch_hardness = g.epoch_tracker.hardness(g.epoch_tracker.current_ring)

    from agentic.galaxy.subgrid import SubcellType
    out = alloc.compute_output(density=density, epoch_hardness=epoch_hardness)

    return ResourceState(
        agntc_per_block=round(out.agntc, 6),
        dev_points_per_block=round(out.dev_points, 4),
        research_points_per_block=round(out.research_points, 4),
        storage_per_block=round(out.storage_units, 4),
        total_dev_points=g.resource_totals.get(owner, {}).get("dev_points", 0.0),
        total_research_points=g.resource_totals.get(owner, {}).get("research_points", 0.0),
        total_storage_units=g.resource_totals.get(owner, {}).get("storage_units", 0.0),
        subgrid=SubgridAllocationInfo(
            secure_count=alloc.count(SubcellType.SECURE),
            develop_count=alloc.count(SubcellType.DEVELOP),
            research_count=alloc.count(SubcellType.RESEARCH),
            storage_count=alloc.count(SubcellType.STORAGE),
            secure_level=alloc.get_level(SubcellType.SECURE),
            develop_level=alloc.get_level(SubcellType.DEVELOP),
            research_level=alloc.get_level(SubcellType.RESEARCH),
            storage_level=alloc.get_level(SubcellType.STORAGE),
            free_cells=alloc.free_cells,
        ),
    )
```

**Step 3: Add POST /api/resources/{wallet_index}/assign**

```python
@app.post("/api/resources/{wallet_index}/assign")
def assign_subgrid(wallet_index: int, req: SubgridAssignRequest) -> dict:
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")

    wallet = g.wallets[wallet_index]
    owner = wallet.public_key
    alloc = g.subgrid_allocators.get(owner)
    if alloc is None:
        raise HTTPException(status_code=404, detail="No subgrid for this wallet")

    from agentic.galaxy.subgrid import SubcellType
    total_requested = req.secure + req.develop + req.research + req.storage
    if total_requested > 64:
        raise HTTPException(status_code=400, detail=f"Total cells {total_requested} exceeds 64")

    # Reset all, then assign
    alloc.assign(SubcellType.SECURE, 0)
    alloc.assign(SubcellType.DEVELOP, 0)
    alloc.assign(SubcellType.RESEARCH, 0)
    alloc.assign(SubcellType.STORAGE, 0)
    alloc.assign(SubcellType.SECURE, req.secure)
    alloc.assign(SubcellType.DEVELOP, req.develop)
    alloc.assign(SubcellType.RESEARCH, req.research)
    alloc.assign(SubcellType.STORAGE, req.storage)

    return {"status": "ok", "free_cells": alloc.free_cells}
```

**Step 4: Add `resource_totals` to GenesisState** (in `genesis.py`)

Add to `GenesisState`:
```python
# Cumulative resource totals: owner (bytes) → {dev_points, research_points, storage_units}
resource_totals: dict = field(default_factory=dict)
```

Initialize in `create_genesis()` before return:
```python
resource_totals = {w.public_key: {"dev_points": 0.0, "research_points": 0.0, "storage_units": 0.0} for w in wallets}
```

Add to `return GenesisState(...)`.

**Step 5: Wire subgrid output into _do_mine** — distribute per-block resource outputs

In `api.py`, find `_do_mine()`. After mining yields, add:
```python
# Distribute subgrid outputs for all allocators
for owner, alloc in g.subgrid_allocators.items():
    claims_for_owner = [c for c in claims_input if c["owner"] == owner]
    if not claims_for_owner:
        continue
    density = resource_density(
        claims_for_owner[0]["coordinate"].x,
        claims_for_owner[0]["coordinate"].y
    )
    epoch_hardness = g.epoch_tracker.hardness(g.epoch_tracker.current_ring) if hasattr(g, "epoch_tracker") else 1
    out = alloc.compute_output(density=density, epoch_hardness=epoch_hardness)
    if owner not in g.resource_totals:
        g.resource_totals[owner] = {"dev_points": 0.0, "research_points": 0.0, "storage_units": 0.0}
    g.resource_totals[owner]["dev_points"] += out.dev_points
    g.resource_totals[owner]["research_points"] += out.research_points
    g.resource_totals[owner]["storage_units"] += out.storage_units
```

**Step 6: Smoke test**

```bash
cd apps/agentic-chain
uvicorn agentic.testnet.api:app --port 8080 --reload &
sleep 2

# Check resources for wallet 0 (default allocation)
curl -s http://localhost:8080/api/resources/0 | python3 -m json.tool

# Assign some cells and check projection
curl -s -X POST http://localhost:8080/api/resources/0/assign \
  -H "Content-Type: application/json" \
  -d '{"wallet_index": 0, "secure": 20, "develop": 20, "research": 12, "storage": 12}' | python3 -m json.tool

# Check updated projection
curl -s http://localhost:8080/api/resources/0 | python3 -m json.tool
```

Expected: `subgrid.free_cells` = 0 after assign; `agntc_per_block`, `dev_points_per_block` > 0

**Step 7: Run full test suite**

```bash
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: all PASS (or same baseline failures)

**Step 8: Commit**

```bash
git add agentic/testnet/api.py agentic/testnet/genesis.py
git commit -m "feat(subgrid): expose resource state and subgrid assignment in API"
```

---

## Task 5: Update frontend store — rename energy + add new resource fields

**Files:**
- Modify: `src/store/gameStore.ts`

**Step 1: Add new state fields** — in the `GameState` interface, replace:

```typescript
// Resources
energy: number;
minerals: number;
agntcBalance: number;
securedChains: number;
```

with:

```typescript
// Resources
cpuTokens: number;        // cumulative tokens spent across all terminals (read-only ↑)
cpuStakedActive: number;  // tokens spent by Secure sub-agents this block (live ↑↓)
cpuStakedTotal: number;   // all-time cumulative Secure token spend (↑ only)
minerals: number;          // Data Frags (existing — keep)
agntcBalance: number;
securedChains: number;
devPoints: number;         // from Develop sub-cells
researchPoints: number;    // from Research sub-cells
storageSize: number;       // units of private data on-chain

// Subgrid allocation projection
subgridAgntcPerBlock: number;
subgridDevPerBlock: number;
subgridResearchPerBlock: number;
subgridStoragePerBlock: number;
```

**Step 2: Add setter actions** to the interface:

```typescript
setCpuTokens: (value: number) => void;
setCpuStaked: (active: number, total: number) => void;
setDevPoints: (value: number) => void;
setResearchPoints: (value: number) => void;
setStorageSize: (value: number) => void;
setSubgridProjection: (agntc: number, dev: number, research: number, storage: number) => void;
```

**Step 3: Update initial state** (in `create(...)` body):

```typescript
cpuTokens: 1000,       // starting balance matching old 'energy' initial
cpuStakedActive: 0,
cpuStakedTotal: 0,
minerals: 0,
agntcBalance: 0,
securedChains: 0,
devPoints: 0,
researchPoints: 0,
storageSize: 0,
subgridAgntcPerBlock: 0,
subgridDevPerBlock: 0,
subgridResearchPerBlock: 0,
subgridStoragePerBlock: 0,
```

**Step 4: Add action implementations** (in the `create(...)` body):

```typescript
setCpuTokens: (value) => set({ cpuTokens: value }),
setCpuStaked: (active, total) => set({ cpuStakedActive: active, cpuStakedTotal: total }),
setDevPoints: (value) => set({ devPoints: value }),
setResearchPoints: (value) => set({ researchPoints: value }),
setStorageSize: (value) => set({ storageSize: value }),
setSubgridProjection: (agntc, dev, research, storage) => set({
  subgridAgntcPerBlock: agntc,
  subgridDevPerBlock: dev,
  subgridResearchPerBlock: research,
  subgridStoragePerBlock: storage,
}),
```

**Step 5: Find all uses of `s.energy` in the codebase and update**

```bash
grep -r "\.energy\b" src/ --include="*.ts" --include="*.tsx" -l
```

For each file found: change `s.energy` → `s.cpuTokens` and `state.energy` → `state.cpuTokens`.

Also update `ResourceBarProps` in `ResourceBar.tsx`: rename `energyDelta` → `cpuTokensDelta`.

**Step 6: Build check**

```bash
cd .
npm run build 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: no TypeScript errors related to `energy` → `cpuTokens` rename

**Step 7: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(store): rename energy→cpuTokens, add cpuStaked + dev/research/storage fields"
```

---

## Task 6: Update ResourceBar — rename label + add 5 new counters

**Files:**
- Modify: `src/components/ResourceBar.tsx`

**Step 1: Update props interface** in `ResourceBar.tsx`:

```typescript
interface ResourceBarProps {
  cpuTokensDelta?: number;     // was energyDelta
  cpuTokensEstPerTurn?: number; // was energyEstPerTurn
}
```

**Step 2: Update store subscriptions** at the top of `ResourceBar`:

```typescript
const cpuTokens = useGameStore((s) => s.cpuTokens);
const cpuStakedActive = useGameStore((s) => s.cpuStakedActive);
const cpuStakedTotal = useGameStore((s) => s.cpuStakedTotal);
const devPoints = useGameStore((s) => s.devPoints);
const researchPoints = useGameStore((s) => s.researchPoints);
const storageSize = useGameStore((s) => s.storageSize);
```

Remove the old `energy` subscription.

**Step 3: Replace the CPU Energy section** with:

```tsx
{/* CPU Tokens — yellow (read-only cumulative) */}
<div className="flex items-center gap-1 group">
  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
  <span className="text-[9px] font-mono text-yellow-400/60 uppercase tracking-wider">CPU</span>
  <span className="text-xs font-mono text-yellow-300 tabular-nums">{sciFormat(cpuTokens)}</span>
  <sup className="text-[9px] leading-none"><DeltaFlash resourceKey="cpuTokens" /></sup>
  {cpuTokensDelta !== undefined && cpuTokensDelta !== 0 && (
    <sup className="text-[9px] leading-none">
      <EnergyDeltaBadge key={deltaVersion} energyDelta={cpuTokensDelta} />
    </sup>
  )}
</div>

{/* CPU Staked — orange (active + total) */}
<div className="flex items-center gap-1">
  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
  <span className="text-[9px] font-mono text-orange-400/60 uppercase tracking-wider">STAKED</span>
  <span className="text-xs font-mono text-orange-300 tabular-nums">{sciFormat(cpuStakedActive)}</span>
  <span className="text-[9px] font-mono text-orange-400/40">/{sciFormat(cpuStakedTotal)}</span>
</div>
```

**Step 4: Add Dev Points, Research Points, Storage Size** after AGNTC:

```tsx
{/* Dev Points — indigo */}
<div className="flex items-center gap-1">
  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
  <span className="text-[9px] font-mono text-indigo-400/60 uppercase tracking-wider">DEV</span>
  <span className="text-xs font-mono text-indigo-300 tabular-nums">{sciFormat(devPoints)}</span>
  <sup className="text-[9px] leading-none"><DeltaFlash resourceKey="devPoints" /></sup>
</div>

{/* Research Points — violet */}
<div className="flex items-center gap-1">
  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
  <span className="text-[9px] font-mono text-violet-400/60 uppercase tracking-wider">RES</span>
  <span className="text-xs font-mono text-violet-300 tabular-nums">{sciFormat(researchPoints)}</span>
  <sup className="text-[9px] leading-none"><DeltaFlash resourceKey="researchPoints" /></sup>
</div>

{/* Storage Size — teal */}
<div className="flex items-center gap-1">
  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
  <span className="text-[9px] font-mono text-teal-400/60 uppercase tracking-wider">DATA</span>
  <span className="text-xs font-mono text-teal-300 tabular-nums">{sciFormat(storageSize)}</span>
  <sup className="text-[9px] leading-none"><DeltaFlash resourceKey="storageSize" /></sup>
</div>
```

**Step 5: Build check**

```bash
cd .
npm run build 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: no errors

**Step 6: Commit**

```bash
git add src/components/ResourceBar.tsx
git commit -m "feat(ui): ResourceBar — CPU Energy→CPU Tokens, add CPU Staked + Dev/Research/Storage counters"
```

---

## Task 7: Wire new resources into useGameRealtime.ts

**Files:**
- Modify: `src/hooks/useGameRealtime.ts`

**Step 1: After fetching `/api/status`, also fetch `/api/resources/0`**

Add after status fetch:

```typescript
// Fetch subgrid resource state for wallet 0 (current user)
try {
  const resResp = await fetch('http://localhost:8080/api/resources/0');
  if (resResp.ok) {
    const res = await resResp.json();
    store.getState().setSubgridProjection(
      res.agntc_per_block ?? 0,
      res.dev_points_per_block ?? 0,
      res.research_points_per_block ?? 0,
      res.storage_per_block ?? 0,
    );
    store.getState().setDevPoints(res.total_dev_points ?? 0);
    store.getState().setResearchPoints(res.total_research_points ?? 0);
    store.getState().setStorageSize(res.total_storage_units ?? 0);
  }
} catch {
  // non-fatal — resource bar degrades gracefully
}
```

**Step 2: Build check**

```bash
npm run build 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/hooks/useGameRealtime.ts
git commit -m "feat(hooks): fetch subgrid resource state from API, update store each poll cycle"
```

---

## Task 8: Full integration test

**Step 1: Start both servers**

```bash
# Terminal 1
cd apps/agentic-chain
uvicorn agentic.testnet.api:app --port 8080 --reload

# Terminal 2
cd .
npm run dev
```

**Step 2: Reset testnet**

```bash
curl -X POST "http://localhost:8080/api/reset?wallets=5&claims=3&seed=42"
```

**Step 3: Assign subgrid cells to wallet 0**

```bash
curl -s -X POST http://localhost:8080/api/resources/0/assign \
  -H "Content-Type: application/json" \
  -d '{"wallet_index": 0, "secure": 20, "develop": 15, "research": 15, "storage": 14}' \
  | python3 -m json.tool
```

Expected: `{"status": "ok", "free_cells": 0}`

**Step 4: Mine a block and verify resource totals increment**

```bash
curl -s -X POST http://localhost:8080/api/mine | python3 -m json.tool
sleep 2
curl -s http://localhost:8080/api/resources/0 | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"AGNTC/block: {d['agntc_per_block']:.4f}\")
print(f\"Dev/block: {d['dev_points_per_block']:.4f}\")
print(f\"Research/block: {d['research_points_per_block']:.4f}\")
print(f\"Storage/block: {d['storage_per_block']:.4f}\")
print(f\"Total dev: {d['total_dev_points']:.4f}\")
"
```

Expected: all values > 0 after one block

**Step 5: Open browser and verify ResourceBar**

Navigate to `http://localhost:3000/game`.

Verify:
- CPU counter shows yellow label "CPU" (not "CPU Energy")
- STAKED counter shows orange
- DEV, RES, DATA counters visible
- Counters update each polling cycle (every ~5s)

**Step 6: Run full test suite**

```bash
cd apps/agentic-chain
python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: all PASS

**Step 7: Commit**

```bash
cd .
git add -A
git commit -m "feat(integration): resource system complete — CPU Tokens, CPU Staked, subgrid allocation live"
```

---

## Open Items (post-implementation)

- SubgridAllocationPanel UI component (private inner grid — separate task)
- CPU Tokens broadcast from Claude terminal to API (`/api/token-spend` endpoint)
- CPU Staked computed from actual Secure sub-agent token spend (requires terminal token tracking)
- Timechain Stats panel network totals (network CPU Tokens, network CPU Staked active)
- Max level cap per sub-cell (propose: 20)
- Dev Points cost formula for leveling: `cost(current_level) = 50 × current_level^1.5`
- Storage unit definition (propose: 1 unit = 1 NCP packet = ~500 bytes)
