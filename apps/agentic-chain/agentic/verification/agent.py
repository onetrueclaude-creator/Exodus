"""Verification agent with lifecycle management (Whitepaper Section 7.5)."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from agentic.params import AGENT_WARMUP_EPOCHS, AGENT_PROBATION_EPOCHS


class AgentState(Enum):
    REGISTERED = "registered"
    WARMING_UP = "warming_up"
    ACTIVE = "active"
    VERIFYING = "verifying"
    PROOF_SUBMITTED = "proof_submitted"
    PROBATION = "probation"
    COOLDOWN = "cooldown"
    SLASHED = "slashed"


@dataclass
class VerificationAgent:
    agent_id: str
    validator_id: int
    vpu_capacity: float
    registered_epoch: int
    state: AgentState = AgentState.REGISTERED
    current_task_id: bytes | None = None
    proofs_generated: int = 0
    proofs_accepted: int = 0
    _warmup_start_epoch: int = -1
    _probation_start_epoch: int = -1

    def can_verify(self) -> bool:
        return self.state == AgentState.ACTIVE

    def begin_warmup(self, current_epoch: int | None = None) -> None:
        if self.state != AgentState.REGISTERED:
            raise ValueError(f"Cannot warmup from state {self.state}")
        self.state = AgentState.WARMING_UP
        self._warmup_start_epoch = current_epoch if current_epoch is not None else self.registered_epoch

    def advance_epoch(self, current_epoch: int) -> None:
        if self.state == AgentState.WARMING_UP:
            if current_epoch - self._warmup_start_epoch >= AGENT_WARMUP_EPOCHS:
                self.state = AgentState.ACTIVE
        elif self.state == AgentState.PROBATION:
            if current_epoch - self._probation_start_epoch >= AGENT_PROBATION_EPOCHS:
                self.state = AgentState.ACTIVE
                self._probation_start_epoch = -1

    def begin_verification(self, task_id: bytes) -> None:
        if self.state != AgentState.ACTIVE:
            raise ValueError(f"Cannot verify from state {self.state}")
        self.state = AgentState.VERIFYING
        self.current_task_id = task_id

    def submit_proof(self) -> None:
        if self.state != AgentState.VERIFYING:
            raise ValueError(f"Cannot submit proof from state {self.state}")
        self.state = AgentState.PROOF_SUBMITTED
        self.proofs_generated += 1

    def proof_accepted(self) -> None:
        if self.state != AgentState.PROOF_SUBMITTED:
            raise ValueError(f"Cannot accept proof from state {self.state}")
        self.state = AgentState.ACTIVE
        self.proofs_accepted += 1
        self.current_task_id = None

    def enter_probation(self, epoch: int) -> None:
        self.state = AgentState.PROBATION
        self._probation_start_epoch = epoch
        self.current_task_id = None

    def slash(self) -> None:
        self.state = AgentState.SLASHED
        self.current_task_id = None

    def begin_cooldown(self) -> None:
        self.state = AgentState.COOLDOWN
        self.current_task_id = None
