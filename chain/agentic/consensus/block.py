"""Block model for Agentic Chain consensus."""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum

MAX_DISPUTE_ROUNDS = 3


class BlockStatus(Enum):
    PROPOSED = "proposed"
    ORDERED = "ordered"
    VERIFIED = "verified"
    FINALIZED = "finalized"
    FAILED = "failed"
    DISPUTED = "disputed"
    LOW_CONFIDENCE = "low_confidence"
    TIMED_OUT = "timed_out"


@dataclass
class Block:
    """A block in the Agentic Chain pipelined consensus."""
    slot: int
    leader_id: int
    status: BlockStatus = BlockStatus.PROPOSED
    proofs: list[tuple[int, float]] = field(default_factory=list)
    finality_time_s: float = 0.0
    verification_round: int = 1
    dispute_reason: str | None = None

    def add_proof(self, validator_id: int, proof_time_s: float):
        """Add a proof from a validator.  Duplicate submissions are rejected."""
        if any(vid == validator_id for vid, _ in self.proofs):
            raise ValueError(f"Validator {validator_id} already submitted a proof")
        self.proofs.append((validator_id, proof_time_s))
        if self.status in (BlockStatus.PROPOSED, BlockStatus.ORDERED):
            self.status = BlockStatus.VERIFIED

    def try_finalize(self, threshold: int) -> bool:
        if len(self.proofs) >= threshold:
            self.status = BlockStatus.FINALIZED
            self.finality_time_s = max(t for _, t in self.proofs[:threshold])
            return True
        if self.proofs:
            self.status = BlockStatus.VERIFIED
        return False

    def enter_dispute(self, reason: str) -> None:
        """Move block into dispute.  After MAX_DISPUTE_ROUNDS, times out."""
        if self.verification_round >= MAX_DISPUTE_ROUNDS:
            self.status = BlockStatus.TIMED_OUT
            self.dispute_reason = f"exceeded {MAX_DISPUTE_ROUNDS} rounds: {reason}"
            return
        self.status = BlockStatus.DISPUTED
        self.dispute_reason = reason
        self.verification_round += 1
