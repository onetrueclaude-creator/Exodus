"""Nullifier set for double-spend prevention."""
from __future__ import annotations
from agentic.ledger.merkle import SparseMerkleTree
from agentic.params import MERKLE_TREE_DEPTH


class CapacityError(Exception):
    """Raised when a Merkle-backed structure reaches its leaf capacity."""


class NullifierSet:
    """Tracks spent-record nullifiers to prevent double-spending.

    Backed by a Sparse Merkle Tree whose depth matches the PCT
    (Private Commitment Tree) so both structures can hold the same
    number of entries.
    """

    def __init__(self, tree_depth: int = MERKLE_TREE_DEPTH):
        self._tree = SparseMerkleTree(depth=tree_depth)
        self._set: set[bytes] = set()
        self._next_index = 0
        self._capacity = 1 << tree_depth

    @property
    def size(self) -> int:
        return len(self._set)

    @property
    def capacity(self) -> int:
        return self._capacity

    def contains(self, nullifier: bytes) -> bool:
        return nullifier in self._set

    def add(self, nullifier: bytes) -> None:
        if nullifier in self._set:
            raise ValueError("Nullifier already exists (double-spend)")
        if self._next_index >= self._capacity:
            raise CapacityError(
                f"Nullifier tree full ({self._capacity} entries)"
            )
        self._set.add(nullifier)
        self._tree.insert(self._next_index, nullifier)
        self._next_index += 1

    def get_root(self) -> bytes:
        return self._tree.get_root()
