"""Tests for commitment-reveal protocol (Whitepaper Section 5.3)."""
import pytest
from agentic.verification.commitment import CommitmentRevealProtocol, ProtocolPhase
from agentic.verification.proof import (
    SimulatedZKProof, SimulatedAttestation, VerificationProof, ProofMetadata,
)
from agentic.verification.verdict import Verdict
from agentic.verification.task import TaskType


def _make_proof(agent_id: str, verdict: Verdict = Verdict.VALID) -> VerificationProof:
    zk = SimulatedZKProof.generate(
        circuit_id="test_v1",
        public_inputs=[b"\x01" * 32],
        computation_hash=b"\xaa" * 32,
        proving_time_s=2.0,
    )
    att = SimulatedAttestation.generate(
        query_data=b"test", analysis="ok", authority_id="test",
    )
    meta = ProofMetadata(
        agent_id=agent_id, task_type=TaskType.TX_VALIDITY,
        block_hash=b"\xcc" * 32, total_time_s=3.0,
    )
    return VerificationProof(zk_proof=zk, attestation=att, verdict=verdict, metadata=meta)


class TestCommitmentRevealProtocol:
    def test_phases(self):
        proto = CommitmentRevealProtocol(block_hash=b"\x01" * 32)
        assert proto.phase == ProtocolPhase.COMMIT

    def test_submit_commitment(self):
        proto = CommitmentRevealProtocol(block_hash=b"\x01" * 32)
        proof = _make_proof("agent_0")
        assert proto.submit_commitment("agent_0", proof.commitment_hash())
        assert "agent_0" in proto.commitments

    def test_reject_duplicate_commitment(self):
        proto = CommitmentRevealProtocol(block_hash=b"\x01" * 32)
        proof = _make_proof("agent_0")
        proto.submit_commitment("agent_0", proof.commitment_hash())
        assert not proto.submit_commitment("agent_0", proof.commitment_hash())

    def test_submit_reveal(self):
        proto = CommitmentRevealProtocol(block_hash=b"\x01" * 32)
        proof = _make_proof("agent_0")
        proto.submit_commitment("agent_0", proof.commitment_hash())
        proto.advance_to_reveal()
        assert proto.phase == ProtocolPhase.REVEAL
        assert proto.submit_reveal("agent_0", proof)

    def test_reject_reveal_without_commitment(self):
        proto = CommitmentRevealProtocol(block_hash=b"\x01" * 32)
        proto.advance_to_reveal()
        proof = _make_proof("agent_0")
        assert not proto.submit_reveal("agent_0", proof)

    def test_detect_mismatched_reveal(self):
        proto = CommitmentRevealProtocol(block_hash=b"\x01" * 32)
        proof1 = _make_proof("agent_0", Verdict.VALID)
        proto.submit_commitment("agent_0", proof1.commitment_hash())
        proto.advance_to_reveal()
        proof2 = _make_proof("agent_0", Verdict.INVALID)
        proto.submit_reveal("agent_0", proof2)
        mismatches = proto.find_mismatches()
        assert "agent_0" in mismatches

    def test_get_valid_proofs(self):
        proto = CommitmentRevealProtocol(block_hash=b"\x01" * 32)
        proofs = [_make_proof(f"agent_{i}") for i in range(5)]
        for i, p in enumerate(proofs):
            proto.submit_commitment(f"agent_{i}", p.commitment_hash())
        proto.advance_to_reveal()
        for i, p in enumerate(proofs):
            proto.submit_reveal(f"agent_{i}", p)
        valid = proto.get_valid_proofs()
        assert len(valid) == 5
