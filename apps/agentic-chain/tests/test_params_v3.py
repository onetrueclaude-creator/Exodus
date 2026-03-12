"""Tests for v3 tokenomics parameters."""
import pytest


def test_v3_claim_constants_exist():
    from agentic.params import BASE_CLAIM_COST, BASE_CLAIM_CPU, MIN_CLAIM_COST, MIN_CLAIM_CPU
    assert BASE_CLAIM_COST == 10
    assert BASE_CLAIM_CPU == 100
    assert MIN_CLAIM_COST == 0.1
    assert MIN_CLAIM_CPU == 10


def test_v3_inflation_ceiling_exists():
    from agentic.params import ANNUAL_INFLATION_CEILING
    assert ANNUAL_INFLATION_CEILING == 0.05


def test_v3_machines_faction_constants():
    from agentic.params import MACHINES_SELL_POLICY, MACHINES_VOTING_POWER, MACHINES_AUTO_MINE
    from agentic.params import MACHINES_EMERGENCY_UNLOCK_THRESHOLD
    assert MACHINES_SELL_POLICY == "NEVER"
    assert MACHINES_VOTING_POWER == 0
    assert MACHINES_AUTO_MINE is True
    assert MACHINES_EMERGENCY_UNLOCK_THRESHOLD == 0.75


def test_v3_signup_bonus():
    from agentic.params import SIGNUP_BONUS_AGNTC
    assert SIGNUP_BONUS_AGNTC == 1


def test_v3_claim_requires_active_stake():
    from agentic.params import CLAIM_REQUIRES_ACTIVE_STAKE
    assert CLAIM_REQUIRES_ACTIVE_STAKE is True


def test_v3_faction_distribution_equal():
    from agentic.params import DIST_COMMUNITY, DIST_MACHINES, DIST_FOUNDERS, DIST_PROFESSIONAL
    assert DIST_COMMUNITY == 0.25
    assert DIST_MACHINES == 0.25
    assert DIST_FOUNDERS == 0.25
    assert DIST_PROFESSIONAL == 0.25


def test_v1_legacy_constants_removed():
    """Ensure legacy v1 constants no longer exist in params."""
    import agentic.params as p
    assert not hasattr(p, 'TOTAL_SUPPLY'), "TOTAL_SUPPLY should be removed (v1 legacy)"
    assert not hasattr(p, 'INITIAL_CIRCULATING'), "INITIAL_CIRCULATING should be removed"
    assert not hasattr(p, 'INITIAL_INFLATION_RATE'), "INITIAL_INFLATION_RATE should be removed"
    assert not hasattr(p, 'DISINFLATION_RATE'), "DISINFLATION_RATE should be removed"
    assert not hasattr(p, 'INFLATION_FLOOR'), "INFLATION_FLOOR should be removed"
    assert not hasattr(p, 'MAX_EPOCH_HARDNESS'), "MAX_EPOCH_HARDNESS should be removed"
    assert not hasattr(p, 'DIST_TREASURY'), "DIST_TREASURY should be removed"
    assert not hasattr(p, 'DIST_TEAM'), "DIST_TEAM should be removed"
    assert not hasattr(p, 'DIST_AGENTS'), "DIST_AGENTS should be removed"
    assert not hasattr(p, 'REWARD_SPLIT_ORDERER'), "REWARD_SPLIT_ORDERER should be removed (retired role)"
    assert not hasattr(p, 'GRID_MIN'), "GRID_MIN should be removed (dynamic bounds)"
    assert not hasattr(p, 'GRID_MAX'), "GRID_MAX should be removed (dynamic bounds)"


def test_v3_genesis_supply():
    from agentic.params import GENESIS_SUPPLY
    assert GENESIS_SUPPLY == 900
