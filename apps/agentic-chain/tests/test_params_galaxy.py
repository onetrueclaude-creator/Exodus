"""Tests for galaxy grid parameters."""
import pytest


class TestGalaxyParams:
    def test_block_time_one_minute(self):
        from agentic.params import BLOCK_TIME_MS
        assert BLOCK_TIME_MS == 60_000

    def test_grid_bounds(self):
        from agentic.params import GRID_MIN, GRID_MAX
        assert GRID_MIN == -3240
        assert GRID_MAX == 3240

    def test_grid_covers_42m_coordinates(self):
        from agentic.params import GRID_MIN, GRID_MAX, TOTAL_SUPPLY
        size = GRID_MAX - GRID_MIN + 1
        total_coords = size * size
        assert total_coords >= TOTAL_SUPPLY  # 6481^2 = 42,003,361 >= 42,000,000

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

    def test_merkle_depth_supports_42m(self):
        from agentic.params import MERKLE_TREE_DEPTH, TOTAL_SUPPLY
        capacity = 2 ** MERKLE_TREE_DEPTH
        assert capacity >= TOTAL_SUPPLY, (
            f"Merkle depth {MERKLE_TREE_DEPTH} only supports {capacity} leaves, "
            f"need {TOTAL_SUPPLY}"
        )
