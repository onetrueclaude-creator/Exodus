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
        from agentic.params import BASE_MINING_RATE_PER_BLOCK
        pool = CommunityPool()
        engine = MiningEngine(pool)
        coord = GridCoordinate(x=0, y=0)
        claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
        rewards = engine.compute_block_yields(claims)
        assert b"alice" in rewards
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
