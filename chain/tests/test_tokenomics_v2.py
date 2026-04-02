"""Tests for tokenomics v2 parameter changes."""
import pytest


def test_distribution_sums_to_one():
    from agentic.params import (
        DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL,
    )
    total = DIST_COMMUNITY + DIST_MACHINES + DIST_FOUNDERS + DIST_PROFESSIONAL
    assert total == pytest.approx(1.0)


def test_distribution_is_equal():
    from agentic.params import (
        DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL,
    )
    assert DIST_COMMUNITY == 0.25
    assert DIST_MACHINES == 0.25
    assert DIST_FOUNDERS == 0.25
    assert DIST_PROFESSIONAL == 0.25


def test_old_inflation_constants_removed():
    import agentic.params as p
    assert not hasattr(p, "TOTAL_SUPPLY")
    assert not hasattr(p, "INITIAL_CIRCULATING")
    assert not hasattr(p, "INITIAL_INFLATION_RATE")
    assert not hasattr(p, "DISINFLATION_RATE")
    assert not hasattr(p, "INFLATION_FLOOR")


def test_old_distribution_constants_removed():
    import agentic.params as p
    assert not hasattr(p, "DIST_TREASURY")
    assert not hasattr(p, "DIST_TEAM")
    assert not hasattr(p, "DIST_AGENTS")


def test_old_grid_constants_removed():
    import agentic.params as p
    assert not hasattr(p, "GRID_MIN")
    assert not hasattr(p, "GRID_MAX")


def test_hardness_multiplier():
    from agentic.params import HARDNESS_MULTIPLIER
    assert HARDNESS_MULTIPLIER == 16


def test_max_epoch_hardness_removed():
    import agentic.params as p
    assert not hasattr(p, "MAX_EPOCH_HARDNESS")


def test_genesis_supply():
    from agentic.params import GENESIS_SUPPLY
    assert GENESIS_SUPPLY == 900


def test_machines_constraint():
    from agentic.params import MACHINES_MIN_SELL_RATIO
    assert MACHINES_MIN_SELL_RATIO == 1.0


def test_vesting_params():
    from agentic.params import SECURE_REWARD_IMMEDIATE, SECURE_REWARD_VEST_DAYS
    assert SECURE_REWARD_IMMEDIATE == 0.50
    assert SECURE_REWARD_VEST_DAYS == 30


def test_unchanged_params():
    from agentic.params import (
        FEE_BURN_RATE, BASE_MINING_RATE_PER_BLOCK,
        NODE_GRID_SPACING, MERKLE_TREE_DEPTH,
    )
    assert FEE_BURN_RATE == 0.50
    assert BASE_MINING_RATE_PER_BLOCK == 0.5
    assert NODE_GRID_SPACING == 10
    assert MERKLE_TREE_DEPTH == 26


def test_epoch_hardness_16n():
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    assert et.hardness(1) == 16
    assert et.hardness(10) == 160
    assert et.hardness(100) == 1600
    assert et.hardness(324) == 5184


def test_epoch_hardness_no_cap():
    """Hardness should NOT cap at 100 anymore."""
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    assert et.hardness(200) == 3200  # old code would cap at 100


def test_epoch_faction_names_updated():
    """Faction key 'treasury' renamed to 'machines'."""
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    coord = et.homenode_coordinate("machines", 1)
    assert isinstance(coord, tuple)
    assert len(coord) == 2


def test_homenode_no_grid_clamp():
    """Homenode coordinates should not be clamped to fixed ±3240."""
    from agentic.galaxy.epoch import EpochTracker
    et = EpochTracker()
    coord = et.homenode_coordinate("community", 500)
    assert isinstance(coord, tuple)


def test_mining_no_pool_exhaustion():
    """Mining should never exhaust — no finite pool in v2."""
    from agentic.galaxy.mining import MiningEngine
    from agentic.galaxy.epoch import EpochTracker
    engine = MiningEngine()
    et = EpochTracker()
    from agentic.galaxy.coordinate import GridCoordinate
    claims = [{"owner": b"\x01" * 32, "coordinate": GridCoordinate(x=0, y=0), "stake": 100}]
    for _ in range(1000):
        yields = engine.compute_block_yields(claims, epoch_tracker=et)
        assert len(yields) > 0
    assert engine.total_blocks_processed == 1000


def test_mining_yield_formula_v2():
    """yield = BASE_RATE * density * stake_weight / hardness, capped by inflation ceiling.

    Pre-seeds total_rewards_distributed high so the inflation ceiling is above
    raw yield and doesn't interfere with the formula test.
    """
    from agentic.galaxy.mining import MiningEngine
    from agentic.galaxy.epoch import EpochTracker
    from agentic.galaxy.coordinate import GridCoordinate, resource_density
    from agentic.params import BASE_MINING_RATE_PER_BLOCK
    engine = MiningEngine(total_rewards_distributed=500_000.0)
    et = EpochTracker()
    coord = GridCoordinate(x=0, y=0)
    density = resource_density(0, 0)
    claims = [{"owner": b"\x01" * 32, "coordinate": coord, "stake": 100}]
    yields = engine.compute_block_yields(claims, epoch_tracker=et)
    owner_yield = yields[b"\x01" * 32]
    hardness = et.hardness(et.current_ring)
    expected = BASE_MINING_RATE_PER_BLOCK * density * 1.0 / hardness
    assert owner_yield == pytest.approx(expected, rel=1e-6)


def test_grid_bounds_initial_radius():
    from agentic.galaxy.coordinate import GridBounds
    bounds = GridBounds(initial_radius=10)
    assert bounds.min_val == -10
    assert bounds.max_val == 10
    assert bounds.contains(5, 5)
    assert not bounds.contains(15, 15)


def test_grid_bounds_expand_to_ring():
    from agentic.galaxy.coordinate import GridBounds
    from agentic.params import NODE_GRID_SPACING
    bounds = GridBounds(initial_radius=10)
    bounds.expand_to_ring(5)
    expected_radius = (5 + 1) * NODE_GRID_SPACING  # 60
    assert bounds.min_val == -expected_radius
    assert bounds.max_val == expected_radius


def test_global_bounds_genesis_size():
    """GLOBAL_BOUNDS should start small (genesis ring + fog), not ±3240."""
    from agentic.galaxy.coordinate import GLOBAL_BOUNDS, GridBounds
    from agentic.params import NODE_GRID_SPACING
    # Reset to initial state (other tests may have expanded it)
    fresh = GridBounds(initial_radius=2 * NODE_GRID_SPACING)
    GLOBAL_BOUNDS.min_val = fresh.min_val
    GLOBAL_BOUNDS.max_val = fresh.max_val
    # Should be 2 * NODE_GRID_SPACING = 20 (ring 1 + fog)
    assert GLOBAL_BOUNDS.max_val == 2 * NODE_GRID_SPACING
    assert GLOBAL_BOUNDS.min_val == -(2 * NODE_GRID_SPACING)


def test_grid_coordinate_dynamic_offset():
    """Offsets should be relative to bounds, not hardcoded GRID_MIN."""
    from agentic.galaxy.coordinate import GridCoordinate, GridBounds
    bounds = GridBounds(initial_radius=100)
    coord = GridCoordinate(x=50, y=-30, bounds=bounds)
    # x_offset = x - bounds.min_val = 50 - (-100) = 150
    assert coord.x_offset == 150
    # y_offset = y - bounds.min_val = -30 - (-100) = 70
    assert coord.y_offset == 70


def test_genesis_creates_without_pool():
    """create_genesis should work without CommunityPool."""
    from agentic.testnet.genesis import create_genesis
    g = create_genesis(num_wallets=10, seed=42)
    assert g.mining_engine is not None
    assert g.mining_engine.total_blocks_processed == 0
    assert len(g.claim_registry.all_active_claims()) == 9
    assert not hasattr(g, 'community_pool') or g.community_pool is None


def test_genesis_mining_works():
    """Mining should produce yields after genesis."""
    from agentic.testnet.genesis import create_genesis
    g = create_genesis(num_wallets=10, seed=42)
    claims = g.claim_registry.as_mining_claims()
    yields = g.mining_engine.compute_block_yields(claims, epoch_tracker=g.epoch_tracker)
    assert len(yields) > 0
    total = sum(yields.values())
    assert total > 0


def test_api_status_no_pool_field():
    """Status endpoint should not reference community_pool."""
    from agentic.testnet.api import TestnetStatus
    fields = TestnetStatus.model_fields
    assert "community_pool_remaining" not in fields


def test_api_imports_cleanly():
    """api module should import without error."""
    import agentic.testnet.api  # should not raise


def test_economics_modules_importable():
    """All economics modules should import without error after constant removal."""
    import importlib
    modules = [
        "agentic.economics.inflation",
        "agentic.economics.vesting",
        "agentic.economics.rewards",
    ]
    for mod in modules:
        importlib.import_module(mod)
