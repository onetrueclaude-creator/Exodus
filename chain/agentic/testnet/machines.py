"""MachineAgentBehavior — autonomous Machines faction expansion.

Each Machine agent runs a continuous loop per block tick:
1. SECURE — Stake available CPU Energy to earn AGNTC
2. ASSESS — Check accumulated AGNTC against deployment threshold
3. EXPAND — If threshold met, claim next unclaimed node on Machines arm (E)
4. HOLD — Never sell AGNTC (MACHINES_MIN_SELL_RATIO = 1.0)
"""
from __future__ import annotations

import random as _random

from agentic.consensus.validator import Validator
from agentic.lattice.coordinate import GridCoordinate, resource_density, storage_slots
from agentic.params import (
    BASE_BIRTH_COST,
    GENESIS_FACTION_MASTERS,
    MACHINES_MIN_SELL_RATIO,
    NODE_GRID_SPACING,
)
from agentic.verification.agent import AgentState, VerificationAgent


# Machine Faction Master is wallet index 2 in genesis topology:
#   index 0 = origin, index 1 = N faction, index 2 = E faction (Machines)
MACHINE_WALLET_INDEX = 2
MACHINE_ORIGIN = GENESIS_FACTION_MASTERS[1]  # (10, 0)
MACHINE_STEP = (NODE_GRID_SPACING, 0)        # East direction


class MachineAgentBehavior:
    """Autonomous behavior for the Machines faction.

    Accumulates AGNTC from block rewards and expands East along the
    Machines arm whenever it can afford BASE_BIRTH_COST.
    """

    def __init__(self, state, wallet_index: int = MACHINE_WALLET_INDEX):
        self.wallet_index = wallet_index
        self.origin = MACHINE_ORIGIN
        self.step = MACHINE_STEP
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
    #  ASSESS — check if we can afford expansion
    # ------------------------------------------------------------------ #

    def _can_expand(self) -> bool:
        """Return True if accumulated AGNTC >= BASE_BIRTH_COST."""
        return self.accumulated_agntc >= BASE_BIRTH_COST

    # ------------------------------------------------------------------ #
    #  EXPAND — claim next unclaimed node on the East arm
    # ------------------------------------------------------------------ #

    def _next_target(self) -> tuple[int, int]:
        """Find the next unclaimed coordinate along the East arm.

        Walks from origin + step, origin + 2*step, ... until finding
        an unclaimed coordinate. Expands global bounds as needed so
        GridCoordinate validation passes.
        """
        from agentic.lattice.coordinate import GLOBAL_BOUNDS

        state = self._state
        ox, oy = self.origin
        dx, dy = self.step
        n = 1
        while True:
            tx = ox + dx * n
            ty = oy + dy * n
            # Expand bounds to include this candidate
            GLOBAL_BOUNDS.expand_to_contain(tx, ty)
            coord = GridCoordinate(x=tx, y=ty)
            claim = state.claim_registry.get_claim_at(coord)
            if claim is None:
                return (tx, ty)
            n += 1
            # Safety: don't walk forever (in practice grid is bounded)
            if n > 1000:
                return (tx, ty)

    def _expand(self, state) -> bool:
        """Claim the next node on the Machines arm if we can afford it.

        Returns True if a node was claimed, False otherwise.
        """
        if not self._can_expand():
            return False

        tx, ty = self._next_target()
        coord = GridCoordinate(x=tx, y=ty)

        # Don't double-claim
        if state.claim_registry.get_claim_at(coord) is not None:
            return False

        wallet = state.wallets[self.wallet_index]
        stake = max(1, 100)
        slot = state.mining_engine.total_blocks_processed

        # Register claim
        state.claim_registry.register(
            owner=wallet.public_key,
            coordinate=coord,
            stake=stake,
            slot=slot,
        )

        # Create validator + verification agent for this claim
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

        # Store viewing key for reward minting
        state.viewing_keys[wallet.public_key] = wallet.viewing_key

        # Expand global bounds to include new coordinate
        from agentic.lattice.coordinate import GLOBAL_BOUNDS
        GLOBAL_BOUNDS.expand_to_contain(tx, ty)

        # Deduct cost
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
    #  TICK — full behavior loop per block
    # ------------------------------------------------------------------ #

    def tick(self, state, *, block_reward: float = 0.0) -> None:
        """Execute one behavior loop: SECURE → ASSESS → EXPAND → HOLD.

        Args:
            state: GenesisState
            block_reward: AGNTC earned from this block's mining rewards
        """
        # Accumulate reward (ignore negative)
        if block_reward > 0:
            self.accumulated_agntc += block_reward

        # SECURE phase (placeholder)
        self._secure(state)

        # ASSESS + EXPAND
        if self._can_expand():
            self._expand(state)
