"""Tests for simulated cryptographic primitives."""
from __future__ import annotations
import pytest
from agentic.ledger.crypto import (
    hash_commitment, hash_nullifier, hash_tag,
    generate_key_pair, encrypt_record, decrypt_record,
)


class TestHashCommitment:
    def test_deterministic(self):
        owner = b"alice_pubkey"
        data = [100, 0]
        nonce = b"nonce_123"
        tag = b"tag_abc"
        program_id = b"transfer"
        c1 = hash_commitment(owner, data, nonce, tag, program_id)
        c2 = hash_commitment(owner, data, nonce, tag, program_id)
        assert c1 == c2
        assert len(c1) == 32

    def test_different_inputs_different_commitment(self):
        c1 = hash_commitment(b"alice", [100], b"n1", b"t1", b"prog")
        c2 = hash_commitment(b"bob", [100], b"n1", b"t1", b"prog")
        assert c1 != c2

    def test_data_field_affects_commitment(self):
        c1 = hash_commitment(b"alice", [100], b"n1", b"t1", b"prog")
        c2 = hash_commitment(b"alice", [200], b"n1", b"t1", b"prog")
        assert c1 != c2


class TestHashNullifier:
    def test_deterministic(self):
        n1 = hash_nullifier(b"spending_key", b"commitment", b"nonce")
        n2 = hash_nullifier(b"spending_key", b"commitment", b"nonce")
        assert n1 == n2
        assert len(n1) == 32

    def test_different_key_different_nullifier(self):
        n1 = hash_nullifier(b"key_a", b"commitment", b"nonce")
        n2 = hash_nullifier(b"key_b", b"commitment", b"nonce")
        assert n1 != n2


class TestHashTag:
    def test_deterministic(self):
        t1 = hash_tag(b"viewing_key", b"program_id", 0)
        t2 = hash_tag(b"viewing_key", b"program_id", 0)
        assert t1 == t2

    def test_different_nonce_different_tag(self):
        t1 = hash_tag(b"vk", b"prog", 0)
        t2 = hash_tag(b"vk", b"prog", 1)
        assert t1 != t2


class TestKeyPair:
    def test_generate_key_pair(self):
        keys = generate_key_pair(seed=42)
        assert 'spending_key' in keys
        assert 'viewing_key' in keys
        assert 'public_key' in keys
        assert len(keys['spending_key']) == 32
        assert len(keys['viewing_key']) == 32
        assert len(keys['public_key']) == 32

    def test_deterministic_with_seed(self):
        k1 = generate_key_pair(seed=42)
        k2 = generate_key_pair(seed=42)
        assert k1 == k2

    def test_different_seeds_different_keys(self):
        k1 = generate_key_pair(seed=1)
        k2 = generate_key_pair(seed=2)
        assert k1['spending_key'] != k2['spending_key']


class TestCollisionResistance:
    def test_owner_nonce_boundary_no_collision(self):
        """Swapping bytes between adjacent fields must not collide."""
        c1 = hash_commitment(b"ab", [100], b"cd", b"t", b"p")
        c2 = hash_commitment(b"abcd", [100], b"", b"t", b"p")
        assert c1 != c2

    def test_tag_program_id_boundary_no_collision(self):
        c1 = hash_commitment(b"o", [1], b"n", b"abc", b"def")
        c2 = hash_commitment(b"o", [1], b"n", b"ab", b"cdef")
        assert c1 != c2

    def test_empty_vs_nonempty_fields(self):
        c1 = hash_commitment(b"", [1], b"nonce", b"t", b"p")
        c2 = hash_commitment(b"nonce", [1], b"", b"t", b"p")
        assert c1 != c2

    def test_nullifier_field_boundary_no_collision(self):
        n1 = hash_nullifier(b"ab", b"cd", b"ef")
        n2 = hash_nullifier(b"abcd", b"", b"ef")
        assert n1 != n2

    def test_tag_field_boundary_no_collision(self):
        t1 = hash_tag(b"ab", b"cd", 0)
        t2 = hash_tag(b"abcd", b"", 0)
        assert t1 != t2


class TestDomainSeparation:
    def test_commitment_differs_from_nullifier(self):
        """Same raw bytes fed to different hash functions must differ."""
        key = b"k" * 32
        data_bytes = b"d" * 32
        nonce = b"n" * 32
        c = hash_commitment(key, [], data_bytes, nonce, b"")
        n = hash_nullifier(key, data_bytes, nonce)
        assert c != n

    def test_commitment_differs_from_tag(self):
        key = b"k" * 32
        c = hash_commitment(key, [], b"", b"", b"")
        t = hash_tag(key, b"", 0)
        assert c != t


class TestDataValidation:
    def test_int64_max_value(self):
        """INT64_MAX should be accepted."""
        c = hash_commitment(b"o", [(1 << 63) - 1], b"n", b"t", b"p")
        assert len(c) == 32

    def test_int64_min_value(self):
        """INT64_MIN should be accepted."""
        c = hash_commitment(b"o", [-(1 << 63)], b"n", b"t", b"p")
        assert len(c) == 32

    def test_int64_overflow_raises(self):
        """Values outside int64 range must raise ValueError."""
        with pytest.raises(ValueError, match="outside int64 range"):
            hash_commitment(b"o", [1 << 63], b"n", b"t", b"p")

    def test_int64_underflow_raises(self):
        with pytest.raises(ValueError, match="outside int64 range"):
            hash_commitment(b"o", [-(1 << 63) - 1], b"n", b"t", b"p")


class TestEncryption:
    def test_round_trip(self):
        plaintext = b"secret record data here"
        key = b"a" * 32
        ciphertext = encrypt_record(key, plaintext)
        decrypted = decrypt_record(key, ciphertext)
        assert decrypted == plaintext

    def test_wrong_key_fails(self):
        plaintext = b"secret"
        ciphertext = encrypt_record(b"a" * 32, plaintext)
        decrypted = decrypt_record(b"b" * 32, ciphertext)
        assert decrypted != plaintext
