"""Cryptographic primitives for Agentic Chain ledger.

All hash functions use domain-separated, length-prefixed encoding to
prevent field-boundary collisions and cross-function hash equivalence.

NOT cryptographically hardened -- prototype uses SHA-256 only.
"""
from __future__ import annotations

import hashlib
import struct

INT64_MIN = -(1 << 63)
INT64_MAX = (1 << 63) - 1


def _length_prefix(field: bytes) -> bytes:
    """4-byte big-endian length prefix + field bytes."""
    return struct.pack(">I", len(field)) + field


def hash_commitment(
    owner: bytes,
    data: list[int],
    nonce: bytes,
    tag: bytes,
    program_id: bytes,
) -> bytes:
    """Domain-separated, length-prefixed SHA-256 commitment.

    Each variable-length field is prefixed with its 4-byte length to
    prevent field-boundary collisions.  Data ints are validated against
    int64 range and encoded as big-endian signed int64 with a count prefix.
    """
    h = hashlib.sha256()
    h.update(b"AgenticCommitment:")
    for field in (owner, nonce, tag, program_id):
        h.update(_length_prefix(field))
    h.update(struct.pack(">I", len(data)))
    for d in data:
        if not (INT64_MIN <= d <= INT64_MAX):
            raise ValueError(
                f"Data value {d} outside int64 range [{INT64_MIN}, {INT64_MAX}]"
            )
        h.update(struct.pack(">q", d))
    return h.digest()


def hash_nullifier(
    spending_key: bytes,
    commitment: bytes,
    nonce: bytes,
) -> bytes:
    """Domain-separated, length-prefixed SHA-256 nullifier."""
    h = hashlib.sha256()
    h.update(b"AgenticNullifier:")
    for field in (spending_key, commitment, nonce):
        h.update(_length_prefix(field))
    return h.digest()


def hash_tag(
    viewing_key: bytes,
    program_id: bytes,
    tag_nonce: int,
) -> bytes:
    """Domain-separated, length-prefixed SHA-256 tag.

    tag_nonce is fixed-size (uint64), so only viewing_key and
    program_id need length prefixes.
    """
    h = hashlib.sha256()
    h.update(b"AgenticTag:")
    h.update(_length_prefix(viewing_key))
    h.update(_length_prefix(program_id))
    h.update(struct.pack(">Q", tag_nonce))
    return h.digest()


def generate_key_pair(seed: int) -> dict[str, bytes]:
    """Deterministic key triple derived from a seed.

    spending_key = SHA-256("sk:" + seed as uint64)
    viewing_key  = SHA-256("vk:" + spending_key)
    public_key   = SHA-256("pk:" + spending_key)
    """
    seed_bytes = struct.pack(">Q", seed)
    spending_key = hashlib.sha256(b"sk:" + seed_bytes).digest()
    viewing_key = hashlib.sha256(b"vk:" + spending_key).digest()
    public_key = hashlib.sha256(b"pk:" + spending_key).digest()
    return {
        "spending_key": spending_key,
        "viewing_key": viewing_key,
        "public_key": public_key,
    }


def encrypt_record(key: bytes, plaintext: bytes) -> bytes:
    """Repeating-key XOR encryption."""
    key_len = len(key)
    return bytes(p ^ key[i % key_len] for i, p in enumerate(plaintext))


def decrypt_record(key: bytes, ciphertext: bytes) -> bytes:
    """Repeating-key XOR decryption (symmetric with encrypt)."""
    return encrypt_record(key, ciphertext)
