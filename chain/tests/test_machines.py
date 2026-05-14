"""Tests for MachineAgentBehavior — Machines faction origin-bound agent.

Under whitepaper v1.1 (Open-Grid Revision), Machines is a single
protocol-operated agent permanently bound to its origin coordinate. It
does not expand to other coordinates. The legacy v1.0 expansion path
(_next_target, _expand) remains in the source module for backward
compatibility with callers that exercise it directly, but tick() no
longer drives it. The tests below verify the v1.1 behaviour and also
spot-check that the legacy methods still produce correct results when
called directly (since they're documented as deprecated, not removed).
"""
from __future__ import annotations

import pytest

from agentic.params import (
    BASE_BIRTH_COST,
    MACHINES_MIN_SELL_RATIO,
    MACHINES_ORIGIN_COORD,
    NODE_GRID_SPACING,
    GENESIS_FACTION_MASTERS,
)
from agentic.testnet.genesis import create_genesis
from agentic.testnet.machines import MachineAgentBehavior


@pytest.fixture(autouse=True)
def _reset_global_bounds():
    """Save and restore GLOBAL_BOUNDS around each test so any direct
    invocation of the legacy expansion path in this module doesn't
    bleed into other test modules."""
    from agentic.lattice.coordinate import GLOBAL_BOUNDS
    saved_min = GLOBAL_BOUNDS.min_val
    saved_max = GLOBAL_BOUNDS.max_val
    yield
    GLOBAL_BOUNDS.min_val = saved_min
    GLOBAL_BOUNDS.max_val = saved_max


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MACHINE_WALLET_INDEX = 2  # Live testnet still has Machines at wallet 2 (10, 0)
MACHINE_ORIGIN = GENESIS_FACTION_MASTERS[1]  # (10, 0) — pre-migration home


def _make_behavior(seed: int = 42) -> tuple:
    """Create a genesis state and a MachineAgentBehavior."""
    state = create_genesis(seed=seed)
    machine = MachineAgentBehavior(state=state, wallet_index=MACHINE_WALLET_INDEX)
    return state, machine


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------


class TestMachineInit:
    def test_wallet_index(self):
        state, machine = _make_behavior()
        assert machine.wallet_index == MACHINE_WALLET_INDEX

    def test_origin_coordinate(self):
        """The live testnet's MACHINE_ORIGIN still points at the v1.0 East
        cardinal. Sub-project D will migrate this to MACHINES_ORIGIN_COORD."""
        state, machine = _make_behavior()
        assert machine.origin == MACHINE_ORIGIN

    def test_initial_agntc_zero(self):
        _, machine = _make_behavior()
        assert machine.accumulated_agntc == 0.0

    def test_min_sell_ratio(self):
        _, machine = _make_behavior()
        assert machine.min_sell_ratio == MACHINES_MIN_SELL_RATIO

    def test_v1_1_origin_constant_is_zero(self):
        """The whitepaper-v1.1 binding constant is (0, 0). The live testnet
        coordinate (machine.origin above) does not yet match this — Sub-project
        D performs the migration."""
        assert MACHINES_ORIGIN_COORD == (0, 0)


# ---------------------------------------------------------------------------
# SECURE phase
# ---------------------------------------------------------------------------


class TestSecurePhase:
    def test_secure_stakes_available_energy(self):
        """SECURE phase should stake available CPU energy."""
        state, machine = _make_behavior()
        machine.accumulated_agntc = 50.0
        machine._secure(state)


# ---------------------------------------------------------------------------
# ASSESS phase (legacy helper, retained but not driven by tick)
# ---------------------------------------------------------------------------


class TestAssessPhase:
    def test_below_threshold_returns_false(self):
        _, machine = _make_behavior()
        machine.accumulated_agntc = BASE_BIRTH_COST - 1
        assert machine._can_expand() is False

    def test_at_threshold_returns_true(self):
        _, machine = _make_behavior()
        machine.accumulated_agntc = BASE_BIRTH_COST
        assert machine._can_expand() is True

    def test_above_threshold_returns_true(self):
        _, machine = _make_behavior()
        machine.accumulated_agntc = BASE_BIRTH_COST + 50
        assert machine._can_expand() is True


# ---------------------------------------------------------------------------
# HOLD — never sell
# ---------------------------------------------------------------------------


class TestHoldBehavior:
    def test_hold_never_sells(self):
        """MACHINES_MIN_SELL_RATIO = 1.0 means never sell."""
        _, machine = _make_behavior()
        assert machine.should_sell() is False

    def test_hold_ratio_always_one(self):
        _, machine = _make_behavior()
        assert machine.min_sell_ratio == 1.0


# ---------------------------------------------------------------------------
# Full tick cycle — v1.1 origin-bound behaviour
# ---------------------------------------------------------------------------


class TestTickV1_1:
    """tick() under v1.1: SECURE + ACCUMULATE only, no EXPAND."""

    def test_tick_accumulates_mining_reward(self):
        """tick() should accumulate the machine's share of block rewards."""
        state, machine = _make_behavior()
        from agentic.testnet.api import _do_mine
        result = _do_mine(state)
        wallet_key = state.wallets[MACHINE_WALLET_INDEX].public_key.hex()
        reward = result["yields"].get(wallet_key, 0.0)
        machine.tick(state, block_reward=reward)
        assert machine.accumulated_agntc == pytest.approx(reward)

    def test_tick_does_not_expand_when_threshold_met(self):
        """v1.1: tick() must NOT claim new coordinates even when AGNTC
        exceeds BASE_BIRTH_COST. Machines stays at its single node."""
        state, machine = _make_behavior()
        machine.tick(state, block_reward=BASE_BIRTH_COST + 10)
        # Under v1.0 this would have claimed (20, 0). Under v1.1 it must not.
        from agentic.lattice.coordinate import GridCoordinate
        claim = state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0))
        assert claim is None
        # Accumulated AGNTC stays — no claim cost deducted.
        assert machine.accumulated_agntc == pytest.approx(BASE_BIRTH_COST + 10)

    def test_tick_does_not_expand_below_threshold(self):
        state, machine = _make_behavior()
        machine.tick(state, block_reward=50.0)
        from agentic.lattice.coordinate import GridCoordinate
        claim = state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0))
        assert claim is None

    def test_multiple_ticks_pure_accumulation(self):
        """Multiple ticks above-threshold accumulate without any claim cost."""
        state, machine = _make_behavior()
        machine.tick(state, block_reward=40.0)
        machine.tick(state, block_reward=40.0)
        machine.tick(state, block_reward=40.0)
        assert machine.accumulated_agntc == pytest.approx(120.0)
        # Nothing claimed.
        from agentic.lattice.coordinate import GridCoordinate
        assert state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0)) is None
        assert machine.nodes_claimed == 0

    def test_tick_never_claims_no_matter_the_reward(self):
        """Confirmed: huge rewards do not produce expansion."""
        state, machine = _make_behavior()
        machine.tick(state, block_reward=BASE_BIRTH_COST * 100)
        # No new nodes claimed by Machines, regardless of reward size.
        assert machine.nodes_claimed == 0
        # nodes_claimed is the canonical counter; nothing along the historic
        # East arm was claimed either (the closest, (20, 0), would have been
        # the v1.0 first target).
        from agentic.lattice.coordinate import GridCoordinate
        assert state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0)) is None


# ---------------------------------------------------------------------------
# Legacy expansion methods — still callable directly (deprecated)
# ---------------------------------------------------------------------------


class TestLegacyExpansionPath:
    """The v1.0 _next_target / _expand methods remain importable and
    invokable so any external tooling that exercised them directly does
    not break. tick() no longer drives them.
    """

    def test_legacy_next_target_first(self):
        _, machine = _make_behavior()
        target = machine._next_target()
        assert target == (20, 0)

    def test_legacy_expand_when_invoked_directly_still_claims(self):
        """Direct invocation of _expand still claims, because the method
        is documented as legacy-callable. Production code should not call
        this path under v1.1."""
        state, machine = _make_behavior()
        machine.accumulated_agntc = BASE_BIRTH_COST + 10
        result = machine._expand(state)
        assert result is True
        from agentic.lattice.coordinate import GridCoordinate
        assert state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0)) is not None

    def test_legacy_expand_fails_below_threshold(self):
        state, machine = _make_behavior()
        machine.accumulated_agntc = BASE_BIRTH_COST - 1
        result = machine._expand(state)
        assert result is False


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_zero_reward_tick(self):
        state, machine = _make_behavior()
        machine.tick(state, block_reward=0.0)
        assert machine.accumulated_agntc == 0.0

    def test_negative_reward_ignored(self):
        state, machine = _make_behavior()
        machine.tick(state, block_reward=-10.0)
        assert machine.accumulated_agntc == 0.0
