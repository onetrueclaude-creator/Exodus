"""Tests for galaxy grid parameters."""
import pytest


class TestGalaxyParams:
    def test_block_time_one_minute(self):
        from agentic.params import BLOCK_TIME_MS
        assert BLOCK_TIME_MS == 60_000

    def test_dynamic_grid_bounds(self):
        """Grid bounds are dynamic in v3 — no static GRID_MIN/MAX."""
        from agentic.galaxy.coordinate import GridBounds
        bounds = GridBounds(initial_min=-20, initial_max=20)
        assert bounds.contains(0, 0)
        assert not bounds.contains(100, 100)
        bounds.expand_to_contain(100, 100)
        assert bounds.contains(100, 100)

    def test_program_ids(self):
        from agentic.params import CLAIM_PROGRAM_ID, STORAGE_PROGRAM_ID
        assert isinstance(CLAIM_PROGRAM_ID, bytes)
        assert isinstance(STORAGE_PROGRAM_ID, bytes)

    def test_mining_rate(self):
        from agentic.params import BASE_MINING_RATE_PER_BLOCK
        assert BASE_MINING_RATE_PER_BLOCK > 0

    def test_planets(self):
        from agentic.params import MAX_PLANETS_PER_SYSTEM
        assert MAX_PLANETS_PER_SYSTEM == 10

    def test_energy_cost(self):
        from agentic.params import ENERGY_PER_CLAIM
        assert ENERGY_PER_CLAIM > 0

    def test_merkle_depth_sufficient(self):
        """Merkle tree depth 26 supports 67M+ leaves — plenty for any grid size."""
        from agentic.params import MERKLE_TREE_DEPTH
        capacity = 2 ** MERKLE_TREE_DEPTH
        assert capacity >= 67_000_000
