"""Slashing mechanism for validator misbehavior."""
from __future__ import annotations
import math
from dataclasses import dataclass, field
from enum import Enum


class SlashReason(Enum):
    """Categories of slashable offenses per whitepaper."""
    FALSE_ATTESTATION = "false_attestation"          # submitting incorrect verification
    COMMITMENT_REVEAL_MISMATCH = "commitment_reveal"  # reveal doesn't match commitment
    DOUBLE_SIGNING = "double_signing"                 # signing conflicting blocks
    LIVENESS_FAILURE = "liveness_failure"              # offline too long
    INVALID_PROOF = "invalid_proof"                    # submitting invalid ZK proof


# Slash percentages of staked tokens
SLASH_RATES = {
    SlashReason.FALSE_ATTESTATION: 0.50,         # 50% -- severe
    SlashReason.COMMITMENT_REVEAL_MISMATCH: 0.25, # 25% -- severe
    SlashReason.DOUBLE_SIGNING: 1.00,             # 100% -- critical
    SlashReason.LIVENESS_FAILURE: 0.01,           # 1% per epoch offline
    SlashReason.INVALID_PROOF: 0.10,              # 10% -- moderate
}


@dataclass
class SlashEvent:
    """Record of a slashing event."""
    epoch: int
    validator_id: int
    reason: SlashReason
    amount_slashed: int
    burned: bool = True  # slashed tokens are burned per whitepaper


@dataclass
class SlashingRecord:
    """Cumulative slashing state."""
    events: list[SlashEvent] = field(default_factory=list)
    total_slashed: int = 0
    total_burned: int = 0


class SlashingEngine:
    """Handles validator slashing."""

    def __init__(self):
        self.record = SlashingRecord()

    def slash(
        self,
        validator_id: int,
        reason: SlashReason,
        staked_amount: int,
        epoch: int,
    ) -> SlashEvent:
        """Slash a validator. Returns the event with amount slashed.

        Per whitepaper: slashed AGNTC is burned (removed from supply).
        """
        rate = SLASH_RATES.get(reason, 0.10)
        # ceil ensures even tiny stakers pay at least 1 token penalty;
        # cap prevents cumulative slashing from exceeding staked balance.
        amount = min(staked_amount, max(1, math.ceil(staked_amount * rate)))

        event = SlashEvent(
            epoch=epoch,
            validator_id=validator_id,
            reason=reason,
            amount_slashed=amount,
            burned=True,
        )
        self.record.events.append(event)
        self.record.total_slashed += amount
        self.record.total_burned += amount

        return event

    def get_validator_slashes(self, validator_id: int) -> list[SlashEvent]:
        """Get all slash events for a validator."""
        return [e for e in self.record.events if e.validator_id == validator_id]

    def get_epoch_slashes(self, epoch: int) -> list[SlashEvent]:
        """Get all slash events in an epoch."""
        return [e for e in self.record.events if e.epoch == epoch]
