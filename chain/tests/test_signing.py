import pytest
import nacl.signing

from agentic.ledger.crypto import sign_ed25519, verify_ed25519
from agentic.testnet.signing import canonical_message, verify_write, SignatureError


def _keypair():
    sk = nacl.signing.SigningKey.generate()
    return bytes(sk), bytes(sk.verify_key)


# --- crypto primitives ---

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


# --- canonical message + verify_write nonce gate ---

class _G:  # minimal stand-in for GenesisState
    def __init__(self):
        self.account_nonces = {}
        self.account_signing_keys = {}


def test_canonical_message_is_deterministic():
    a = canonical_message("secure", {"duration_blocks": 5}, "ab", 0, "testnet")
    b = canonical_message("secure", {"duration_blocks": 5}, "ab", 0, "testnet")
    assert a == b and a.startswith(b"Agentic:Tx:v1")


def test_verify_write_dev_bypass(monkeypatch):
    monkeypatch.setenv("ALLOW_DEV_CUSTODIAL_SIGN", "1")
    g = _G()
    verify_write(g, b"owner", "secure", {"duration_blocks": 5}, None, None)  # no raise


def test_verify_write_accepts_valid_sig_and_bumps_nonce(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    sk = nacl.signing.SigningKey.generate()
    owner, pub = b"owner-key", bytes(sk.verify_key)
    g = _G()
    g.account_signing_keys[owner] = pub
    params = {"duration_blocks": 5}
    msg = canonical_message("secure", params, owner.hex(), 0, "testnet")
    sig = sign_ed25519(bytes(sk), msg).hex()
    verify_write(g, owner, "secure", params, sig, 0)
    assert g.account_nonces[owner] == 1


def test_verify_write_rejects_bad_sig(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    pub = bytes(nacl.signing.SigningKey.generate().verify_key)
    g = _G()
    g.account_signing_keys[b"owner"] = pub
    with pytest.raises(SignatureError):
        verify_write(g, b"owner", "secure", {"duration_blocks": 5}, "00" * 64, 0)


def test_verify_write_rejects_stale_nonce(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    sk = nacl.signing.SigningKey.generate()
    owner, pub = b"owner", bytes(sk.verify_key)
    g = _G()
    g.account_signing_keys[owner] = pub
    g.account_nonces[owner] = 5
    params = {"duration_blocks": 5}
    msg = canonical_message("secure", params, owner.hex(), 0, "testnet")  # nonce 0, expected 5
    sig = sign_ed25519(bytes(sk), msg).hex()
    with pytest.raises(SignatureError):
        verify_write(g, owner, "secure", params, sig, 0)


def test_verify_write_rejects_unbound_account(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    with pytest.raises(SignatureError):
        verify_write(_G(), b"nobody", "secure", {}, "00" * 64, 0)


# --- endpoint-level enforcement (bypass OFF) ---

def test_secure_endpoint_enforces_signature(monkeypatch):
    from fastapi.testclient import TestClient
    import nacl.signing
    from agentic.testnet import api as api_module
    from agentic.testnet.signing import canonical_message
    from agentic.ledger.crypto import sign_ed25519

    client = TestClient(api_module.app)
    client.post("/api/reset", headers={"X-Admin-Token": "test-admin-token"})
    g = api_module._g()
    sk = nacl.signing.SigningKey.generate()
    owner = g.wallets[1].public_key
    g.account_signing_keys[owner] = bytes(sk.verify_key)
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)

    # Unsigned write → 401
    r = client.post("/api/secure", json={"wallet_index": 1, "duration_blocks": 5})
    assert r.status_code == 401

    # Correctly-signed write with the expected nonce → auth passes (NOT 401)
    params = {"wallet_index": 1, "duration_blocks": 5}
    msg = canonical_message("secure", params, owner.hex(), 0)
    sig = sign_ed25519(bytes(sk), msg).hex()
    r2 = client.post("/api/secure", json={**params, "signature": sig, "nonce": 0})
    assert r2.status_code != 401
