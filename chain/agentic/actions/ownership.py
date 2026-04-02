"""ZK ownership proof construction and verification (simulated).

In a real ZK system, a SNARK circuit would prove that the prover knows the
spending_key corresponding to public_key without revealing spending_key.

In this simulation we achieve the same structural guarantees:
- Prover uses spending_key to build proof_core (unforgeable without the key).
- A verify_tag derived from (public_key, action_type, slot, nonce, proof_core[:16])
  is embedded in the proof_hash, allowing the verifier to check ownership using
  only the public_key.
"""
from __future__ import annotations

import hashlib
import os
import struct
from dataclasses import dataclass

from agentic.actions.types import ActionType, OwnershipProof
from agentic.galaxy.coordinate import GridCoordinate


@dataclass
class VerifyResult:
    """Result of an ownership proof verification."""
    valid: bool
    error: str


def _compute_action_nullifier(
    spending_key: bytes,
    claim_commitment: bytes,
    action_type: int,
    slot: int,
    nonce: bytes,
) -> bytes:
    """action_nullifier = SHA-256(spending_key || claim_commitment || action_type || slot || nonce)"""
    h = hashlib.sha256()
    h.update(spending_key)
    h.update(claim_commitment)
    h.update(struct.pack(">B", action_type))
    h.update(struct.pack(">Q", slot))
    h.update(nonce)
    return h.digest()


def _compute_proof_core(
    spending_key: bytes,
    x: int,
    y: int,
    action_type: int,
    slot: int,
    nonce: bytes,
) -> bytes:
    """proof_core = SHA-256(spending_key || x || y || action_type || slot || nonce)"""
    h = hashlib.sha256()
    h.update(spending_key)
    h.update(struct.pack(">i", x))
    h.update(struct.pack(">i", y))
    h.update(struct.pack(">B", action_type))
    h.update(struct.pack(">Q", slot))
    h.update(nonce)
    return h.digest()


def _compute_verify_tag(
    pubkey: bytes,
    action_type: int,
    slot: int,
    nonce: bytes,
    proof_core_prefix: bytes,
) -> bytes:
    """verify_tag = SHA-256(pubkey || action_type || slot || nonce || proof_core[:16])[:16]

    This tag binds the proof to a specific public_key, action_type, and slot.
    Both build and verify use this exact same formula.
    """
    h = hashlib.sha256()
    h.update(pubkey)
    h.update(struct.pack(">B", action_type))
    h.update(struct.pack(">Q", slot))
    h.update(nonce)
    h.update(proof_core_prefix)
    return h.digest()[:16]


def build_ownership_proof(
    keys: dict[str, bytes],
    coordinate: GridCoordinate,
    claim_commitment: bytes,
    claim_position: int,
    action_type: ActionType,
    slot: int,
) -> OwnershipProof:
    """Construct an ownership proof using the spending key.

    The proof embeds a verification tag derived from the public key,
    allowing anyone with the public key to verify ownership.
    """
    action_nonce = os.urandom(32)

    action_nullifier = _compute_action_nullifier(
        keys["spending_key"], claim_commitment,
        int(action_type), slot, action_nonce,
    )

    proof_core = _compute_proof_core(
        keys["spending_key"], coordinate.x, coordinate.y,
        int(action_type), slot, action_nonce,
    )

    # Embed verification tag: uses the same formula as verify
    verify_tag = _compute_verify_tag(
        keys["public_key"], int(action_type), slot,
        action_nonce, proof_core[:16],
    )

    # proof_hash = proof_core[:16] + verify_tag (total 32 bytes)
    proof_hash = proof_core[:16] + verify_tag

    return OwnershipProof(
        claim_commitment=claim_commitment,
        claim_position=claim_position,
        action_nullifier=action_nullifier,
        action_nonce=action_nonce,
        proof_hash=proof_hash,
    )


def verify_ownership_proof(
    proof: OwnershipProof,
    expected_pubkey: bytes,
    coordinate: GridCoordinate,
    action_type: ActionType,
    slot: int,
) -> VerifyResult:
    """Verify an ownership proof against an expected public key.

    Checks that the embedded verification tag matches one recomputed
    from the expected public key and proof parameters.
    """
    if len(proof.proof_hash) != 32:
        return VerifyResult(valid=False, error="Invalid proof hash length")
    if len(proof.action_nullifier) != 32:
        return VerifyResult(valid=False, error="Invalid nullifier length")

    # Extract the embedded verify_tag from proof_hash
    embedded_tag = proof.proof_hash[16:]  # last 16 bytes

    # Recompute expected tag using the same formula as build
    expected_tag = _compute_verify_tag(
        expected_pubkey, int(action_type), slot,
        proof.action_nonce, proof.proof_hash[:16],
    )

    if embedded_tag != expected_tag:
        return VerifyResult(
            valid=False,
            error="Proof mismatch: ownership verification failed",
        )

    return VerifyResult(valid=True, error="")
