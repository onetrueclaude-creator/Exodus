"""Tests for nullifier set (double-spend prevention)."""
from __future__ import annotations
import pytest
from agentic.ledger.nullifier import NullifierSet, CapacityError


class TestNullifierSet:
    def test_empty_set(self):
        ns = NullifierSet()
        assert not ns.contains(b"x" * 32)
        assert ns.size == 0

    def test_add_and_contains(self):
        ns = NullifierSet()
        nf = b"nullifier_1" + b"\x00" * 21
        ns.add(nf)
        assert ns.contains(nf)
        assert ns.size == 1

    def test_double_add_detected(self):
        ns = NullifierSet()
        nf = b"nullifier_1" + b"\x00" * 21
        ns.add(nf)
        with pytest.raises(ValueError, match="already exists"):
            ns.add(nf)

    def test_multiple_nullifiers(self):
        ns = NullifierSet()
        for i in range(10):
            nf = bytes([i]) * 32
            ns.add(nf)
        assert ns.size == 10
        for i in range(10):
            assert ns.contains(bytes([i]) * 32)
        assert not ns.contains(bytes([99]) * 32)

    def test_root_changes_on_add(self):
        ns = NullifierSet()
        root1 = ns.get_root()
        ns.add(b"a" * 32)
        root2 = ns.get_root()
        assert root1 != root2


class TestNullifierCapacity:
    def test_capacity_overflow_raises(self):
        """Exceeding tree capacity raises CapacityError."""
        ns = NullifierSet(tree_depth=2)  # capacity = 4
        for i in range(4):
            ns.add(bytes([i]) * 32)
        with pytest.raises(CapacityError, match="full"):
            ns.add(bytes([99]) * 32)

    def test_capacity_property(self):
        ns = NullifierSet(tree_depth=3)
        assert ns.capacity == 8

    def test_fill_to_exact_capacity(self):
        """Can fill tree to exactly 2^depth entries."""
        ns = NullifierSet(tree_depth=2)  # capacity = 4
        for i in range(4):
            ns.add(bytes([i]) * 32)
        assert ns.size == 4
