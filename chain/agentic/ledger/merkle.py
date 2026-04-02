"""Sparse Merkle Tree with configurable depth (Poseidon-hashed).

Only stores non-default nodes (sparse).  Default nodes use precomputed
hashes so empty sub-trees are never materialised.

Uses Poseidon hash (BN128, t=3) for all internal node computation,
making the tree ZK-circuit-friendly.
"""
from __future__ import annotations

from typing import ClassVar

from agentic.ledger.poseidon import poseidon_hash_bytes


class SparseMerkleTree:
    """A sparse Merkle tree backed by a dict of ``(level, index)`` nodes.

    Level 0 holds leaves; level *depth* holds the root.
    """

    # Shared across all instances with the same depth so we only compute once.
    _default_cache: ClassVar[dict[int, list[bytes]]] = {}

    # ------------------------------------------------------------------ #
    #  Construction
    # ------------------------------------------------------------------ #

    def __init__(self, depth: int) -> None:
        self.depth = depth
        self.nodes: dict[tuple[int, int], bytes] = {}

        # Pre-compute the default hash at every level (shared per depth).
        if depth not in self._default_cache:
            defaults: list[bytes] = [b"\x00" * 32]  # level 0
            for _ in range(depth):
                prev = defaults[-1]
                defaults.append(self._hash_pair(prev, prev))
            self._default_cache[depth] = defaults

        self._defaults = self._default_cache[depth]

    # ------------------------------------------------------------------ #
    #  Helpers
    # ------------------------------------------------------------------ #

    @property
    def default_leaf(self) -> bytes:
        """The default (empty) leaf value -- 32 zero bytes."""
        return self._defaults[0]

    @staticmethod
    def _hash_pair(left: bytes, right: bytes) -> bytes:
        """Poseidon(left, right) — ZK-friendly hash."""
        return poseidon_hash_bytes(left, right)

    def _default(self, level: int) -> bytes:
        return self._defaults[level]

    def _get(self, level: int, index: int) -> bytes:
        """Return the node at *(level, index)*, or the default for that level."""
        return self.nodes.get((level, index), self._default(level))

    def _validate_index(self, index: int) -> None:
        if index < 0 or index >= (1 << self.depth):
            raise ValueError(
                f"Index {index} out of range for depth {self.depth} "
                f"(max {(1 << self.depth) - 1})"
            )

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #

    def insert(self, index: int, leaf: bytes) -> None:
        """Store *leaf* at position *index* and recompute the path to root."""
        self._validate_index(index)

        # Set the leaf.
        self.nodes[(0, index)] = leaf

        # Walk up recalculating parents.
        current_index = index
        for level in range(self.depth):
            # Determine sibling index and which side we are on.
            if current_index % 2 == 0:
                left = self._get(level, current_index)
                right = self._get(level, current_index + 1)
            else:
                left = self._get(level, current_index - 1)
                right = self._get(level, current_index)

            parent_index = current_index // 2
            self.nodes[(level + 1, parent_index)] = self._hash_pair(left, right)
            current_index = parent_index

    def get_root(self) -> bytes:
        """Return the current Merkle root."""
        return self._get(self.depth, 0)

    def get_leaf(self, index: int) -> bytes:
        """Return the leaf at *index*, or the default leaf if unset."""
        self._validate_index(index)
        return self._get(0, index)

    def get_proof(self, index: int) -> list[bytes]:
        """Collect sibling hashes from leaf to root (bottom-up).

        Returns a list of length *depth* where ``proof[i]`` is the sibling
        hash at level *i*.
        """
        self._validate_index(index)

        proof: list[bytes] = []
        current_index = index
        for level in range(self.depth):
            if current_index % 2 == 0:
                sibling = self._get(level, current_index + 1)
            else:
                sibling = self._get(level, current_index - 1)
            proof.append(sibling)
            current_index //= 2
        return proof

    @staticmethod
    def verify_proof(
        root: bytes,
        index: int,
        leaf: bytes,
        proof: list[bytes],
        depth: int,
    ) -> bool:
        """Recompute the root from *leaf* + *proof* and compare to *root*."""
        current = leaf
        current_index = index
        for level in range(depth):
            sibling = proof[level]
            if current_index % 2 == 0:
                current = SparseMerkleTree._hash_pair(current, sibling)
            else:
                current = SparseMerkleTree._hash_pair(sibling, current)
            current_index //= 2
        return current == root
