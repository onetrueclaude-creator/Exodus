"""Staking registry and cooldown management.

NOT cryptographically secure -- prototype only.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from agentic.params import SLOTS_PER_EPOCH


WARMUP_EPOCHS = 1     # epochs before new stake earns rewards
COOLDOWN_EPOCHS = 2   # epochs before unstaked tokens are released


class StakeStatus(Enum):
    WARMUP = "warmup"
    ACTIVE = "active"
    COOLDOWN = "cooldown"
    RELEASED = "released"


@dataclass
class StakeEntry:
    """A single staking position."""

    staker: bytes
    validator_id: int
    amount: int
    start_epoch: int
    status: StakeStatus = StakeStatus.WARMUP
    cooldown_start_epoch: int | None = None


class StakeRegistry:
    """Tracks all staking positions and handles lifecycle."""

    def __init__(self):
        self._entries: list[StakeEntry] = []

    def register_stake(self, staker: bytes, validator_id: int, amount: int, epoch: int) -> StakeEntry:
        entry = StakeEntry(staker=staker, validator_id=validator_id, amount=amount, start_epoch=epoch)
        self._entries.append(entry)
        return entry

    def begin_unstake(self, staker: bytes, validator_id: int, amount: int, epoch: int) -> StakeEntry | None:
        """Begin cooldown for an active stake. Returns the entry if found."""
        for entry in self._entries:
            if (entry.staker == staker and entry.validator_id == validator_id
                    and entry.status == StakeStatus.ACTIVE and entry.amount >= amount):
                if entry.amount == amount:
                    entry.status = StakeStatus.COOLDOWN
                    entry.cooldown_start_epoch = epoch
                else:
                    # Partial unstake: split entry
                    entry.amount -= amount
                    new_entry = StakeEntry(
                        staker=staker, validator_id=validator_id, amount=amount,
                        start_epoch=entry.start_epoch, status=StakeStatus.COOLDOWN,
                        cooldown_start_epoch=epoch,
                    )
                    self._entries.append(new_entry)
                    return new_entry
                return entry
        return None

    def advance_epoch(self, current_epoch: int) -> list[StakeEntry]:
        """Advance epoch: promote warmup->active, release cooldowns. Returns released entries."""
        released = []
        for entry in self._entries:
            if entry.status == StakeStatus.WARMUP and (current_epoch - entry.start_epoch) >= WARMUP_EPOCHS:
                entry.status = StakeStatus.ACTIVE
            elif entry.status == StakeStatus.COOLDOWN and entry.cooldown_start_epoch is not None:
                if (current_epoch - entry.cooldown_start_epoch) >= COOLDOWN_EPOCHS:
                    entry.status = StakeStatus.RELEASED
                    released.append(entry)
        # Remove released entries
        self._entries = [e for e in self._entries if e.status != StakeStatus.RELEASED]
        return released

    def get_active_stake(self, validator_id: int) -> int:
        """Total active stake for a validator."""
        return sum(e.amount for e in self._entries if e.validator_id == validator_id and e.status == StakeStatus.ACTIVE)

    def get_total_staked(self) -> int:
        """Total tokens currently staked (active + warmup)."""
        return sum(e.amount for e in self._entries if e.status in (StakeStatus.ACTIVE, StakeStatus.WARMUP))

    def get_staker_positions(self, staker: bytes) -> list[StakeEntry]:
        """All positions for a staker."""
        return [e for e in self._entries if e.staker == staker]

    @property
    def entries(self) -> list[StakeEntry]:
        return list(self._entries)
