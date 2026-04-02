"""Verification tasks assigned to agents via VRF."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from enum import Enum


class TaskType(Enum):
    """Types of verification work (Whitepaper Section 4.2)."""
    TX_VALIDITY = "tx_validity"
    STATE_TRANSITION = "state_transition"
    CROSS_LEDGER = "cross_ledger"
    PROOF_CORRECTNESS = "proof_correctness"

    @classmethod
    def mandatory_per_block(cls) -> list[TaskType]:
        """Tasks required for every block."""
        return [cls.TX_VALIDITY, cls.STATE_TRANSITION]


_PROVING_TIMES: dict[TaskType, tuple[float, float]] = {
    TaskType.TX_VALIDITY: (1.0, 5.0),
    TaskType.STATE_TRANSITION: (5.0, 15.0),
    TaskType.CROSS_LEDGER: (3.0, 10.0),
    TaskType.PROOF_CORRECTNESS: (2.0, 8.0),
}


@dataclass(frozen=True)
class VerificationTask:
    """A verification task assigned to an agent (Whitepaper Definition 1).

    V_i = (block_hash, task_type, state_snapshot, assignment_proof)
    """
    block_hash: bytes
    task_type: TaskType
    state_snapshot: bytes
    assignment_proof: bytes
    assigned_agent_id: str
    created_at: float

    @property
    def task_id(self) -> bytes:
        """Deterministic task identifier."""
        h = hashlib.sha256()
        h.update(self.block_hash)
        h.update(self.task_type.value.encode())
        h.update(self.assignment_proof)
        h.update(self.assigned_agent_id.encode())
        return h.digest()

    def estimated_proving_time_s(self) -> tuple[float, float]:
        """Return (min, max) estimated proving time in seconds."""
        return _PROVING_TIMES[self.task_type]
