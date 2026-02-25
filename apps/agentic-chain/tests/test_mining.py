"""Tests for community pool and mining engine."""
import pytest


class TestCommunityPool:
    def test_initial_balance(self):
        from agentic.galaxy.mining import CommunityPool
        pool = CommunityPool()
        assert pool.remaining == 16_800_000.0

    def test_withdraw(self):
        from agentic.galaxy.mining import CommunityPool
        pool = CommunityPool()
        taken = pool.withdraw(100.0)
        assert taken == 100.0
        assert pool.remaining == 16_800_000.0 - 100.0

    def test_withdraw_capped_at_remaining(self):
        from agentic.galaxy.mining import CommunityPool
        pool = CommunityPool()
        pool._remaining = 50.0
        taken = pool.withdraw(100.0)
        assert taken == 50.0
        assert pool.remaining == 0.0

    def test_is_exhausted(self):
        from agentic.galaxy.mining import CommunityPool
        pool = CommunityPool()
        assert not pool.is_exhausted
        pool._remaining = 0.0
        assert pool.is_exhausted

    def test_pool_fraction(self):
        from agentic.galaxy.mining import CommunityPool
        pool = CommunityPool()
        assert pool.fraction_remaining == 1.0
        pool._remaining = 8_400_000.0
        assert abs(pool.fraction_remaining - 0.5) < 0.001

    def test_total_distributed(self):
        from agentic.galaxy.mining import CommunityPool
        pool = CommunityPool()
        pool.withdraw(1000.0)
        pool.withdraw(500.0)
        assert pool.total_distributed == 1500.0


class TestMiningEngine:
    def test_compute_yields_single_claim(self):
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate, resource_density
        pool = CommunityPool()
        engine = MiningEngine(pool)
        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
        rewards = engine.compute_block_yields(claims)
        assert b"alice" in rewards
        from agentic.params import BASE_MINING_RATE_PER_BLOCK
        expected = BASE_MINING_RATE_PER_BLOCK * resource_density(0, 0) * 1.0 * 1.0
        assert abs(rewards[b"alice"] - expected) < 0.001

    def test_compute_yields_multiple_claims(self):
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate
        pool = CommunityPool()
        engine = MiningEngine(pool)
        claims = [
            {"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100},
            {"owner": b"bob", "coordinate": GridCoordinate(x=10, y=10), "stake": 100},
        ]
        rewards = engine.compute_block_yields(claims)
        assert len(rewards) == 2
        assert rewards[b"alice"] > 0
        assert rewards[b"bob"] > 0

    def test_stake_weight_proportional(self):
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate
        pool = CommunityPool()
        engine = MiningEngine(pool)
        coord = GridCoordinate(x=50, y=50)
        claims = [
            {"owner": b"alice", "coordinate": coord, "stake": 300},
            {"owner": b"bob", "coordinate": coord, "stake": 100},
        ]
        rewards = engine.compute_block_yields(claims)
        assert rewards[b"alice"] > rewards[b"bob"]
        ratio = rewards[b"alice"] / rewards[b"bob"]
        assert abs(ratio - 3.0) < 0.01

    def test_pool_depletion(self):
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate
        pool = CommunityPool()
        pool._remaining = 0.5
        engine = MiningEngine(pool)
        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
        rewards = engine.compute_block_yields(claims)
        assert rewards[b"alice"] <= 0.5
        assert pool.remaining >= 0.0

    def test_exhausted_pool_yields_zero(self):
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate
        pool = CommunityPool()
        pool._remaining = 0.0
        engine = MiningEngine(pool)
        claims = [{"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]
        rewards = engine.compute_block_yields(claims)
        assert rewards.get(b"alice", 0.0) == 0.0

    def test_no_claims_no_rewards(self):
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        pool = CommunityPool()
        engine = MiningEngine(pool)
        rewards = engine.compute_block_yields([])
        assert rewards == {}

    def test_cumulative_rewards_tracked(self):
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate
        pool = CommunityPool()
        engine = MiningEngine(pool)
        claims = [{"owner": b"alice", "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]
        engine.compute_block_yields(claims)
        engine.compute_block_yields(claims)
        assert engine.total_blocks_processed == 2
        assert engine.total_rewards_distributed > 0

    def test_epoch_hardness_halves_yield_at_ring_2(self):
        """Ring-2 epoch hardness (2) should halve yield compared to ring-1 (1)."""
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate
        from agentic.galaxy.epoch import EpochTracker

        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]

        # Ring 1: hardness = 1 (no divisor effect)
        pool1 = CommunityPool()
        engine1 = MiningEngine(pool1)
        tracker1 = EpochTracker(genesis_ring=1)
        rewards1 = engine1.compute_block_yields(claims, epoch_tracker=tracker1)
        yield_ring1 = rewards1[b"alice"]

        # Ring 2: hardness = 2 (yield should be halved)
        pool2 = CommunityPool()
        engine2 = MiningEngine(pool2)
        tracker2 = EpochTracker(genesis_ring=2)
        rewards2 = engine2.compute_block_yields(claims, epoch_tracker=tracker2)
        yield_ring2 = rewards2[b"alice"]

        assert yield_ring1 > 0
        assert yield_ring2 > 0
        ratio = yield_ring1 / yield_ring2
        assert abs(ratio - 2.0) < 0.01, f"Expected ratio ~2.0, got {ratio}"

    def test_epoch_tracker_updated_after_block(self):
        """compute_block_yields should call epoch_tracker.record_mined() with actual total."""
        from agentic.galaxy.mining import MiningEngine, CommunityPool
        from agentic.galaxy.coordinate import GridCoordinate
        from agentic.galaxy.epoch import EpochTracker

        pool = CommunityPool()
        engine = MiningEngine(pool)
        tracker = EpochTracker(genesis_ring=1)
        assert tracker.total_mined == 0.0

        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
        engine.compute_block_yields(claims, epoch_tracker=tracker)

        assert tracker.total_mined > 0, "EpochTracker.total_mined should be > 0 after mining"
