"""Tests for ZK ownership proof construction and verification."""
import pytest


class TestBuildOwnershipProof:
    def test_builds_valid_proof(self):
        from agentic.actions.ownership import build_ownership_proof
        from agentic.actions.types import ActionType
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.ledger.crypto import generate_key_pair

        keys = generate_key_pair(seed=42)
        coord = GridCoordinate(x=10, y=20)
        proof = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=7,
            action_type=ActionType.EDIT, slot=100,
        )
        assert len(proof.action_nullifier) == 32
        assert len(proof.proof_hash) == 32
        assert len(proof.action_nonce) == 32
        assert proof.claim_position == 7

    def test_different_nonces_produce_different_nullifiers(self):
        from agentic.actions.ownership import build_ownership_proof
        from agentic.actions.types import ActionType
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.ledger.crypto import generate_key_pair

        keys = generate_key_pair(seed=42)
        coord = GridCoordinate(x=10, y=20)
        p1 = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_type=ActionType.READ, slot=1,
        )
        p2 = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_type=ActionType.READ, slot=1,
        )
        assert p1.action_nullifier != p2.action_nullifier


class TestVerifyOwnershipProof:
    def test_valid_proof_passes(self):
        from agentic.actions.ownership import build_ownership_proof, verify_ownership_proof
        from agentic.actions.types import ActionType
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.ledger.crypto import generate_key_pair

        keys = generate_key_pair(seed=42)
        coord = GridCoordinate(x=10, y=20)
        proof = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_type=ActionType.EDIT, slot=50,
        )
        result = verify_ownership_proof(
            proof=proof, expected_pubkey=keys["public_key"],
            coordinate=coord, action_type=ActionType.EDIT, slot=50,
        )
        assert result.valid is True

    def test_wrong_pubkey_fails(self):
        from agentic.actions.ownership import build_ownership_proof, verify_ownership_proof
        from agentic.actions.types import ActionType
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.ledger.crypto import generate_key_pair

        keys = generate_key_pair(seed=42)
        other_keys = generate_key_pair(seed=99)
        coord = GridCoordinate(x=10, y=20)
        proof = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_type=ActionType.EDIT, slot=50,
        )
        result = verify_ownership_proof(
            proof=proof, expected_pubkey=other_keys["public_key"],
            coordinate=coord, action_type=ActionType.EDIT, slot=50,
        )
        assert result.valid is False
        assert "proof mismatch" in result.error.lower()

    def test_wrong_action_type_fails(self):
        from agentic.actions.ownership import build_ownership_proof, verify_ownership_proof
        from agentic.actions.types import ActionType
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.ledger.crypto import generate_key_pair

        keys = generate_key_pair(seed=42)
        coord = GridCoordinate(x=10, y=20)
        proof = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_type=ActionType.EDIT, slot=50,
        )
        result = verify_ownership_proof(
            proof=proof, expected_pubkey=keys["public_key"],
            coordinate=coord, action_type=ActionType.STORE, slot=50,
        )
        assert result.valid is False


class TestNullifierUniqueness:
    def test_same_action_different_slots_different_nullifiers(self):
        from agentic.actions.ownership import build_ownership_proof
        from agentic.actions.types import ActionType
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.ledger.crypto import generate_key_pair

        keys = generate_key_pair(seed=42)
        coord = GridCoordinate(x=0, y=0)
        p1 = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_type=ActionType.READ, slot=1,
        )
        p2 = build_ownership_proof(
            keys=keys, coordinate=coord,
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_type=ActionType.READ, slot=2,
        )
        assert p1.action_nullifier != p2.action_nullifier
