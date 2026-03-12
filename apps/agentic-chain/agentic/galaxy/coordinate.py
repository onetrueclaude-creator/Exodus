"""Coordinate model and deterministic star system generation."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass

from agentic.params import MAX_PLANETS_PER_SYSTEM

# Default grid bounds — v3 uses dynamic bounds, no static GRID_MIN/MAX in params.
_DEFAULT_GRID_MIN = -3240
_DEFAULT_GRID_MAX = 3240


class GridBounds:
    """Dynamic grid bounds that can expand as territories grow."""

    def __init__(self, initial_min: int = _DEFAULT_GRID_MIN, initial_max: int = _DEFAULT_GRID_MAX):
        self.min_val = initial_min
        self.max_val = initial_max

    def contains(self, x: int, y: int) -> bool:
        return self.min_val <= x <= self.max_val and self.min_val <= y <= self.max_val

    def expand_to_contain(self, x: int, y: int) -> None:
        self.min_val = min(self.min_val, x, y)
        self.max_val = max(self.max_val, x, y)


# Global bounds instance — shared across the simulator
GLOBAL_BOUNDS = GridBounds()


@dataclass(frozen=True)
class GridCoordinate:
    """2D spatial coordinate on the galaxy grid.

    x, y validated against bounds (default: GLOBAL_BOUNDS).
    The z-axis (time) is the slot number from Record.birth_slot.
    """

    x: int
    y: int
    bounds: GridBounds | None = None

    def __post_init__(self):
        b = self.bounds or GLOBAL_BOUNDS
        if not (b.min_val <= self.x <= b.max_val):
            raise ValueError(f"x={self.x} out of range [{b.min_val}, {b.max_val}]")
        if not (b.min_val <= self.y <= b.max_val):
            raise ValueError(f"y={self.y} out of range [{b.min_val}, {b.max_val}]")

    def __hash__(self):
        return hash((self.x, self.y))

    def __eq__(self, other):
        if not isinstance(other, GridCoordinate):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    @property
    def x_offset(self) -> int:
        """Non-negative offset for Record.data encoding."""
        return self.x - GLOBAL_BOUNDS.min_val

    @property
    def y_offset(self) -> int:
        """Non-negative offset for Record.data encoding."""
        return self.y - GLOBAL_BOUNDS.min_val

    @classmethod
    def from_offsets(cls, x_offset: int, y_offset: int) -> GridCoordinate:
        """Create from Record.data offsets."""
        return cls(x=x_offset + GLOBAL_BOUNDS.min_val, y=y_offset + GLOBAL_BOUNDS.min_val)


def star_system_seed(x: int, y: int) -> bytes:
    """Deterministic 32-byte seed for a star system at (x, y)."""
    return hashlib.sha256(f"starsystem:{x}:{y}".encode()).digest()


def resource_density(x: int, y: int) -> float:
    """Resource density at (x, y), range [0.0, 1.0]. Deterministic."""
    seed = star_system_seed(x, y)
    return int.from_bytes(seed[:4], "big") / 0xFFFFFFFF


def storage_slots(x: int, y: int) -> int:
    """Number of planet storage slots at (x, y). Range [1, MAX_PLANETS_PER_SYSTEM]."""
    density = resource_density(x, y)
    return max(1, round(density * MAX_PLANETS_PER_SYSTEM))
