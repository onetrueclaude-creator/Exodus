"""Tests for Sparse Merkle Tree."""
from __future__ import annotations
import pytest
from agentic.ledger.merkle import SparseMerkleTree


class TestSparseMerkleTree:
    def test_empty_tree_has_default_root(self):
        smt = SparseMerkleTree(depth=4)
        root = smt.get_root()
        assert len(root) == 32
        smt2 = SparseMerkleTree(depth=4)
        assert smt2.get_root() == root

    def test_insert_changes_root(self):
        smt = SparseMerkleTree(depth=4)
        empty_root = smt.get_root()
        smt.insert(0, b"leaf_data_aaaaaaaaaaaaaaaaaaaaaaaa")
        assert smt.get_root() != empty_root

    def test_insert_same_leaf_same_root(self):
        smt1 = SparseMerkleTree(depth=4)
        smt2 = SparseMerkleTree(depth=4)
        leaf = b"x" * 32
        smt1.insert(0, leaf)
        smt2.insert(0, leaf)
        assert smt1.get_root() == smt2.get_root()

    def test_different_positions_different_roots(self):
        smt1 = SparseMerkleTree(depth=4)
        smt2 = SparseMerkleTree(depth=4)
        leaf = b"x" * 32
        smt1.insert(0, leaf)
        smt2.insert(1, leaf)
        assert smt1.get_root() != smt2.get_root()

    def test_get_leaf(self):
        smt = SparseMerkleTree(depth=4)
        leaf = b"y" * 32
        smt.insert(3, leaf)
        assert smt.get_leaf(3) == leaf

    def test_get_empty_leaf_returns_default(self):
        smt = SparseMerkleTree(depth=4)
        assert smt.get_leaf(5) == smt.default_leaf

    def test_proof_and_verify(self):
        smt = SparseMerkleTree(depth=4)
        leaf = b"z" * 32
        smt.insert(7, leaf)
        proof = smt.get_proof(7)
        assert len(proof) == 4
        root = smt.get_root()
        assert SparseMerkleTree.verify_proof(root, 7, leaf, proof, depth=4)

    def test_verify_wrong_leaf_fails(self):
        smt = SparseMerkleTree(depth=4)
        smt.insert(7, b"z" * 32)
        proof = smt.get_proof(7)
        root = smt.get_root()
        assert not SparseMerkleTree.verify_proof(root, 7, b"w" * 32, proof, depth=4)

    def test_multiple_inserts(self):
        smt = SparseMerkleTree(depth=8)
        leaves = {}
        for i in range(10):
            leaf = bytes([i]) * 32
            smt.insert(i * 3, leaf)
            leaves[i * 3] = leaf
        for pos, leaf in leaves.items():
            assert smt.get_leaf(pos) == leaf
            proof = smt.get_proof(pos)
            assert SparseMerkleTree.verify_proof(smt.get_root(), pos, leaf, proof, depth=8)

    def test_max_index_within_depth(self):
        smt = SparseMerkleTree(depth=4)
        max_idx = (2 ** 4) - 1
        smt.insert(max_idx, b"m" * 32)
        assert smt.get_leaf(max_idx) == b"m" * 32

    def test_index_out_of_range_raises(self):
        smt = SparseMerkleTree(depth=4)
        with pytest.raises(ValueError):
            smt.insert(16, b"x" * 32)

    def test_overwrite_preserves_proof(self):
        """Inserting at the same position overwrites and proof is still valid."""
        smt = SparseMerkleTree(depth=4)
        smt.insert(5, b"a" * 32)
        smt.insert(5, b"b" * 32)  # overwrite
        assert smt.get_leaf(5) == b"b" * 32
        proof = smt.get_proof(5)
        root = smt.get_root()
        assert SparseMerkleTree.verify_proof(root, 5, b"b" * 32, proof, depth=4)
        assert not SparseMerkleTree.verify_proof(root, 5, b"a" * 32, proof, depth=4)

    def test_negative_index_raises(self):
        smt = SparseMerkleTree(depth=4)
        with pytest.raises(ValueError):
            smt.insert(-1, b"x" * 32)
