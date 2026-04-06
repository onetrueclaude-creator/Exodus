"""Action pipeline types — all 6 constrained actions."""
from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import Union

from agentic.lattice.coordinate import GridCoordinate
from agentic.lattice.content import ContentType


class ActionType(IntEnum):
    READ = 1
    EDIT = 2
    STORE = 3
    VERIFY = 4
    VOTE = 5
    SECURE = 6


class CallerType(IntEnum):
    USER = 1
    AGENT = 2


class ReadTarget(IntEnum):
    CLAIM_STATUS = 1
    STORAGE_SLOT = 2
    MINING_YIELD = 3
    RESOURCE_DENSITY = 4
    HISTORY = 5


class EditTarget(IntEnum):
    CLAIM_METADATA = 1
    PLANET_DATA = 2
    AGENT_CONFIG = 3


class VerifyTarget(IntEnum):
    BLOCK = 1
    TRANSACTION = 2
    STATE_ROOT = 3


class VoteChoice(IntEnum):
    FOR = 1
    AGAINST = 2
    ABSTAIN = 3


class SecurityAction(IntEnum):
    LOCK = 1
    UNLOCK = 2
    ENCRYPT = 3
    DECRYPT = 4
    SHIELD = 5
    UNSHIELD = 6


@dataclass(frozen=True)
class OwnershipProof:
    """Simulated ZK proof of coordinate ownership.  Frozen to prevent
    post-submission mutation."""
    claim_commitment: bytes
    claim_position: int
    action_nullifier: bytes
    action_nonce: bytes
    proof_hash: bytes


@dataclass
class ReadRequest:
    coordinate: GridCoordinate
    slot: int
    target: ReadTarget
    planet_index: int
    ownership_proof: OwnershipProof | None


@dataclass
class EditRequest:
    coordinate: GridCoordinate
    slot: int
    ownership_proof: OwnershipProof
    target: EditTarget
    planet_index: int
    field_index: int
    new_int_value: int
    new_hash_value: bytes


@dataclass
class StoreRequest:
    coordinate: GridCoordinate
    slot: int
    ownership_proof: OwnershipProof
    planet_index: int
    content_type: ContentType
    content_hash: bytes
    size_bytes: int


@dataclass
class VerifyRequest:
    coordinate: GridCoordinate
    slot: int
    ownership_proof: OwnershipProof
    target: VerifyTarget
    target_ref: int
    proof_commitment: bytes
    cpu_cycles_spent: int


@dataclass
class VoteRequest:
    coordinate: GridCoordinate
    slot: int
    ownership_proof: OwnershipProof
    proposal_id: int
    choice: VoteChoice
    weight: int

    def __post_init__(self):
        if self.weight < 0:
            raise ValueError(f"Vote weight must be non-negative, got {self.weight}")


@dataclass
class SecureRequest:
    coordinate: GridCoordinate
    slot: int
    ownership_proof: OwnershipProof
    action: SecurityAction
    target_planet: int
    key_commitment: bytes


RequestPayload = Union[
    ReadRequest, EditRequest, StoreRequest,
    VerifyRequest, VoteRequest, SecureRequest,
]


@dataclass
class ActionRequest:
    action_type: ActionType
    caller_type: CallerType
    caller_pubkey: bytes
    slot: int
    request: RequestPayload
