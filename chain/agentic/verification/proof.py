"""Verification proofs: simulated ZK proofs and Claude API attestation.

Whitepaper Definition 2: Pi_i = (zk_proof, attestation, verdict, metadata)
"""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass

from agentic.verification.task import TaskType
from agentic.verification.verdict import Verdict


@dataclass(frozen=True)
class SimulatedZKProof:
    """Simulated STARK proof (SHA-256 stand-in).

    In production: STARK proof from SP1/RISC Zero zkVM.
    """
    proof_hash: bytes
    circuit_id: str
    public_inputs: list[bytes]
    computation_hash: bytes
    proving_time_s: float
    valid: bool = True

    @classmethod
    def generate(
        cls,
        circuit_id: str,
        public_inputs: list[bytes],
        computation_hash: bytes,
        proving_time_s: float,
    ) -> SimulatedZKProof:
        h = hashlib.sha256()
        h.update(circuit_id.encode())
        for inp in public_inputs:
            h.update(inp)
        h.update(computation_hash)
        return cls(
            proof_hash=h.digest(),
            circuit_id=circuit_id,
            public_inputs=public_inputs,
            computation_hash=computation_hash,
            proving_time_s=proving_time_s,
            valid=True,
        )

    def verify(self) -> bool:
        h = hashlib.sha256()
        h.update(self.circuit_id.encode())
        for inp in self.public_inputs:
            h.update(inp)
        h.update(self.computation_hash)
        return self.proof_hash == h.digest()


@dataclass(frozen=True)
class SimulatedAttestation:
    """Simulated Claude API attestation (signed response).

    In production: ECDSA/Ed25519 signature from Anthropic attestation key.
    """
    query_hash: bytes
    analysis: str
    timestamp: float
    signature: bytes
    authority_id: str

    @classmethod
    def generate(
        cls,
        query_data: bytes,
        analysis: str,
        authority_id: str,
    ) -> SimulatedAttestation:
        query_hash = hashlib.sha256(query_data).digest()
        ts = time.time()
        sig_input = query_hash + analysis.encode() + str(ts).encode() + authority_id.encode()
        signature = hashlib.sha256(sig_input).digest()
        return cls(
            query_hash=query_hash,
            analysis=analysis,
            timestamp=ts,
            signature=signature,
            authority_id=authority_id,
        )

    def verify(self) -> bool:
        sig_input = (
            self.query_hash
            + self.analysis.encode()
            + str(self.timestamp).encode()
            + self.authority_id.encode()
        )
        expected = hashlib.sha256(sig_input).digest()
        return self.signature == expected


@dataclass(frozen=True)
class ProofMetadata:
    agent_id: str
    task_type: TaskType
    block_hash: bytes
    total_time_s: float


@dataclass(frozen=True)
class VerificationProof:
    """Composite verification proof (Whitepaper Definition 2).

    Pi_i = (zk_proof, attestation, verdict, metadata)
    """
    zk_proof: SimulatedZKProof
    attestation: SimulatedAttestation
    verdict: Verdict
    metadata: ProofMetadata

    def is_fully_valid(self) -> bool:
        return self.zk_proof.verify() and self.attestation.verify()

    def commitment_hash(self) -> bytes:
        h = hashlib.sha256()
        h.update(self.zk_proof.proof_hash)
        h.update(self.attestation.signature)
        h.update(self.verdict.value.encode())
        h.update(self.metadata.agent_id.encode())
        return h.digest()
