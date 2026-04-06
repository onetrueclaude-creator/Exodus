"""Tests for the action pipeline dispatcher."""
import pytest


class TestValidateActionType:
    def test_valid_action_accepted(self):
        from agentic.actions.pipeline import validate_action_type
        from agentic.actions.types import ActionType
        assert validate_action_type(ActionType.READ) is True

    def test_invalid_int_rejected(self):
        from agentic.actions.pipeline import validate_action_type
        assert validate_action_type(99) is False


class TestValidateRequestFields:
    def test_read_request_valid(self):
        from agentic.actions.pipeline import validate_request_fields
        from agentic.actions.types import ActionType, ReadRequest, ReadTarget
        from agentic.lattice.coordinate import GridCoordinate
        req = ReadRequest(
            coordinate=GridCoordinate(x=0, y=0), slot=1,
            target=ReadTarget.RESOURCE_DENSITY, planet_index=-1,
            ownership_proof=None,
        )
        result = validate_request_fields(ActionType.READ, req)
        assert result.valid is True

    def test_edit_without_proof_rejected(self):
        from agentic.actions.pipeline import validate_request_fields
        from agentic.actions.types import ActionType, ReadRequest, ReadTarget
        from agentic.lattice.coordinate import GridCoordinate
        req = ReadRequest(
            coordinate=GridCoordinate(x=0, y=0), slot=1,
            target=ReadTarget.RESOURCE_DENSITY, planet_index=-1,
            ownership_proof=None,
        )
        result = validate_request_fields(ActionType.EDIT, req)
        assert result.valid is False


class TestPipelineDispatch:
    def test_public_read_succeeds(self):
        from agentic.actions.pipeline import ActionPipeline
        from agentic.actions.types import (
            ActionType, CallerType, ActionRequest, ReadRequest, ReadTarget,
        )
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        from agentic.ledger.state import LedgerState

        pipeline = ActionPipeline(
            ledger_state=LedgerState(tree_depth=20),
            claim_registry=ClaimRegistry(),
        )
        req = ActionRequest(
            action_type=ActionType.READ, caller_type=CallerType.USER,
            caller_pubkey=b"\xFF" * 32, slot=1,
            request=ReadRequest(
                coordinate=GridCoordinate(x=0, y=0), slot=1,
                target=ReadTarget.RESOURCE_DENSITY, planet_index=-1,
                ownership_proof=None,
            ),
        )
        result = pipeline.execute(req)
        assert result.success is True

    def test_edit_without_claim_fails(self):
        from agentic.actions.pipeline import ActionPipeline
        from agentic.actions.types import (
            ActionType, CallerType, ActionRequest,
            EditRequest, EditTarget, OwnershipProof,
        )
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        from agentic.ledger.state import LedgerState

        pipeline = ActionPipeline(
            ledger_state=LedgerState(tree_depth=20),
            claim_registry=ClaimRegistry(),
        )
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_nullifier=b"\x02" * 32, action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        req = ActionRequest(
            action_type=ActionType.EDIT, caller_type=CallerType.USER,
            caller_pubkey=b"\xFF" * 32, slot=1,
            request=EditRequest(
                coordinate=GridCoordinate(x=10, y=20), slot=1,
                ownership_proof=proof, target=EditTarget.CLAIM_METADATA,
                planet_index=-1, field_index=0,
                new_int_value=1, new_hash_value=b"\x00" * 32,
            ),
        )
        result = pipeline.execute(req)
        assert result.success is False
        assert "no active claim" in result.error.lower()

    def test_replay_attack_blocked(self):
        from agentic.actions.pipeline import ActionPipeline
        from agentic.actions.types import (
            ActionType, CallerType, ActionRequest, ReadRequest, ReadTarget,
            OwnershipProof,
        )
        from agentic.lattice.coordinate import GridCoordinate
        from agentic.lattice.claims import ClaimRegistry
        from agentic.ledger.state import LedgerState

        pipeline = ActionPipeline(
            ledger_state=LedgerState(tree_depth=20),
            claim_registry=ClaimRegistry(),
        )
        proof = OwnershipProof(
            claim_commitment=b"\x01" * 32, claim_position=0,
            action_nullifier=b"\x02" * 32, action_nonce=b"\x03" * 32,
            proof_hash=b"\x04" * 32,
        )
        req = ActionRequest(
            action_type=ActionType.READ, caller_type=CallerType.USER,
            caller_pubkey=b"\xFF" * 32, slot=1,
            request=ReadRequest(
                coordinate=GridCoordinate(x=0, y=0), slot=1,
                target=ReadTarget.CLAIM_STATUS, planet_index=-1,
                ownership_proof=proof,
            ),
        )
        r1 = pipeline.execute(req)
        assert r1.success is True
        r2 = pipeline.execute(req)
        assert r2.success is False
        assert "replay" in r2.error.lower() or "nullifier" in r2.error.lower()
