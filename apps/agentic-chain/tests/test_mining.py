"""Tests for v3 MiningEngine — no CommunityPool, hardness-based rewards only."""
import pytest
from agentic.galaxy.mining import MiningEngine
from agentic.galaxy.coordinate import resource_density


def _make_coord(x, y):
    """Helper to create a coordinate-like object."""
    class Coord:
        def __init__(self, x, y):
            self.x = x
            self.y = y
    return Coord(x, y)


def test_mining_engine_no_pool():
    engine = MiningEngine()
    assert engine.total_blocks_processed == 0
    assert engine.total_rewards_distributed == 0.0


def test_mining_no_community_pool_class():
    import agentic.galaxy.mining as m
    assert not hasattr(m, 'CommunityPool'), "CommunityPool removed in v3"


def test_mining_empty_claims():
    engine = MiningEngine()
    yields = engine.compute_block_yields([])
    assert yields == {}
    assert engine.total_blocks_processed == 1


def test_mining_zero_stake():
    engine = MiningEngine()
    coord = _make_coord(0, 0)
    claims = [{"owner": b"alice", "coordinate": coord, "stake": 0}]
    yields = engine.compute_block_yields(claims)
    assert yields == {}


def test_mining_yields_without_tracker():
    engine = MiningEngine()
    coord = _make_coord(0, 0)
    claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
    yields = engine.compute_block_yields(claims)
    assert b"alice" in yields
    density = resource_density(0, 0)
    from agentic.params import BASE_MINING_RATE_PER_BLOCK
    # No tracker = hardness 1
    expected = BASE_MINING_RATE_PER_BLOCK * density * 1.0 / 1
    assert abs(yields[b"alice"] - expected) < 1e-10


def test_mining_yields_with_epoch_tracker():
    engine = MiningEngine()

    class MockTracker:
        current_ring = 1
        def hardness(self, ring):
            return 16 * ring
        def record_mined(self, amount):
            return []

    tracker = MockTracker()
    coord = _make_coord(0, 0)
    claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
    yields = engine.compute_block_yields(claims, epoch_tracker=tracker)
    assert b"alice" in yields
    density = resource_density(0, 0)
    from agentic.params import BASE_MINING_RATE_PER_BLOCK
    expected = BASE_MINING_RATE_PER_BLOCK * density * 1.0 / 16
    assert abs(yields[b"alice"] - expected) < 1e-10


def test_mining_multiple_claimers():
    engine = MiningEngine()
    coord = _make_coord(0, 0)  # same coordinate so density is equal
    claims = [
        {"owner": b"alice", "coordinate": coord, "stake": 300},
        {"owner": b"bob", "coordinate": coord, "stake": 100},
    ]
    yields = engine.compute_block_yields(claims)
    # Alice has 75% stake weight, Bob has 25% — same density
    assert yields[b"alice"] > yields[b"bob"]
    ratio = yields[b"alice"] / yields[b"bob"]
    assert abs(ratio - 3.0) < 0.01


def test_total_rewards_accumulate():
    engine = MiningEngine()
    coord = _make_coord(0, 0)
    claims = [{"owner": b"alice", "coordinate": coord, "stake": 100}]
    engine.compute_block_yields(claims)
    engine.compute_block_yields(claims)
    assert engine.total_blocks_processed == 2
    assert engine.total_rewards_distributed > 0
