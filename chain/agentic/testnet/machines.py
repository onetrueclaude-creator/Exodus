"""MachineAgentBehavior — Machines faction origin-bound autonomous agent.

Under whitepaper v1.1 (Open-Grid Revision), the Machines Faction is a
single protocol-operated agent permanently bound to the origin
coordinate. The agent does NOT expand to other coordinates: it
auto-secures CPU at its single node, accumulates AGNTC from origin's
mining yield, and never sells. See whitepaper §4.5 and §10.3.

Per-block loop (was 4 phases in v1.0, now 3):
1. SECURE — stake available CPU Energy at the agent's single node
2. ACCUMULATE — receive the agent's share of block rewards (never sells)
3. HOLD — MACHINES_MIN_SELL_RATIO = 1.0

The v1.0 EXPAND phase (claim a new coordinate East along the Machines
arm whenever accumulated AGNTC >= BASE_BIRTH_COST) is retired. Code
paths supporting expansion remain in the module for now to keep imports
stable for legacy tests, but tick() no longer calls them. See
deprecation notices on _next_target / _expand / _can_expand below.

Live-testnet migration note: the current testnet was bootstrapped under
v1.0 with the Machines wallet's home at GENESIS_FACTION_MASTERS[1] ==
(10, 0). The v1.1 spec binds Machines to MACHINES_ORIGIN_COORD == (0, 0).
Migration of the live testnet state (Sub-project D) is responsible for
re-homing Machines to (0, 0). Until that migration runs, MACHINE_ORIGIN
below still references the v1.0 home coordinate so the existing testnet
state remains internally consistent.
"""
from __future__ import annotations

import random as _random

from agentic.consensus.validator import Validator
from agentic.lattice.coordinate import GridCoordinate, resource_density, storage_slots
from agentic.params import (
    BASE_BIRTH_COST,
    GENESIS_FACTION_MASTERS,
    MACHINES_MIN_SELL_RATIO,
    MACHINES_ORIGIN_COORD,
    NODE_GRID_SPACING,
)
from agentic.verification.agent import AgentState, VerificationAgent


# Machine Faction Master is wallet index 2 in genesis topology:
#   index 0 = origin, index 1 = N faction, index 2 = E faction (Machines)
MACHINE_WALLET_INDEX = 2

# v1.0 testnet home — the East cardinal of ring 1. Retained as the operative
# coordinate until Sub-project D migrates the live testnet to MACHINES_ORIGIN_COORD.
MACHINE_ORIGIN = GENESIS_FACTION_MASTERS[1]  # (10, 0)

# [DEPRECATED v1.1] Direction used by the retired v1.0 EXPAND phase.
MACHINE_STEP = (NODE_GRID_SPACING, 0)


class MachineAgentBehavior:
    """Origin-bound autonomous behavior for the Machines faction.

    Accumulates AGNTC from block rewards earned at its single node.
    Under v1.1 the agent never expands beyond its current coordinate.

    Legacy v1.0 expansion methods (_next_target, _expand, _can_expand)
    remain defined but are no longer wired into tick().
    """

    def __init__(self, state, wallet_index: int = MACHINE_WALLET_INDEX):
        self.wallet_index = wallet_index
        self.origin = MACHINE_ORIGIN
        self.step = MACHINE_STEP  # retained for backward compat; not used
        self.min_sell_ratio = MACHINES_MIN_SELL_RATIO
        self.accumulated_agntc: float = 0.0
        self.nodes_claimed: int = 0
        self._state = state

    # ------------------------------------------------------------------ #
    #  SECURE — stake available CPU energy (no-op for now)
    # ------------------------------------------------------------------ #

    def _secure(self, state) -> None:
        """Stake available CPU energy. Currently a placeholder — the
        machine earns AGNTC through block mining rewards distributed
        by the MiningEngine."""
        pass

    # ------------------------------------------------------------------ #
    #  ASSESS — legacy v1.0 helper (no longer drives expansion)
    # ------------------------------------------------------------------ #

    def _can_expand(self) -> bool:
        """[DEPRECATED v1.1] Return True if accumulated AGNTC >= BASE_BIRTH_COST.

        Retained for backward compat with callers that inspect the agent's
        affordability. tick() no longer uses this method to gate expansion.
        """
        return self.accumulated_agntc >= BASE_BIRTH_COST

    # ------------------------------------------------------------------ #
    #  EXPAND — retired in v1.1
    # ------------------------------------------------------------------ #

    def _next_target(self) -> tuple[int, int]:
        """[DEPRECATED v1.1] Compute the next coordinate East along the
        Machines arm. Retained for any tooling that asks the agent where
        it *would* have expanded under v1.0 semantics. The result is not
        consumed by tick().
        """
        from agentic.lattice.coordinate import GLOBAL_BOUNDS

        state = self._state
        ox, oy = self.origin
        dx, dy = self.step
        n = 1
        while True:
            tx = ox + dx * n
            ty = oy + dy * n
            GLOBAL_BOUNDS.expand_to_contain(tx, ty)
            coord = GridCoordinate(x=tx, y=ty)
            claim = state.claim_registry.get_claim_at(coord)
            if claim is None:
                return (tx, ty)
            n += 1
            if n > 1000:
                return (tx, ty)

    def _expand(self, state) -> bool:
        """[DEPRECATED v1.1] Claim the next node on the Machines arm.

        The v1.1 spec states Machines does not expand beyond origin.
        tick() no longer calls this method. The implementation is
        preserved so that tests and external callers that previously
        exercised the v1.0 expansion path remain runnable, but new code
        should not invoke it.
        """
        if not self._can_expand():
            return False

        tx, ty = self._next_target()
        coord = GridCoordinate(x=tx, y=ty)

        if state.claim_registry.get_claim_at(coord) is not None:
            return False

        wallet = state.wallets[self.wallet_index]
        stake = max(1, 100)
        slot = state.mining_engine.total_blocks_processed

        state.claim_registry.register(
            owner=wallet.public_key,
            coordinate=coord,
            stake=stake,
            slot=slot,
        )

        vid = len(state.validators)
        rng_vpu = _random.Random(vid + 7)
        v = Validator(
            id=vid,
            token_stake=float(stake),
            cpu_vpu=float(rng_vpu.randint(20, 120)),
            online=True,
        )
        state.validators.append(v)
        agent = VerificationAgent(
            agent_id=f"verifier-{vid:03d}",
            validator_id=vid,
            vpu_capacity=v.cpu_vpu,
            registered_epoch=0,
            state=AgentState.ACTIVE,
        )
        state.agents.append(agent)

        state.viewing_keys[wallet.public_key] = wallet.viewing_key

        from agentic.lattice.coordinate import GLOBAL_BOUNDS
        GLOBAL_BOUNDS.expand_to_contain(tx, ty)

        self.accumulated_agntc -= BASE_BIRTH_COST
        self.nodes_claimed += 1
        return True

    # ------------------------------------------------------------------ #
    #  HOLD — never sell
    # ------------------------------------------------------------------ #

    def should_sell(self) -> bool:
        """Machines never sell AGNTC (min_sell_ratio = 1.0)."""
        return False

    # ------------------------------------------------------------------ #
    #  TICK — per-block behavior loop (v1.1: SECURE + ACCUMULATE, no EXPAND)
    # ------------------------------------------------------------------ #

    def tick(self, state, *, block_reward: float = 0.0) -> None:
        """Execute one v1.1 behavior loop: SECURE + ACCUMULATE (no EXPAND).

        Args:
            state: GenesisState
            block_reward: AGNTC earned from this block's mining rewards
        """
        if block_reward > 0:
            self.accumulated_agntc += block_reward

        # SECURE phase (placeholder)
        self._secure(state)

        # No EXPAND phase under v1.1. Machines remains origin-bound.
