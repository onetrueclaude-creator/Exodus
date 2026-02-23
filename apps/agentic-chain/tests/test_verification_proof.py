"""Tests for verification proofs (simulated ZK + attestation)."""
import pytest
from agentic.verification.proof import (
    SimulatedZKProof, SimulatedAttestation, VerificationProof, ProofMetadata,
)
from agentic.verification.verdict import Verdict
from agentic.verification.task import TaskType


class TestSimulatedZKProof:
    def test_create_proof(self):
        proof = SimulatedZKProof.generate(
            circuit_id="tx_validity_v1",
            public_inputs=[b"\x01" * 32, b"\x02" * 32],
            computation_hash=b"\xaa" * 32,
            proving_time_s=3.5,
        )
        assert proof.valid
        assert proof.proving_time_s == 3.5
        assert len(proof.proof_hash) == 32

    def test_verify_valid_proof(self):
        proof = SimulatedZKProof.generate(
            circuit_id="tx_validity_v1",
            public_inputs=[b"\x01" * 32],
            computation_hash=b"\xaa" * 32,
            proving_time_s=2.0,
        )
        assert proof.verify()

    def test_tampered_proof_fails(self):
        proof = SimulatedZKProof.generate(
            circuit_id="tx_validity_v1",
            public_inputs=[b"\x01" * 32],
            computation_hash=b"\xaa" * 32,
            proving_time_s=2.0,
        )
        tampered = SimulatedZKProof(
            proof_hash=b"\xff" * 32,
            circuit_id=proof.circuit_id,
            public_inputs=proof.public_inputs,
            computation_hash=proof.computation_hash,
            proving_time_s=proof.proving_time_s,
            valid=True,
        )
        assert not tampered.verify()


class TestSimulatedAttestation:
    def test_create_attestation(self):
        att = SimulatedAttestation.generate(
            query_data=b"verify block 42",
            analysis="No anomalies detected. Transaction patterns normal.",
            authority_id="anthropic_primary",
        )
        assert att.authority_id == "anthropic_primary"
        assert len(att.signature) == 32

    def test_verify_attestation(self):
        att = SimulatedAttestation.generate(
            query_data=b"verify block 42",
            analysis="All clear.",
            authority_id="anthropic_primary",
        )
        assert att.verify()

    def test_tampered_attestation_fails(self):
        att = SimulatedAttestation.generate(
            query_data=b"verify block 42",
            analysis="All clear.",
            authority_id="anthropic_primary",
        )
        tampered = SimulatedAttestation(
            query_hash=att.query_hash,
            analysis="TAMPERED analysis",
            timestamp=att.timestamp,
            signature=att.signature,
            authority_id=att.authority_id,
        )
        assert not tampered.verify()


class TestVerificationProof:
    def test_composite_proof(self):
        zk = SimulatedZKProof.generate(
            circuit_id="state_transition_v1",
            public_inputs=[b"\x01" * 32],
            computation_hash=b"\xbb" * 32,
            proving_time_s=10.0,
        )
        att = SimulatedAttestation.generate(
            query_data=b"analyze block 42",
            analysis="No anomalies.",
            authority_id="anthropic_primary",
        )
        meta = ProofMetadata(
            agent_id="agent_0",
            task_type=TaskType.STATE_TRANSITION,
            block_hash=b"\xcc" * 32,
            total_time_s=12.5,
        )
        proof = VerificationProof(
            zk_proof=zk,
            attestation=att,
            verdict=Verdict.VALID,
            metadata=meta,
        )
        assert proof.is_fully_valid()

    def test_proof_hash_for_commitment(self):
        zk = SimulatedZKProof.generate(
            circuit_id="tx_v1",
            public_inputs=[b"\x01" * 32],
            computation_hash=b"\xbb" * 32,
            proving_time_s=2.0,
        )
        att = SimulatedAttestation.generate(
            query_data=b"q", analysis="ok", authority_id="a",
        )
        meta = ProofMetadata(
            agent_id="agent_0", task_type=TaskType.TX_VALIDITY,
            block_hash=b"\xcc" * 32, total_time_s=3.0,
        )
        proof = VerificationProof(zk_proof=zk, attestation=att,
                                   verdict=Verdict.VALID, metadata=meta)
        h = proof.commitment_hash()
        assert len(h) == 32
        assert proof.commitment_hash() == h
