"""Cryptographic primitives for Agentic Chain ledger.

Key derivation uses BLAKE2b; commitment/nullifier/tag hashing uses Poseidon;
encryption uses ChaCha20-Poly1305 AEAD.
"""
from __future__ import annotations

import hashlib


def _ensure_32(value: bytes) -> bytes:
    """Ensure a value is exactly 32 bytes for Poseidon input.

    If already 32 bytes, returns as-is. Otherwise, BLAKE2b-256 hashes it.
    """
    if len(value) == 32:
        return value
    return hashlib.blake2b(value, digest_size=32).digest()


def hash_commitment(owner: bytes, data: bytes) -> bytes:
    """Poseidon-based commitment: Poseidon(owner_int, data_int).

    Interprets owner and data as big-endian field elements,
    returns the Poseidon hash as 32 bytes (big-endian).
    Variable-length inputs are hashed to 32 bytes via BLAKE2b first.
    """
    from agentic.ledger.poseidon import poseidon_hash_bytes
    return poseidon_hash_bytes(_ensure_32(owner), _ensure_32(data))


def hash_nullifier(nullifier_key: bytes, commitment: bytes, _nonce: bytes | None = None) -> bytes:
    """Poseidon-based nullifier: Poseidon(nullifier_key, commitment).

    Simplified from Zcash Orchard's scheme. The _nonce parameter is
    accepted for backward compatibility but ignored.
    Variable-length inputs are hashed to 32 bytes via BLAKE2b first.
    """
    from agentic.ledger.poseidon import poseidon_hash_bytes
    return poseidon_hash_bytes(_ensure_32(nullifier_key), _ensure_32(commitment))


def hash_tag(viewing_key: bytes, program_id: bytes, tag_nonce: bytes) -> bytes:
    """Poseidon-based tag: Poseidon(viewing_key_int, tag_nonce_int).

    The program_id is kept in signature for backward compatibility
    but is not used in the hash (the viewing_key already incorporates
    the owner's identity).
    Variable-length inputs are hashed to 32 bytes via BLAKE2b first.
    """
    from agentic.ledger.poseidon import poseidon_hash_bytes
    return poseidon_hash_bytes(_ensure_32(viewing_key), _ensure_32(tag_nonce))


def generate_key_pair(seed: int | bytes) -> dict[str, bytes]:
    """Deterministic key quadruple derived from a seed using BLAKE2b.

    spending_key   = BLAKE2b-256("Agentic:SpendingKey", seed)
    nullifier_key  = BLAKE2b-256("Agentic:NullifierKey", spending_key)
    viewing_key    = BLAKE2b-256("Agentic:ViewingKey", spending_key)
    public_key     = BLAKE2b-256("Agentic:PublicKey", spending_key)

    Accepts either a 32-byte seed or an integer (for backward compatibility).
    """
    if isinstance(seed, int):
        seed_bytes = seed.to_bytes(32, 'big')
    else:
        seed_bytes = seed

    spending_key = hashlib.blake2b(
        seed_bytes, key=b"Agentic:SpendingKey", digest_size=32
    ).digest()
    nullifier_key = hashlib.blake2b(
        spending_key, key=b"Agentic:NullifierKey", digest_size=32
    ).digest()
    viewing_key = hashlib.blake2b(
        spending_key, key=b"Agentic:ViewingKey", digest_size=32
    ).digest()
    public_key = hashlib.blake2b(
        spending_key, key=b"Agentic:PublicKey", digest_size=32
    ).digest()
    return {
        "spending_key": spending_key,
        "nullifier_key": nullifier_key,
        "viewing_key": viewing_key,
        "public_key": public_key,
    }


def encrypt_record(key: bytes, plaintext: bytes) -> bytes:
    """Encrypt using ChaCha20-Poly1305 AEAD.

    Returns: nonce (12 bytes) || ciphertext || tag (16 bytes)
    """
    import os
    from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
    nonce = os.urandom(12)
    cipher = ChaCha20Poly1305(key)
    ct = cipher.encrypt(nonce, plaintext, None)
    return nonce + ct


def decrypt_record(key: bytes, ciphertext: bytes) -> bytes:
    """Decrypt ChaCha20-Poly1305 AEAD.

    Expects: nonce (12 bytes) || ciphertext || tag (16 bytes)
    Raises ValueError if authentication fails.
    """
    from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
    if len(ciphertext) < 28:  # 12 nonce + 16 tag minimum
        raise ValueError("Ciphertext too short")
    nonce = ciphertext[:12]
    ct = ciphertext[12:]
    cipher = ChaCha20Poly1305(key)
    try:
        return cipher.decrypt(nonce, ct, None)
    except Exception as e:
        raise ValueError(f"Decryption failed: {e}") from e
