import pytest
import nacl.signing

from agentic.ledger.crypto import sign_ed25519, verify_ed25519


def _keypair():
    sk = nacl.signing.SigningKey.generate()
    return bytes(sk), bytes(sk.verify_key)


def test_sign_verify_roundtrip():
    secret, public = _keypair()
    msg = b"hello-agentic"
    sig = sign_ed25519(secret, msg)
    assert verify_ed25519(public, msg, sig) is True


def test_verify_rejects_tampered_message():
    secret, public = _keypair()
    sig = sign_ed25519(secret, b"original")
    assert verify_ed25519(public, b"tampered", sig) is False


def test_verify_rejects_wrong_key():
    secret, _ = _keypair()
    _, other_public = _keypair()
    sig = sign_ed25519(secret, b"msg")
    assert verify_ed25519(other_public, b"msg", sig) is False


def test_verify_rejects_garbage_signature():
    _, public = _keypair()
    assert verify_ed25519(public, b"msg", b"\x00" * 64) is False
