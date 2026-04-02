"""Commitment-reveal protocol for proof submission (Whitepaper Section 5.3)."""
from __future__ import annotations

from enum import Enum

from agentic.verification.proof import VerificationProof


class ProtocolPhase(Enum):
    COMMIT = "commit"
    REVEAL = "reveal"
    CLOSED = "closed"


class CommitmentRevealProtocol:
    def __init__(self, block_hash: bytes):
        self.block_hash = block_hash
        self.phase = ProtocolPhase.COMMIT
        self.commitments: dict[str, bytes] = {}
        self.reveals: dict[str, VerificationProof] = {}

    def submit_commitment(self, agent_id: str, proof_hash: bytes) -> bool:
        if self.phase != ProtocolPhase.COMMIT:
            return False
        if agent_id in self.commitments:
            return False
        self.commitments[agent_id] = proof_hash
        return True

    def advance_to_reveal(self) -> None:
        if self.phase == ProtocolPhase.COMMIT:
            self.phase = ProtocolPhase.REVEAL

    def submit_reveal(self, agent_id: str, proof: VerificationProof) -> bool:
        if self.phase != ProtocolPhase.REVEAL:
            return False
        if agent_id not in self.commitments:
            return False
        self.reveals[agent_id] = proof
        return True

    def find_mismatches(self) -> list[str]:
        mismatches = []
        for agent_id, proof in self.reveals.items():
            committed_hash = self.commitments.get(agent_id)
            if committed_hash is None:
                continue
            if proof.commitment_hash() != committed_hash:
                mismatches.append(agent_id)
        return mismatches

    def find_non_reveals(self) -> list[str]:
        """Return agent IDs that committed but never revealed."""
        return [aid for aid in self.commitments if aid not in self.reveals]

    def get_valid_proofs(self) -> list[VerificationProof]:
        mismatches = set(self.find_mismatches())
        valid = []
        for agent_id, proof in self.reveals.items():
            if agent_id in mismatches:
                continue
            if proof.is_fully_valid():
                valid.append(proof)
        return valid

    def close(self) -> None:
        self.phase = ProtocolPhase.CLOSED
