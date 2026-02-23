"""Ledger state: combines Private Commitment Tree, Nullifier Set,
Public State Tree, and tag index into a unified state machine.
"""
from __future__ import annotations
import hashlib
import struct
from collections import defaultdict
from agentic.ledger.merkle import SparseMerkleTree
from agentic.ledger.nullifier import NullifierSet, CapacityError
from agentic.ledger.record import Record
from agentic.params import MERKLE_TREE_DEPTH


class LedgerState:
    def __init__(self, tree_depth: int = MERKLE_TREE_DEPTH):
        self.pct = SparseMerkleTree(depth=tree_depth)
        self.ns = NullifierSet(tree_depth=tree_depth)
        self.pst: dict[str, object] = {}
        self.tag_index: dict[bytes, list[int]] = defaultdict(list)
        self._record_store: dict[int, bytes] = {}
        self._next_position: int = 0
        self._tree_depth = tree_depth
        self._capacity = 1 << tree_depth

    @property
    def record_count(self) -> int:
        return self._next_position

    def insert_record(self, record: Record) -> int:
        if self._next_position >= self._capacity:
            raise CapacityError(
                f"PCT full ({self._capacity} records)"
            )
        pos = self._next_position
        self._next_position += 1
        commitment = record.commitment()
        self.pct.insert(pos, commitment)
        self.tag_index[record.tag].append(pos)
        self._record_store[pos] = record.serialize()
        return pos

    def get_record(self, position: int) -> Record:
        blob = self._record_store[position]
        return Record.deserialize(blob)

    def add_nullifier(self, nullifier: bytes) -> None:
        self.ns.add(nullifier)

    def _hash_tag_index(self) -> bytes:
        """Deterministic hash of the tag index for state root inclusion."""
        h = hashlib.sha256()
        for tag_key in sorted(self.tag_index.keys()):
            h.update(tag_key)
            positions = self.tag_index[tag_key]
            h.update(struct.pack(">I", len(positions)))
            for pos in positions:
                h.update(struct.pack(">I", pos))
        return h.digest()

    def get_state_root(self) -> bytes:
        h = hashlib.sha256()
        h.update(self.pct.get_root())
        h.update(self.ns.get_root())
        h.update(self._hash_tag_index())
        return h.digest()

    def get_inclusion_proof(self, position: int) -> list[bytes]:
        return self.pct.get_proof(position)

    def verify_inclusion(self, commitment: bytes, position: int, proof: list[bytes]) -> bool:
        return SparseMerkleTree.verify_proof(
            self.pct.get_root(), position, commitment, proof, depth=self._tree_depth,
        )
