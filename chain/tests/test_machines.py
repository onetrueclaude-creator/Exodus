"""Tests for MachineAgentBehavior — Machines faction auto-expansion."""
from __future__ import annotations

import pytest

from agentic.params import (
    BASE_BIRTH_COST,
    MACHINES_MIN_SELL_RATIO,
    NODE_GRID_SPACING,
    GENESIS_FACTION_MASTERS,
)
from agentic.testnet.genesis import create_genesis
from agentic.testnet.machines import MachineAgentBehavior


@pytest.fixture(autouse=True)
def _reset_global_bounds():
    """Save and restore GLOBAL_BOUNDS around each test so expansion
    in machine tests doesn't bleed into other test modules."""
    from agentic.lattice.coordinate import GLOBAL_BOUNDS
    saved_min = GLOBAL_BOUNDS.min_val
    saved_max = GLOBAL_BOUNDS.max_val
    yield
    GLOBAL_BOUNDS.min_val = saved_min
    GLOBAL_BOUNDS.max_val = saved_max


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MACHINE_WALLET_INDEX = 2  # Faction Master at (10, 0) = E arm
MACHINE_ORIGIN = GENESIS_FACTION_MASTERS[1]  # (10, 0)


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
        state, machine = _make_behavior()
        assert machine.origin == MACHINE_ORIGIN

    def test_direction_east(self):
        """Machines arm expands East: step = (+NODE_GRID_SPACING, 0)."""
        _, machine = _make_behavior()
        assert machine.step == (NODE_GRID_SPACING, 0)

    def test_initial_agntc_zero(self):
        _, machine = _make_behavior()
        assert machine.accumulated_agntc == 0.0

    def test_min_sell_ratio(self):
        _, machine = _make_behavior()
        assert machine.min_sell_ratio == MACHINES_MIN_SELL_RATIO


# ---------------------------------------------------------------------------
# SECURE phase
# ---------------------------------------------------------------------------


class TestSecurePhase:
    def test_secure_stakes_available_energy(self):
        """SECURE phase should stake available CPU energy."""
        state, machine = _make_behavior()
        # Machine wallet starts with 0 balance at genesis (GENESIS_BALANCE=0),
        # but mining distributes rewards. We simulate by giving it some AGNTC.
        machine.accumulated_agntc = 50.0
        # Secure should not fail even with 0 balance — it's a no-op
        machine._secure(state)
        # No crash = success; staking is a no-op when no energy available


# ---------------------------------------------------------------------------
# ASSESS phase
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
# EXPAND phase — next target coordinate
# ---------------------------------------------------------------------------


class TestExpandTarget:
    def test_first_expansion_target(self):
        """First unclaimed node East of (10,0) is (20,0)."""
        _, machine = _make_behavior()
        target = machine._next_target()
        assert target == (20, 0)

    def test_second_expansion_target(self):
        """After (20,0) is claimed, next target is (30,0)."""
        state, machine = _make_behavior()
        # Claim (20, 0) manually
        from agentic.lattice.coordinate import GridCoordinate
        wallet = state.wallets[MACHINE_WALLET_INDEX]
        coord = GridCoordinate(x=20, y=0)
        state.claim_registry.register(
            owner=wallet.public_key, coordinate=coord, stake=100, slot=0)
        target = machine._next_target()
        assert target == (30, 0)

    def test_skips_already_claimed_by_others(self):
        """If another wallet claims (20,0), machine skips to (30,0)."""
        state, machine = _make_behavior()
        other_wallet = state.wallets[5]  # some other wallet
        from agentic.lattice.coordinate import GridCoordinate
        coord = GridCoordinate(x=20, y=0)
        state.claim_registry.register(
            owner=other_wallet.public_key, coordinate=coord, stake=100, slot=0)
        target = machine._next_target()
        assert target == (30, 0)


# ---------------------------------------------------------------------------
# EXPAND phase — claim execution
# ---------------------------------------------------------------------------


class TestExpandClaim:
    def test_expand_claims_node(self):
        """When AGNTC >= BASE_BIRTH_COST, expand claims the next node."""
        state, machine = _make_behavior()
        machine.accumulated_agntc = BASE_BIRTH_COST + 10
        result = machine._expand(state)
        assert result is True
        # Check claim exists at (20, 0)
        from agentic.lattice.coordinate import GridCoordinate
        claim = state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0))
        assert claim is not None
        assert claim.owner == state.wallets[MACHINE_WALLET_INDEX].public_key

    def test_expand_deducts_cost(self):
        state, machine = _make_behavior()
        machine.accumulated_agntc = 150.0
        machine._expand(state)
        assert machine.accumulated_agntc == pytest.approx(50.0)

    def test_expand_creates_validator_and_agent(self):
        """Expansion should register a validator + verification agent."""
        state, machine = _make_behavior()
        validators_before = len(state.validators)
        agents_before = len(state.agents)
        machine.accumulated_agntc = BASE_BIRTH_COST
        machine._expand(state)
        assert len(state.validators) == validators_before + 1
        assert len(state.agents) == agents_before + 1

    def test_expand_fails_below_threshold(self):
        state, machine = _make_behavior()
        machine.accumulated_agntc = BASE_BIRTH_COST - 1
        result = machine._expand(state)
        assert result is False


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
# Full tick cycle
# ---------------------------------------------------------------------------


class TestTick:
    def test_tick_accumulates_mining_reward(self):
        """tick() should accumulate the machine's share of block rewards."""
        state, machine = _make_behavior()
        # Mine a block to produce yields
        from agentic.testnet.api import _do_mine
        result = _do_mine(state)
        # The machine wallet should have earned something
        wallet_key = state.wallets[MACHINE_WALLET_INDEX].public_key.hex()
        reward = result["yields"].get(wallet_key, 0.0)
        # Now tick with that reward
        machine.tick(state, block_reward=reward)
        assert machine.accumulated_agntc == pytest.approx(reward)

    def test_tick_expands_when_threshold_met(self):
        """tick() should auto-expand when accumulated AGNTC >= BASE_BIRTH_COST."""
        state, machine = _make_behavior()
        machine.tick(state, block_reward=BASE_BIRTH_COST + 10)
        from agentic.lattice.coordinate import GridCoordinate
        claim = state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0))
        assert claim is not None

    def test_tick_no_expand_below_threshold(self):
        state, machine = _make_behavior()
        machine.tick(state, block_reward=50.0)
        from agentic.lattice.coordinate import GridCoordinate
        claim = state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0))
        assert claim is None

    def test_multiple_ticks_accumulate(self):
        state, machine = _make_behavior()
        machine.tick(state, block_reward=40.0)
        machine.tick(state, block_reward=40.0)
        assert machine.accumulated_agntc == pytest.approx(80.0)
        # Still below threshold
        from agentic.lattice.coordinate import GridCoordinate
        assert state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0)) is None
        # Third tick pushes over
        machine.tick(state, block_reward=40.0)
        # 120 - 100 cost = 20 remaining
        assert machine.accumulated_agntc == pytest.approx(20.0)
        assert state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0)) is not None

    def test_sequential_expansions(self):
        """Machine should expand to (20,0) then (30,0) on successive thresholds."""
        state, machine = _make_behavior()
        machine.tick(state, block_reward=BASE_BIRTH_COST)
        machine.tick(state, block_reward=BASE_BIRTH_COST)
        from agentic.lattice.coordinate import GridCoordinate
        assert state.claim_registry.get_claim_at(GridCoordinate(x=20, y=0)) is not None
        assert state.claim_registry.get_claim_at(GridCoordinate(x=30, y=0)) is not None

    def test_nodes_claimed_count(self):
        _, machine = _make_behavior()
        assert machine.nodes_claimed == 0


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
