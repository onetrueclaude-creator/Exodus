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
    agntc: float = 0.0
    dev_points: float = 0.0
    research_points: float = 0.0
    storage_units: float = 0.0


def _level_multiplier(level: int) -> float:
    """Return output multiplier for a given sub-cell level.

    Formula: level^LEVEL_EXPONENT (clamped to min 1).
    """
    return math.pow(max(1, level), LEVEL_EXPONENT)


@dataclass
class SubgridAllocator:
    """Manages a homenode's 8x8 inner grid of autonomous sub-cell agents.

    Each sub-cell can be assigned to one of four types (Secure, Develop,
    Research, Storage).  The allocator tracks how many cells are assigned
    to each type and computes per-block output based on cell count, level,
    density, and epoch hardness.
    """

    owner: bytes
    capacity: int = SUBGRID_SIZE
    _allocations: dict[SubcellType, int] = field(default_factory=dict)
    _levels: dict[SubcellType, int] = field(default_factory=dict)

    # -- Counts ----------------------------------------------------------------

    def count(self, cell_type: SubcellType) -> int:
        """Return the number of cells assigned to *cell_type*."""
        return self._allocations.get(cell_type, 0)

    def get_level(self, cell_type: SubcellType) -> int:
        """Return the current level for *cell_type* (default 1)."""
        return self._levels.get(cell_type, 1)

    @property
    def total_cells(self) -> int:
        """Total cells currently assigned across all types."""
        return sum(self._allocations.values())

    @property
    def free_cells(self) -> int:
        """Cells still available for assignment."""
        return self.capacity - self.total_cells

    # -- Mutation --------------------------------------------------------------

    def assign(self, cell_type: SubcellType, count: int) -> None:
        """Set *cell_type* allocation to exactly *count* cells.

        Raises ``ValueError`` if *count* < 0 or would exceed capacity.
        Setting *count* to 0 removes the type entirely.
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
                self._levels[cell_type] = 1

    def set_level(self, cell_type: SubcellType, level: int) -> None:
        """Set the upgrade level for *cell_type*.

        Raises ``ValueError`` if *level* < 1.
        """
        if level < 1:
            raise ValueError(f"level must be >= 1, got {level}")
        self._levels[cell_type] = level

    # -- Output ----------------------------------------------------------------

    def compute_output(
        self,
        density: float = 1.0,
        epoch_hardness: int = 1,
    ) -> SubgridOutput:
        """Compute per-block resource output for all assigned cells.

        - **Secure** cells produce AGNTC, scaled by density and divided by
          epoch hardness.
        - **Develop** cells produce dev_points (unaffected by density/hardness).
        - **Research** cells produce research_points (unaffected by
          density/hardness).
        - **Storage** cells produce storage_units (unaffected by
          density/hardness).

        All outputs are multiplied by ``level^LEVEL_EXPONENT``.
        """
        hardness = max(1, epoch_hardness)
        out = SubgridOutput()

        for cell_type, cell_count in self._allocations.items():
            if cell_count <= 0:
                continue
            level = self._levels.get(cell_type, 1)
            mult = _level_multiplier(level)

            if cell_type == SubcellType.SECURE:
                out.agntc += BASE_SECURE_RATE * cell_count * mult * density / hardness
            elif cell_type == SubcellType.DEVELOP:
                out.dev_points += BASE_DEVELOP_RATE * cell_count * mult
            elif cell_type == SubcellType.RESEARCH:
                out.research_points += BASE_RESEARCH_RATE * cell_count * mult
            elif cell_type == SubcellType.STORAGE:
                out.storage_units += BASE_STORAGE_RATE * cell_count * mult

        return out
