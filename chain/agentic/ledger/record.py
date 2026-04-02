"""Programmable record model for Agentic Chain ledger."""
from __future__ import annotations
import hashlib
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

    def _data_digest(self) -> bytes:
        """32-byte digest of (data, nonce, tag, program_id) for Poseidon commitment.

        Uses BLAKE2b to compress variable-length record fields into a single
        32-byte value suitable for Poseidon's fixed-width input.
        """
        h = hashlib.blake2b(digest_size=32)
        for d in self.data:
            h.update(struct.pack(">q", d))
        h.update(self.nonce)
        h.update(self.tag)
        h.update(self.program_id)
        return h.digest()

    def commitment(self) -> bytes:
        return hash_commitment(self.owner, self._data_digest())

    def nullifier(self, nullifier_key: bytes) -> bytes:
        """Compute nullifier: Poseidon(nullifier_key, commitment)."""
        return hash_nullifier(nullifier_key, self.commitment())

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
