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


def test_v1_legacy_constants_are_shims():
    """Legacy v1 constants exist as compatibility shims but have v3-appropriate values."""
    import agentic.params as p
    # Orderer role retired — share is 0%
    assert p.REWARD_SPLIT_ORDERER == 0.00
    # v3 uses GENESIS_SUPPLY (900), not v1's TOTAL_SUPPLY
    assert p.GENESIS_SUPPLY == 900
    # Legacy shims exist for backward compat with simulation/visualization code
    assert hasattr(p, 'TOTAL_SUPPLY')
    assert hasattr(p, 'GRID_MIN')
    assert hasattr(p, 'GRID_MAX')


def test_v3_genesis_supply():
    from agentic.params import GENESIS_SUPPLY
    assert GENESIS_SUPPLY == 900
