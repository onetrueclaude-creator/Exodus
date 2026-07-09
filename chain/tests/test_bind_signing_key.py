"""Tests for POST /api/bind-signing-key — admin-gated decoupled-key registration.

B4a: The chain admin binds an external (Phantom) ed25519 public key to a wallet
account so that subsequent signed writes are authorised by that key rather than
a custodial secret. The endpoint is called server-to-server by the Next.js
gateway after a verified SIWS binding (later task).
"""
import nacl.signing
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    """Fixture that patches _ADMIN_TOKEN directly and removes the dev bypass
    so we exercise the PROD signature path.

    Uses monkeypatch.setattr on the live api module instead of
    monkeypatch.setenv(...) + importlib.reload(api). reload() re-executes the
    module in place and permanently overwrites api._ADMIN_TOKEN in
    sys.modules — the same module object every other test imports — which
    monkeypatch's teardown cannot undo (it only restores the env var, not a
    module attribute mutated by a reload). That clobbered value used to leak
    into every test collected afterwards in the session: this file sorts
    before test_signed_writes_b4b.py, so it was the confirmed live instance
    of the #205 bug class fixed there in #208 (see #209). setattr is
    auto-restored at test teardown and touches no module identity.

    Returns (TestClient, api_module) so tests can inspect live state.
    """
    import agentic.testnet.api as api
    monkeypatch.setattr(api, "_ADMIN_TOKEN", "test-admin")
    # Production verify path: remove the dev bypass so verify_write checks sigs.
    # ALLOW_DEV_CUSTODIAL_SIGN is read inline (agentic.testnet.signing._dev_bypass
    # calls os.environ.get(...) at call time, not a module-level constant), so
    # delenv alone — no reload — already makes this take effect correctly.
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    # Use TestClient as context manager so startup/shutdown events fire.
    with TestClient(api.app) as c:
        # Ensure a clean genesis state with at least 3 wallets.
        c.post("/api/reset?wallets=10&seed=42",
               headers={"X-Admin-Token": "test-admin"})
        yield c, api


def test_bind_requires_admin_token(client):
    """Endpoint must reject requests with no admin token (403 Forbidden)."""
    c, _ = client
    r = c.post("/api/bind-signing-key",
               json={"wallet_index": 2, "signing_pubkey_hex": "00" * 32})
    assert r.status_code == 403


def test_bind_rejects_bad_hex(client):
    """Non-hex signing_pubkey_hex must return 400 Bad Request."""
    c, _ = client
    r = c.post("/api/bind-signing-key",
               headers={"X-Admin-Token": "test-admin"},
               json={"wallet_index": 2, "signing_pubkey_hex": "zz"})
    assert r.status_code == 400


def test_bind_rejects_out_of_range_index(client):
    """wallet_index that exceeds genesis wallet count must return 404 Not Found."""
    c, _ = client
    r = c.post("/api/bind-signing-key",
               headers={"X-Admin-Token": "test-admin"},
               json={"wallet_index": 99999, "signing_pubkey_hex": "00" * 32})
    assert r.status_code == 404


def test_bind_registers_key_enabling_signed_write(client):
    """Binding a key must persist it in account_signing_keys AND enable a
    subsequent signed write to pass verify_write without raising SignatureError."""
    c, api = client
    sk = nacl.signing.SigningKey.generate()
    pub_hex = bytes(sk.verify_key).hex()

    r = c.post("/api/bind-signing-key",
               headers={"X-Admin-Token": "test-admin"},
               json={"wallet_index": 2, "signing_pubkey_hex": pub_hex})
    assert r.status_code == 200
    assert r.json()["bound"] is True

    # Verify the bound key is stored in live state and a signed write validates.
    from agentic.testnet.signing import canonical_message, verify_write
    g = api._genesis
    owner = g.wallets[2].public_key
    params = {"foo": "bar"}
    msg = canonical_message("secure", params, owner.hex(), 0)
    sig = sk.sign(msg).signature.hex()
    verify_write(g, owner, "secure", params, sig, 0)   # must not raise
    assert g.account_nonces[owner] == 1
