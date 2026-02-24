"""Tests for CoordinateAllocator — ring-based territory expansion."""
import pytest
from agentic.galaxy.coordinate import GridCoordinate, GridBounds
from agentic.galaxy.claims import ClaimRegistry


class TestCoordinateAllocator:
    def _make_allocator(self):
        from agentic.galaxy.allocator import CoordinateAllocator
        return CoordinateAllocator()

    def test_first_allocation_ring_1(self):
        alloc = self._make_allocator()
        registry = ClaimRegistry()
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=b"alice", coordinate=home, stake=100, slot=0)
        coord, ring = alloc.next_coordinate(home, registry)
        assert ring == 1
        # Manhattan distance from home should be <= 2 (ring 1 cells)
        dist = abs(coord.x - home.x) + abs(coord.y - home.y)
        assert 1 <= dist <= 2

    def test_ring_1_has_8_slots(self):
        alloc = self._make_allocator()
        registry = ClaimRegistry()
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=b"alice", coordinate=home, stake=100, slot=0)
        coords = []
        for _ in range(8):
            coord, ring = alloc.next_coordinate(home, registry)
            assert ring == 1
            registry.register(owner=b"alice", coordinate=coord, stake=100, slot=0)
            coords.append(coord)
        assert len(set(coords)) == 8

    def test_expands_to_ring_2(self):
        alloc = self._make_allocator()
        registry = ClaimRegistry()
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=b"alice", coordinate=home, stake=100, slot=0)
        # Fill ring 1
        for _ in range(8):
            coord, _ = alloc.next_coordinate(home, registry)
            registry.register(owner=b"alice", coordinate=coord, stake=100, slot=0)
        # Next should be ring 2
        coord, ring = alloc.next_coordinate(home, registry)
        assert ring == 2

    def test_skips_occupied_coords(self):
        alloc = self._make_allocator()
        registry = ClaimRegistry()
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=b"alice", coordinate=home, stake=100, slot=0)
        registry.register(owner=b"bob", coordinate=GridCoordinate(x=1, y=0), stake=100, slot=0)
        registry.register(owner=b"bob", coordinate=GridCoordinate(x=0, y=1), stake=100, slot=0)
        coord, ring = alloc.next_coordinate(home, registry)
        assert ring == 1
        assert coord != GridCoordinate(x=1, y=0)
        assert coord != GridCoordinate(x=0, y=1)

    def test_ring_number_determines_cost(self):
        from agentic.params import BASE_BIRTH_COST
        alloc = self._make_allocator()
        registry = ClaimRegistry()
        home = GridCoordinate(x=0, y=0)
        registry.register(owner=b"alice", coordinate=home, stake=100, slot=0)
        _, ring = alloc.next_coordinate(home, registry)
        assert ring * BASE_BIRTH_COST == 100

    def test_near_grid_edge_expands_bounds(self):
        alloc = self._make_allocator()
        bounds = GridBounds(initial_min=-5, initial_max=5)
        registry = ClaimRegistry()
        home = GridCoordinate(x=5, y=5, bounds=bounds)
        registry.register(owner=b"alice", coordinate=home, stake=100, slot=0)
        coord, ring = alloc.next_coordinate(home, registry, bounds=bounds)
        assert bounds.contains(coord.x, coord.y)
