"""Action pipeline — validates, dispatches, and records constrained actions."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from agentic.actions.types import (
    ActionType, ActionRequest, ReadRequest, EditRequest,
    StoreRequest, VerifyRequest, VoteRequest, SecureRequest,
    ReadTarget,
)
from agentic.galaxy.claims import ClaimRegistry
from agentic.galaxy.coordinate import resource_density, storage_slots
from agentic.ledger.state import LedgerState


@dataclass
class ActionResult:
    success: bool
    error: str
    data: Optional[dict] = None


_ACTION_REQUEST_MAP = {
    ActionType.READ: ReadRequest,
    ActionType.EDIT: EditRequest,
    ActionType.STORE: StoreRequest,
    ActionType.VERIFY: VerifyRequest,
    ActionType.VOTE: VoteRequest,
    ActionType.SECURE: SecureRequest,
}

_PROOF_REQUIRED = {ActionType.EDIT, ActionType.STORE, ActionType.SECURE}


def validate_action_type(action_type: int) -> bool:
    try:
        ActionType(action_type)
        return True
    except ValueError:
        return False


@dataclass
class FieldValidation:
    valid: bool
    error: str = ""


def validate_request_fields(action_type: ActionType, request: object) -> FieldValidation:
    expected_class = _ACTION_REQUEST_MAP.get(action_type)
    if expected_class is None:
        return FieldValidation(valid=False, error=f"Unknown action type: {action_type}")
    if not isinstance(request, expected_class):
        return FieldValidation(
            valid=False,
            error=f"Expected {expected_class.__name__}, got {type(request).__name__}",
        )
    return FieldValidation(valid=True)


class ActionPipeline:
    def __init__(self, ledger_state: LedgerState, claim_registry: ClaimRegistry):
        self.state = ledger_state
        self.claims = claim_registry
        self._used_nullifiers: set = set()

    def execute(self, req: ActionRequest) -> ActionResult:
        # 1. Validate action type
        if not validate_action_type(req.action_type):
            return ActionResult(success=False, error=f"Invalid action type: {req.action_type}")
        action = ActionType(req.action_type)

        # 2. Validate request fields
        field_check = validate_request_fields(action, req.request)
        if not field_check.valid:
            return ActionResult(success=False, error=field_check.error)

        # 3. Ownership check for mutation actions
        if action in _PROOF_REQUIRED:
            proof = getattr(req.request, "ownership_proof", None)
            if proof is None:
                return ActionResult(success=False, error="Ownership proof required")
            coord = req.request.coordinate
            claim = self.claims.get_claim_at(coord)
            if claim is None:
                return ActionResult(success=False, error=f"No active claim at ({coord.x}, {coord.y})")
            if claim.owner != req.caller_pubkey:
                return ActionResult(success=False, error="Caller does not own claim at this coordinate")

        # 4. Replay protection
        proof = getattr(req.request, "ownership_proof", None)
        if proof is not None:
            if proof.action_nullifier in self._used_nullifiers:
                return ActionResult(success=False, error="Replay detected: action nullifier already used")
            self._used_nullifiers.add(proof.action_nullifier)

        # 5. Dispatch
        handler = self._handlers.get(action)
        if handler is None:
            return ActionResult(success=False, error=f"No handler for {action.name}")
        return handler(self, req)

    def _handle_read(self, req: ActionRequest) -> ActionResult:
        r: ReadRequest = req.request
        if r.target == ReadTarget.RESOURCE_DENSITY:
            density = resource_density(r.coordinate.x, r.coordinate.y)
            return ActionResult(success=True, error="", data={"density": density})
        if r.target == ReadTarget.CLAIM_STATUS:
            claim = self.claims.get_claim_at(r.coordinate)
            if claim is None:
                return ActionResult(success=True, error="", data={"claimed": False})
            return ActionResult(success=True, error="", data={
                "claimed": True, "owner": claim.owner.hex(), "stake": claim.stake_amount,
            })
        if r.target == ReadTarget.STORAGE_SLOT:
            slots = storage_slots(r.coordinate.x, r.coordinate.y)
            return ActionResult(success=True, error="", data={
                "total_slots": slots, "planet_index": r.planet_index,
            })
        if r.target == ReadTarget.MINING_YIELD:
            density = resource_density(r.coordinate.x, r.coordinate.y)
            return ActionResult(success=True, error="", data={
                "density": density, "base_rate": 1.0, "estimated_yield": density * 1.0,
            })
        if r.target == ReadTarget.HISTORY:
            return ActionResult(success=True, error="", data={
                "slot": r.slot, "coordinate": {"x": r.coordinate.x, "y": r.coordinate.y},
                "note": "Historical view — read-only",
            })
        return ActionResult(success=False, error=f"Unknown read target: {r.target}")

    def _handle_edit(self, req: ActionRequest) -> ActionResult:
        r: EditRequest = req.request
        return ActionResult(success=True, error="", data={
            "action": "edit", "target": r.target.name,
            "field_index": r.field_index,
            "coordinate": {"x": r.coordinate.x, "y": r.coordinate.y},
        })

    def _handle_store(self, req: ActionRequest) -> ActionResult:
        r: StoreRequest = req.request
        max_slots = storage_slots(r.coordinate.x, r.coordinate.y)
        if r.planet_index >= max_slots:
            return ActionResult(success=False,
                error=f"Planet index {r.planet_index} out of range (max {max_slots - 1})")
        return ActionResult(success=True, error="", data={
            "action": "store", "content_type": r.content_type.name,
            "content_hash": r.content_hash.hex(), "planet_index": r.planet_index,
        })

    def _handle_verify(self, req: ActionRequest) -> ActionResult:
        r: VerifyRequest = req.request
        return ActionResult(success=True, error="", data={
            "action": "verify", "target": r.target.name,
            "target_ref": r.target_ref, "cpu_cycles": r.cpu_cycles_spent,
        })

    def _handle_vote(self, req: ActionRequest) -> ActionResult:
        r: VoteRequest = req.request
        return ActionResult(success=True, error="", data={
            "action": "vote", "proposal_id": r.proposal_id,
            "choice": r.choice.name, "weight": r.weight,
        })

    def _handle_secure(self, req: ActionRequest) -> ActionResult:
        r: SecureRequest = req.request
        return ActionResult(success=True, error="", data={
            "action": "secure", "security_action": r.action.name,
            "target_planet": r.target_planet,
        })

    _handlers = {
        ActionType.READ: _handle_read,
        ActionType.EDIT: _handle_edit,
        ActionType.STORE: _handle_store,
        ActionType.VERIFY: _handle_verify,
        ActionType.VOTE: _handle_vote,
        ActionType.SECURE: _handle_secure,
    }
