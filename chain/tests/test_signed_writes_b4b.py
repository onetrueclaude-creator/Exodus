# chain/tests/test_signed_writes_b4b.py
import nacl.signing
import pytest
from agentic.testnet.genesis import create_genesis
from agentic.testnet.signing import canonical_message, verify_write, SignatureError


def _bind(g, idx, sk):
    owner = g.wallets[idx].public_key
    g.account_signing_keys[owner] = bytes(sk.verify_key)
    return owner


def test_signature_is_invariant_under_wallet_index(monkeypatch):
    # The gateway rewrites wallet_index; the signed canonical message must ignore it.
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    g = create_genesis(seed=1)
    sk = nacl.signing.SigningKey.generate()
    owner = _bind(g, 2, sk)

    # Client signs params WITHOUT the wallet-index keys.
    signed_params = {"duration_blocks": 10}
    msg = canonical_message("secure", signed_params, owner.hex(), 0)
    sig = sk.sign(msg).signature.hex()

    # Chain receives params WITH a wallet_index (any value) — verify must strip it.
    received = {"wallet_index": 999, "duration_blocks": 10}
    verify_write(g, owner, "secure", received, sig, 0)  # must NOT raise
    assert g.account_nonces[owner] == 1


def test_strips_all_wallet_key_aliases(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    g = create_genesis(seed=1)
    sk = nacl.signing.SigningKey.generate()
    owner = _bind(g, 3, sk)
    signed = {"text": "hi", "target_coord": {"x": 1, "y": 2}}
    sig = sk.sign(canonical_message("message", signed, owner.hex(), 0)).signature.hex()
    received = {"sender_wallet": 5, "self_wallet": 9, "text": "hi", "target_coord": {"x": 1, "y": 2}}
    verify_write(g, owner, "message", received, sig, 0)  # must NOT raise


def test_transact_amount_signed_as_microagntc(monkeypatch):
    # amount is a float on the wire; signed as integer microAGNTC for parity.
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    g = create_genesis(seed=1)
    sk = nacl.signing.SigningKey.generate()
    owner = _bind(g, 4, sk)
    signed = {"amount": 5_500_000, "recipient_name": "alice", "recipient_wallet": None}
    sig = sk.sign(canonical_message("transact", signed, owner.hex(), 0)).signature.hex()
    # Simulate the endpoint's pre-verify transform of the float amount:
    from agentic.testnet.api import _transact_signed_params
    received = {"sender_wallet": 1, "recipient_wallet": None, "recipient_name": "alice", "amount": 5.5}
    verify_write(g, owner, "transact", _transact_signed_params(received), sig, 0)  # must NOT raise


def test_nonce_endpoint_returns_sign_context():
    from fastapi.testclient import TestClient
    import agentic.testnet.api as api
    with TestClient(api.app) as c:
        c.post("/api/reset?wallets=10&seed=7", headers={"X-Admin-Token": "x"}) if api._ADMIN_TOKEN else None
        r = c.get("/api/nonce/2")
        assert r.status_code == 200
        body = r.json()
        assert body["wallet_index"] == 2
        assert "nonce" in body
        assert body["chain_id"] == "testnet"
        # owner_hex is the wallet's public key hex
        assert body["owner_hex"] == api._g().wallets[2].public_key.hex()


def test_secure_endpoint_rejects_unsigned_when_bypass_off(monkeypatch):
    """Production posture: unsigned secure → 401; correctly-signed secure → 200.

    Proves Task 1 enforcement without any code change: ALLOW_DEV_CUSTODIAL_SIGN
    absent means verify_write runs; a missing signature must be rejected, and a
    valid ed25519 signature over the canonical message must be accepted.

    Uses wallet 0 (the genesis claim holder) so the secured wallet already owns
    a node — this lets us hit 200 on success rather than stopping at 400 "no claim".
    """
    import importlib
    import agentic.testnet.api as api
    from fastapi.testclient import TestClient
    from agentic.testnet.signing import canonical_message

    monkeypatch.setenv("ADMIN_TOKEN", "test-admin")
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    importlib.reload(api)

    with TestClient(api.app) as c:
        # Reset to a known state; wallet 0 always holds the genesis claim.
        c.post(
            "/api/reset?wallets=10&seed=42",
            headers={"X-Admin-Token": "test-admin"},
        )

        # Bind a fresh ed25519 key to wallet 0 in the live in-memory state.
        sk = nacl.signing.SigningKey.generate()
        g = api._g()
        owner = g.wallets[0].public_key
        g.account_signing_keys[owner] = bytes(sk.verify_key)

        # --- RED path: unsigned request must be rejected (401) ---
        r = c.post("/api/secure", json={"wallet_index": 0, "duration_blocks": 10})
        assert r.status_code == 401, (
            f"Expected 401 for unsigned write, got {r.status_code}: {r.text}"
        )

        # --- GREEN path: correctly-signed request must be accepted (200) ---
        nonce = g.account_nonces.get(owner, 0)
        # Sign only the non-wallet-key params (wallet_index is stripped by verify_write).
        signed_params = {"duration_blocks": 10}
        msg = canonical_message("secure", signed_params, owner.hex(), nonce)
        sig = sk.sign(msg).signature.hex()

        r2 = c.post(
            "/api/secure",
            json={
                "wallet_index": 0,
                "duration_blocks": 10,
                "signature": sig,
                "nonce": nonce,
            },
        )
        assert r2.status_code == 200, (
            f"Expected 200 for correctly-signed write, got {r2.status_code}: {r2.text}"
        )
