"""Programmable record model for Agentic Chain ledger."""
from __future__ import annotations
import json
import struct
from dataclasses import dataclass, field
from agentic.ledger.crypto import hash_commitment, hash_nullifier


@dataclass
class Record:
    owner: bytes           # owner's public key
    data: list[int]        # arbitrary data fields; data[0] = value/balance
    nonce: bytes           # random nonce for commitment uniqueness
    tag: bytes             # filterable tag for record discovery
    program_id: bytes      # which program governs this record
    birth_slot: int        # slot when created

    @property
    def value(self) -> int:
        return self.data[0] if self.data else 0

    def commitment(self) -> bytes:
        return hash_commitment(self.owner, self.data, self.nonce, self.tag, self.program_id)

    def nullifier(self, spending_key: bytes) -> bytes:
        return hash_nullifier(spending_key, self.commitment(), self.nonce)

    def serialize(self) -> bytes:
        obj = {
            'owner': self.owner.hex(),
            'data': self.data,
            'nonce': self.nonce.hex(),
            'tag': self.tag.hex(),
            'program_id': self.program_id.hex(),
            'birth_slot': self.birth_slot,
        }
        return json.dumps(obj).encode()

    @classmethod
    def deserialize(cls, blob: bytes) -> Record:
        obj = json.loads(blob.decode())
        return cls(
            owner=bytes.fromhex(obj['owner']),
            data=obj['data'],
            nonce=bytes.fromhex(obj['nonce']),
            tag=bytes.fromhex(obj['tag']),
            program_id=bytes.fromhex(obj['program_id']),
            birth_slot=obj['birth_slot'],
        )
