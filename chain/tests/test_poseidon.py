"""Tests for Poseidon hash function (BN128 scalar field)."""
from __future__ import annotations
import pytest
from agentic.ledger.poseidon import poseidon_hash, FIELD_MODULUS


class TestPoseidonBasic:
    def test_hash_two_zeros_returns_field_element(self):
        """Poseidon(0, 0) returns a valid field element."""
        result = poseidon_hash([0, 0])
        assert isinstance(result, int)
        assert 0 <= result < FIELD_MODULUS

    def test_deterministic(self):
        """Same inputs always produce the same hash."""
        h1 = poseidon_hash([1, 2])
        h2 = poseidon_hash([1, 2])
        assert h1 == h2

    def test_different_inputs_different_hash(self):
        h1 = poseidon_hash([1, 2])
        h2 = poseidon_hash([3, 4])
        assert h1 != h2

    def test_order_matters(self):
        h1 = poseidon_hash([1, 2])
        h2 = poseidon_hash([2, 1])
        assert h1 != h2

    def test_single_input(self):
        """Poseidon with a single input should work (capacity=1, rate=2, pad with 0)."""
        result = poseidon_hash([42])
        assert isinstance(result, int)
        assert 0 <= result < FIELD_MODULUS

    def test_output_is_field_element(self):
        result = poseidon_hash([FIELD_MODULUS - 1, FIELD_MODULUS - 2])
        assert 0 <= result < FIELD_MODULUS

    def test_input_reduction(self):
        """Inputs >= FIELD_MODULUS should be reduced mod p."""
        h1 = poseidon_hash([FIELD_MODULUS + 1, 0])
        h2 = poseidon_hash([1, 0])
        assert h1 == h2


class TestPoseidonBytes:
    def test_hash_bytes_pair(self):
        """poseidon_hash_bytes takes two 32-byte inputs and returns 32 bytes."""
        from agentic.ledger.poseidon import poseidon_hash_bytes
        left = b"\x01" * 32
        right = b"\x02" * 32
        result = poseidon_hash_bytes(left, right)
        assert isinstance(result, bytes)
        assert len(result) == 32

    def test_bytes_deterministic(self):
        from agentic.ledger.poseidon import poseidon_hash_bytes
        h1 = poseidon_hash_bytes(b"\xaa" * 32, b"\xbb" * 32)
        h2 = poseidon_hash_bytes(b"\xaa" * 32, b"\xbb" * 32)
        assert h1 == h2

    def test_bytes_different_inputs(self):
        from agentic.ledger.poseidon import poseidon_hash_bytes
        a = poseidon_hash_bytes(b"\x01" * 32, b"\x02" * 32)
        b = poseidon_hash_bytes(b"\x03" * 32, b"\x04" * 32)
        assert a != b
