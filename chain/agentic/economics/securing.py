"""Securing registry — active CPU Energy commitments to chain validation.

Securing is DISTINCT from mining:
- Mining = block production (automated, earns block subsidy from new AGNTC minting)
- Securing = voluntary CPU commitment (user-initiated, earns from fee pool)

Each SecuringPosition represents a user committing CPU Energy for N block cycles
to help validate/protect the chain. Analogous to Bitcoin miners contributing
hashpower — you're putting resources at risk to secure the network.

NOT cryptographically secure -- prototype only.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import Enum

from agentic.params import (
    BASE_CPU_PER_SECURE_BLOCK,
    SECURE_REWARD_IMMEDIATE,
)
from agentic.lattice.coordinate import resource_density


class SecuringStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"


@dataclass
class SecuringPosition:
    """A single active securing commitment."""

    id: str
    wallet_index: int
    owner: bytes
    cpu_committed: float         # total CPU Energy locked for this position
    start_block: int             # first block of securing
    end_block: int               # block at which securing ends (exclusive)
    node_x: int                  # homenode coordinate (for density lookup)
    node_y: int                  # homenode coordinate
    density: float               # cached density at commitment time
    secured_blocks: int = 0      # blocks where CPU was active
    total_reward: float = 0.0    # cumulative AGNTC earned
    immediate_reward: float = 0.0  # liquid portion (50%)
    vesting_reward: float = 0.0    # vesting portion (50%)
    status: SecuringStatus = SecuringStatus.ACTIVE


class SecuringRegistry:
    """Tracks all securing positions and processes per-block rewards."""

    def __init__(self) -> None:
        self._positions: list[SecuringPosition] = []

    def create_position(
        self,
        wallet_index: int,
        owner: bytes,
        duration_blocks: int,
        current_block: int,
        node_x: int,
        node_y: int,
    ) -> SecuringPosition:
        """Create a new securing position.

        CPU cost is auto-calculated:
            cost = duration_blocks × BASE_CPU_PER_SECURE_BLOCK × density

        Returns the position. Caller is responsible for deducting CPU Energy.
        """
        density = resource_density(node_x, node_y)
        cpu_cost = duration_blocks * BASE_CPU_PER_SECURE_BLOCK * max(density, 0.1)

        pos = SecuringPosition(
            id=str(uuid.uuid4())[:8],
            wallet_index=wallet_index,
            owner=owner,
            cpu_committed=cpu_cost,
            start_block=current_block + 1,  # starts next block
            end_block=current_block + 1 + duration_blocks,
            node_x=node_x,
            node_y=node_y,
            density=density,
        )
        self._positions.append(pos)
        return pos

    def compute_cpu_cost(
        self, duration_blocks: int, node_x: int, node_y: int,
    ) -> tuple[float, float]:
        """Preview the CPU cost without creating a position.

        Returns (cpu_cost, density).
        """
        density = resource_density(node_x, node_y)
        cost = duration_blocks * BASE_CPU_PER_SECURE_BLOCK * max(density, 0.1)
        return cost, density

    def process_block(self, current_block: int, fee_pool_for_stakers: float, hardness: float) -> dict[bytes, float]:
        """Process one block: update active positions, distribute fee rewards.

        Args:
            current_block: the block just mined
            fee_pool_for_stakers: AGNTC from fees available to stakers this block
            hardness: current epoch hardness (divides base reward)

        Returns:
            dict mapping owner -> AGNTC reward earned this block from securing
        """
        total_active_cpu = self.total_active_cpu(current_block)
        rewards: dict[bytes, float] = {}

        for pos in self._positions:
            if pos.status != SecuringStatus.ACTIVE:
                continue

            # Check if this block falls within the position's range
            if current_block < pos.start_block:
                continue
            if current_block >= pos.end_block:
                pos.status = SecuringStatus.COMPLETED
                continue

            # This position is active for this block
            pos.secured_blocks += 1

            # Reward from fee pool, proportional to CPU share
            if total_active_cpu > 0 and fee_pool_for_stakers > 0:
                cpu_share = pos.cpu_committed / total_active_cpu
                reward = fee_pool_for_stakers * cpu_share
            else:
                reward = 0.0

            # Split into immediate and vesting
            immediate = reward * SECURE_REWARD_IMMEDIATE
            vesting = reward - immediate

            pos.total_reward += reward
            pos.immediate_reward += immediate
            pos.vesting_reward += vesting

            rewards[pos.owner] = rewards.get(pos.owner, 0.0) + immediate

        return rewards

    def total_active_cpu(self, current_block: int) -> float:
        """Sum of CPU committed across all active positions for a given block."""
        total = 0.0
        for pos in self._positions:
            if (pos.status == SecuringStatus.ACTIVE
                    and pos.start_block <= current_block < pos.end_block):
                total += pos.cpu_committed
        return total

    def get_cpu_for_owner(self, owner: bytes, current_block: int) -> float:
        """Total CPU committed by an owner in active positions."""
        total = 0.0
        for pos in self._positions:
            if (pos.owner == owner
                    and pos.status == SecuringStatus.ACTIVE
                    and pos.start_block <= current_block < pos.end_block):
                total += pos.cpu_committed
        return total

    def get_positions(self, wallet_index: int) -> list[SecuringPosition]:
        """All positions for a wallet (active + completed)."""
        return [p for p in self._positions if p.wallet_index == wallet_index]

    def get_secured_chains(self, wallet_index: int) -> int:
        """Total blocks secured across all positions for a wallet."""
        return sum(p.secured_blocks for p in self._positions if p.wallet_index == wallet_index)

    @property
    def positions(self) -> list[SecuringPosition]:
        return list(self._positions)
