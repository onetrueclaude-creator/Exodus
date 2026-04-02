"""Tests for galaxy grid parameters — v2 organic growth model."""
import pytest


class TestGalaxyParams:
    def test_block_time_one_minute(self):
        from agentic.params import BLOCK_TIME_MS
        assert BLOCK_TIME_MS == 60_000

    def test_genesis_supply(self):
        """v2: No fixed GRID_MIN/GRID_MAX or TOTAL_SUPPLY.
        Grid is dynamic; supply starts at GENESIS_SUPPLY (900)."""
        from agentic.params import GENESIS_SUPPLY
        assert GENESIS_SUPPLY == 900

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

    def test_merkle_depth_large_enough(self):
        """Merkle tree depth must support at least genesis supply (and much more)."""
        from agentic.params import MERKLE_TREE_DEPTH, GENESIS_SUPPLY
        capacity = 2 ** MERKLE_TREE_DEPTH
        assert capacity >= GENESIS_SUPPLY, (
            f"Merkle depth {MERKLE_TREE_DEPTH} only supports {capacity} leaves, "
            f"need at least {GENESIS_SUPPLY}"
        )

    def test_faction_distribution_sums_to_one(self):
        from agentic.params import (
            DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL,
        )
        total = DIST_COMMUNITY + DIST_MACHINES + DIST_FOUNDERS + DIST_PROFESSIONAL
        assert abs(total - 1.0) < 1e-9
