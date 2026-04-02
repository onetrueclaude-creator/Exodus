"""Tests for mining engine — v2 organic growth model (no CommunityPool)."""
import pytest


class TestMiningEngine:
    def test_compute_yields_single_claim(self):
        from agentic.galaxy.mining import MiningEngine, _BLOCKS_PER_YEAR
        from agentic.galaxy.coordinate import GridCoordinate, resource_density
        from agentic.params import BASE_MINING_RATE_PER_BLOCK, GENESIS_SUPPLY, ANNUAL_INFLATION_CEILING
        engine = MiningEngine()
        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
        rewards = engine.compute_block_yields(claims)
        assert b"alice" in rewards
        # Raw formula: BASE_RATE * density * stake_weight (no hardness without epoch_tracker)
        raw_expected = BASE_MINING_RATE_PER_BLOCK * resource_density(0, 0) * 1.0
        # Inflation ceiling caps per-block yield
        max_per_block = GENESIS_SUPPLY * ANNUAL_INFLATION_CEILING / _BLOCKS_PER_YEAR
        expected = min(raw_expected, max_per_block)
        assert abs(rewards[b"alice"] - expected) < 0.001

    def test_compute_yields_multiple_claims(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.galaxy.coordinate import GridCoordinate
        engine = MiningEngine()
        claims = [
            {"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100},
            {"owner": b"bob", "coordinate": GridCoordinate(x=10, y=10), "stake": 100},
        ]
        rewards = engine.compute_block_yields(claims)
        assert len(rewards) == 2
        assert rewards[b"alice"] > 0
        assert rewards[b"bob"] > 0

    def test_stake_weight_proportional(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.galaxy.coordinate import GridCoordinate
        engine = MiningEngine()
        coord = GridCoordinate(x=0, y=0)
        claims = [
            {"owner": b"alice", "coordinate": coord, "stake": 300},
            {"owner": b"bob", "coordinate": coord, "stake": 100},
        ]
        rewards = engine.compute_block_yields(claims)
        assert rewards[b"alice"] > rewards[b"bob"]
        ratio = rewards[b"alice"] / rewards[b"bob"]
        assert abs(ratio - 3.0) < 0.01

    def test_no_claims_no_rewards(self):
        from agentic.galaxy.mining import MiningEngine
        engine = MiningEngine()
        rewards = engine.compute_block_yields([])
        assert rewards == {}

    def test_cumulative_rewards_tracked(self):
        from agentic.galaxy.mining import MiningEngine
        from agentic.galaxy.coordinate import GridCoordinate
        engine = MiningEngine()
        claims = [{"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]
        engine.compute_block_yields(claims)
        engine.compute_block_yields(claims)
        assert engine.total_blocks_processed == 2
        assert engine.total_rewards_distributed > 0

    def test_epoch_hardness_halves_yield_at_ring_2(self):
        """Ring-2 epoch hardness (32) should reduce yield vs ring-1 (16).

        Both raw yields exceed the inflation ceiling at genesis supply,
        so both get capped to the same ceiling value. To test the hardness
        ratio, we pre-seed total_rewards_distributed high enough that the
        ceiling is above the raw yield at ring-1.
        """
        from agentic.galaxy.mining import MiningEngine, _BLOCKS_PER_YEAR
        from agentic.galaxy.coordinate import GridCoordinate
        from agentic.galaxy.epoch import EpochTracker
        from agentic.params import ANNUAL_INFLATION_CEILING, BASE_MINING_RATE_PER_BLOCK

        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]

        # Pre-seed supply high enough that ceiling > raw ring-1 yield
        # Raw ring-1 yield ≈ 0.03125. Ceiling = supply * 0.05 / 525960.
        # Need supply * 0.05 / 525960 > 0.04 → supply > 420,768.
        high_supply = 500_000.0

        # Ring 1: hardness = 16 × 1 = 16
        engine1 = MiningEngine(total_rewards_distributed=high_supply)
        tracker1 = EpochTracker(genesis_ring=1)
        rewards1 = engine1.compute_block_yields(claims, epoch_tracker=tracker1)
        yield_ring1 = rewards1[b"alice"]

        # Ring 2: hardness = 16 × 2 = 32 (yield should be halved)
        engine2 = MiningEngine(total_rewards_distributed=high_supply)
        tracker2 = EpochTracker(genesis_ring=2)
        rewards2 = engine2.compute_block_yields(claims, epoch_tracker=tracker2)
        yield_ring2 = rewards2[b"alice"]

        assert yield_ring1 > 0
        assert yield_ring2 > 0
        ratio = yield_ring1 / yield_ring2
        assert abs(ratio - 2.0) < 0.01, f"Expected ratio ~2.0, got {ratio}"

    def test_epoch_tracker_updated_after_block(self):
        """compute_block_yields should call epoch_tracker.record_mined() with actual total."""
        from agentic.galaxy.mining import MiningEngine
        from agentic.galaxy.coordinate import GridCoordinate
        from agentic.galaxy.epoch import EpochTracker

        engine = MiningEngine()
        tracker = EpochTracker(genesis_ring=1)
        assert tracker.total_mined == 0.0

        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
        engine.compute_block_yields(claims, epoch_tracker=tracker)

        assert tracker.total_mined > 0, "EpochTracker.total_mined should be > 0 after mining"
