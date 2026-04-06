"""Tests for action pipeline types."""
import pytest


class TestActionType:
    def test_six_actions(self):
        from agentic.actions.types import ActionType
        assert len(ActionType) == 6

    def test_action_values(self):
        from agentic.actions.types import ActionType
        assert ActionType.READ == 1
        assert ActionType.EDIT == 2
        assert ActionType.STORE == 3
        assert ActionType.VERIFY == 4
        assert ActionType.VOTE == 5
        assert ActionType.SECURE == 6


class TestCallerType:
    def test_user_and_agent(self):
        from agentic.actions.types import CallerType
        assert CallerType.USER == 1
        assert CallerType.AGENT == 2


class TestReadTarget:
    def test_five_targets(self):
        from agentic.actions.types import ReadTarget
        assert len(ReadTarget) == 5
        assert ReadTarget.CLAIM_STATUS == 1
        assert ReadTarget.STORAGE_SLOT == 2
        assert ReadTarget.MINING_YIELD == 3
        assert ReadTarget.RESOURCE_DENSITY == 4
        assert ReadTarget.HISTORY == 5


class TestOwnershipProof:
    def test_create_proof(self):
        from agentic.actions.types import OwnershipProof
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32,
            claim_position=42,
            action_nullifier=b"\x02" * 32,
            action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        assert proof.claim_position == 42

    def test_proof_fields_are_bytes(self):
        from agentic.actions.types import OwnershipProof
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32,
            claim_position=0,
            action_nullifier=b"\x02" * 32,
            action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        assert isinstance(proof.claim_commitment, bytes)
        assert isinstance(proof.action_nullifier, bytes)
        assert isinstance(proof.proof_hash, bytes)


class TestReadRequest:
    def test_public_read_no_proof(self):
        from agentic.actions.types import ReadRequest, ReadTarget
        from agentic.lattice.coordinate import GridCoordinate
        req = ReadRequest(
            coordinate=GridCoordinate(x=0, y=0),
            slot=1,
            target=ReadTarget.RESOURCE_DENSITY,
            planet_index=-1,
            ownership_proof=None,
        )
        assert req.ownership_proof is None


class TestEditRequest:
    def test_requires_proof(self):
        from agentic.actions.types import EditRequest, EditTarget, OwnershipProof
        from agentic.lattice.coordinate import GridCoordinate
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32,
            claim_position=0,
            action_nullifier=b"\x02" * 32,
            action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        req = EditRequest(
            coordinate=GridCoordinate(x=10, y=10),
            slot=5,
            ownership_proof=proof,
            target=EditTarget.CLAIM_METADATA,
            planet_index=-1,
            field_index=0,
            new_int_value=42,
            new_hash_value=b"\x00" * 32,
        )
        assert req.ownership_proof is not None


class TestStoreRequest:
    def test_create(self):
        from agentic.actions.types import StoreRequest, OwnershipProof
        from agentic.lattice.content import ContentType
        from agentic.lattice.coordinate import GridCoordinate
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32,
            claim_position=0,
            action_nullifier=b"\x02" * 32,
            action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        req = StoreRequest(
            coordinate=GridCoordinate(x=5, y=-5),
            slot=10,
            ownership_proof=proof,
            planet_index=0,
            content_type=ContentType.JSON,
            content_hash=b"\xAB" * 32,
            size_bytes=1024,
        )
        assert req.size_bytes == 1024


class TestVerifyRequest:
    def test_create(self):
        from agentic.actions.types import VerifyRequest, VerifyTarget, OwnershipProof
        from agentic.lattice.coordinate import GridCoordinate
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32,
            claim_position=0,
            action_nullifier=b"\x02" * 32,
            action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        req = VerifyRequest(
            coordinate=GridCoordinate(x=0, y=0),
            slot=100,
            ownership_proof=proof,
            target=VerifyTarget.BLOCK,
            target_ref=42,
            proof_commitment=b"\xCC" * 32,
            cpu_cycles_spent=1000,
        )
        assert req.cpu_cycles_spent == 1000


class TestVoteRequest:
    def test_create(self):
        from agentic.actions.types import VoteRequest, VoteChoice, OwnershipProof
        from agentic.lattice.coordinate import GridCoordinate
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32,
            claim_position=0,
            action_nullifier=b"\x02" * 32,
            action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        req = VoteRequest(
            coordinate=GridCoordinate(x=10, y=-10),
            slot=50,
            ownership_proof=proof,
            proposal_id=1,
            choice=VoteChoice.FOR,
            weight=500,
        )
        assert req.choice == VoteChoice.FOR


class TestSecureRequest:
    def test_create(self):
        from agentic.actions.types import SecureRequest, SecurityAction, OwnershipProof
        from agentic.lattice.coordinate import GridCoordinate
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32,
            claim_position=0,
            action_nullifier=b"\x02" * 32,
            action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        req = SecureRequest(
            coordinate=GridCoordinate(x=-10, y=10),
            slot=200,
            ownership_proof=proof,
            action=SecurityAction.SHIELD,
            target_planet=-1,
            key_commitment=b"\xDD" * 32,
        )
        assert req.action == SecurityAction.SHIELD


class TestActionRequest:
    def test_envelope(self):
        from agentic.actions.types import (
            ActionType, CallerType, ActionRequest, ReadRequest, ReadTarget,
        )
        from agentic.lattice.coordinate import GridCoordinate
        read_req = ReadRequest(
            coordinate=GridCoordinate(x=0, y=0),
            slot=1,
            target=ReadTarget.RESOURCE_DENSITY,
            planet_index=-1,
            ownership_proof=None,
        )
        envelope = ActionRequest(
            action_type=ActionType.READ,
            caller_type=CallerType.USER,
            caller_pubkey=b"\xFF" * 32,
            slot=1,
            request=read_req,
        )
        assert envelope.action_type == ActionType.READ
        assert envelope.caller_type == CallerType.USER
