"""CoordinateAllocator — ring-based territory expansion from home star."""
from __future__ import annotations

from agentic.galaxy.coordinate import GridCoordinate, GridBounds, GLOBAL_BOUNDS
from agentic.galaxy.claims import ClaimRegistry


class CoordinateAllocator:
    """Finds next available coordinate expanding outward from a home star.

    Searches concentric rings (Chebyshev distance) around the home coordinate.
    Ring N contains all cells at Chebyshev distance N from home, i.e. the border
    of a (2N+1)x(2N+1) square minus the (2N-1)x(2N-1) interior.
    Ring 1: 8 cells, Ring 2: 16 cells, Ring N: 8*N cells.
    """

    def next_coordinate(
        self,
        home: GridCoordinate,
        claim_registry: ClaimRegistry,
        bounds: GridBounds | None = None,
    ) -> tuple[GridCoordinate, int]:
        """Find next available coordinate expanding from home star.

        Returns (coordinate, ring_number) where ring_number determines cost.
        """
        b = bounds or GLOBAL_BOUNDS
        ring = 1
        max_rings = 1000

        while ring <= max_rings:
            for coord in self._ring_coords(home, ring, b):
                if claim_registry.get_claim_at(coord) is None:
                    return coord, ring
            ring += 1

        raise RuntimeError(f"No available coordinate found within {max_rings} rings")

    def _ring_coords(
        self, home: GridCoordinate, ring: int, bounds: GridBounds,
    ) -> list[GridCoordinate]:
        """Generate all coordinates at Chebyshev distance `ring` from home.

        Ring N has 8*N cells (the border of a (2N+1)x(2N+1) square minus
        the (2N-1)x(2N-1) interior).
        """
        coords = []
        cx, cy = home.x, home.y

        # Top and bottom rows of the ring
        for dx in range(-ring, ring + 1):
            for dy_val in [ring, -ring]:
                px, py = cx + dx, cy + dy_val
                if not bounds.contains(px, py):
                    bounds.expand_to_contain(px, py)
                try:
                    coords.append(GridCoordinate(x=px, y=py, bounds=bounds))
                except ValueError:
                    continue

        # Left and right columns (excluding corners already added)
        for dy in range(-ring + 1, ring):
            for dx_val in [ring, -ring]:
                px, py = cx + dx_val, cy + dy
                if not bounds.contains(px, py):
                    bounds.expand_to_contain(px, py)
                try:
                    coords.append(GridCoordinate(x=px, y=py, bounds=bounds))
                except ValueError:
                    continue

        return coords
