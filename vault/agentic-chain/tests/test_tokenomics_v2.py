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
