"""Auth tests for POST /api/vault/shard (#221).

Every test here runs with the B3 signature gate ACTIVE (dev bypass explicitly
off via monkeypatch.delenv) -- this is the file that proves the shard-fetch
route enforces Ed25519 auth + per-account nonce replay protection exactly
like its `/api/vault/challenge` and `/api/vault/submit-proof` siblings.

See docs/superpowers/specs/2026-07-16-issue-221-shard-route-auth-design.md
Section 9 ("Test plan") for the discriminating test table (A1-A9) this file
implements.
"""
import json as _json

import nacl.signing
import pytest
from fastapi.testclient import TestClient

from agentic.testnet import api as api_module
from agentic.testnet.api import app
from agentic.testnet.signing import canonical_message
from tests.conftest import seat_player_claims

WALLET_IDX = 1


def _bind(g, idx, sk):
    owner = g.wallets[idx].public_key
    g.account_signing_keys[owner] = bytes(sk.verify_key)
    return owner


class _SignedCtx:
    def __init__(self, client, g, sk, owner):
        self.client = client
        self.g = g
        self.sk = sk
        self.owner = owner
        self.owner_hex = owner.hex()

    def nonce(self) -> int:
        return self.g.account_nonces.get(self.owner, 0)

    def owned_shard(self) -> int:
        shards = self.g.vault_registry.shards_for_owner(self.owner_hex)
        assert shards, "fixture wallet holds no shard in this seeding -- reseed"
        return shards[0]

    def unowned_shard(self) -> int:
        owned = set(self.g.vault_registry.shards_for_owner(self.owner_hex))
        return next(s for s in range(16) if s not in owned)

    def sign(self, action: str, signed_params: dict, nonce: int, sk=None) -> str:
        msg = canonical_message(action, signed_params, self.owner_hex, nonce)
        signer = sk if sk is not None else self.sk
        return signer.sign(msg).signature.hex()

    def fetch_body(self, shard_id: int, *, nonce: int | None = None, sk=None, wallet_index: int = WALLET_IDX) -> dict:
        n = self.nonce() if nonce is None else nonce
        sig = self.sign("vault_shard_fetch", {"shard_id": shard_id}, n, sk=sk)
        return {"wallet_index": wallet_index, "shard_id": shard_id, "signature": sig, "nonce": n}


@pytest.fixture
def signed_ctx(admin_headers, monkeypatch) -> _SignedCtx:
    """Bypass-off fresh chain with several distinct owners (mirrors
    test_api_vault.py's _fresh_chain -- distinct owners so shard ownership is
    a proper subset, letting both the owned- and unowned-shard cases hold)
    plus a bound Ed25519 signing key for WALLET_IDX."""
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    client = TestClient(app)
    client.post("/api/reset", headers=admin_headers)
    seat_player_claims([(20, 0)], wallet_index=1)
    seat_player_claims([(0, 20)], wallet_index=2)
    seat_player_claims([(-20, 0)], wallet_index=3)
    seat_player_claims([(0, -20)], wallet_index=4)
    seat_player_claims([(20, 20)], wallet_index=5)
    api_module._refresh_vault_owners()

    g = api_module._g()
    sk = nacl.signing.SigningKey.generate()
    owner = _bind(g, WALLET_IDX, sk)
    return _SignedCtx(client, g, sk, owner)


def test_a1_unauth_post_rejected(signed_ctx):
    """A1: no signature/nonce fields at all -> 401."""
    shard_id = signed_ctx.owned_shard()
    r = signed_ctx.client.post(
        "/api/vault/shard", json={"wallet_index": WALLET_IDX, "shard_id": shard_id}
    )
    assert r.status_code == 401


def test_a2_wrong_key_signature_rejected(signed_ctx):
    """A2: validly-shaped signature, but signed by a different key than the
    one bound to the account -> 401."""
    shard_id = signed_ctx.owned_shard()
    other_sk = nacl.signing.SigningKey.generate()
    body = signed_ctx.fetch_body(shard_id, sk=other_sk)
    r = signed_ctx.client.post("/api/vault/shard", json=body)
    assert r.status_code == 401


def test_a3_wrong_nonce_rejected(signed_ctx):
    """A3: correct key, wrong nonce -> 401 with a 'bad nonce' detail."""
    shard_id = signed_ctx.owned_shard()
    body = signed_ctx.fetch_body(shard_id, nonce=999)
    r = signed_ctx.client.post("/api/vault/shard", json=body)
    assert r.status_code == 401
    assert "bad nonce" in r.json()["detail"]


def test_a4_replay_rejected(signed_ctx):
    """A4: an identical signed request submitted twice -- the 2nd is a
    replay and must be rejected once the nonce has advanced."""
    shard_id = signed_ctx.owned_shard()
    body = signed_ctx.fetch_body(shard_id)

    r1 = signed_ctx.client.post("/api/vault/shard", json=body)
    assert r1.status_code == 200
    assert r1.json()["sub_units"]

    r2 = signed_ctx.client.post("/api/vault/shard", json=body)
    assert r2.status_code == 401


def test_a5_enrolled_assigned_bytes_match(signed_ctx):
    """A5: enrolled + assigned, properly signed -> 200, and the served bytes
    are byte-identical to what the registry holds for that shard."""
    shard_id = signed_ctx.owned_shard()
    body = signed_ctx.fetch_body(shard_id)
    r = signed_ctx.client.post("/api/vault/shard", json=body)
    assert r.status_code == 200
    resp = r.json()
    expected = [u.hex() for u in signed_ctx.g.vault_registry.shard_sub_units(shard_id)]
    assert resp["shard_id"] == shard_id
    assert resp["sub_units"] == expected
    assert resp["count"] == len(expected)


def test_a6_not_assigned_404(signed_ctx):
    """A6: enrolled + signed, but the shard is NOT in shards_for_owner -> 404."""
    shard_id = signed_ctx.unowned_shard()
    body = signed_ctx.fetch_body(shard_id)
    r = signed_ctx.client.post("/api/vault/shard", json=body)
    assert r.status_code == 404
    assert r.json()["detail"] == "Wallet not responsible for this shard"


def test_a7_bad_wallet_index_404(signed_ctx):
    """A7: wallet_index out of range -> 404 (checked before signature
    verification, matching every sibling signed route)."""
    r = signed_ctx.client.post(
        "/api/vault/shard", json={"wallet_index": 99999, "shard_id": 0}
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Wallet not found"


def test_a8_legacy_get_route_gone(signed_ctx):
    """A8: the old unauthenticated GET route must be gone entirely (404),
    not merely deprecated."""
    shard_id = signed_ctx.owned_shard()
    r = signed_ctx.client.get(f"/api/vault/shard/{shard_id}?wallet_index={WALLET_IDX}")
    assert r.status_code == 404


def test_a9_post_continuity_end_to_end(signed_ctx):
    """A9: PoSt continuity, bypass-off end-to-end -- bind -> signed fetch ->
    signed challenge -> pdp.make_proof over the FETCHED bytes -> signed
    submit-proof -> accepted. Extends the existing bypass-on flow test at
    test_api_vault.py::test_full_challenge_submit_proof_roundtrip to prove
    the whole PoSt loop still closes once every leg requires a signature.
    """
    from agentic.vault.pdp import make_proof

    g = signed_ctx.g
    shard_id = signed_ctx.owned_shard()

    # 1. signed fetch -- the client's only source of sub-unit bytes.
    fetch_body = signed_ctx.fetch_body(shard_id)
    r1 = signed_ctx.client.post("/api/vault/shard", json=fetch_body)
    assert r1.status_code == 200
    sub_units = [bytes.fromhex(u) for u in r1.json()["sub_units"]]

    # 2. signed challenge.
    ch_nonce = signed_ctx.nonce()
    ch_sig = signed_ctx.sign("vault_challenge", {"shard_id": shard_id}, ch_nonce)
    r2 = signed_ctx.client.post(
        "/api/vault/challenge",
        json={
            "wallet_index": WALLET_IDX, "shard_id": shard_id,
            "signature": ch_sig, "nonce": ch_nonce,
        },
    )
    assert r2.status_code == 200
    ch = r2.json()
    assert len(ch["indices"]) > 0

    # 3. build the proof purely from bytes obtained via the SIGNED fetch.
    proof = make_proof(sub_units, ch["indices"])
    # The wire only ever carries string-keyed JSON: the leaves/paths dict
    # keys arrive server-side as strings (JSON has no integer object keys),
    # so verify_write's canonical_message must be signed over that same
    # string-keyed shape -- a JSON round-trip reproduces it exactly (and
    # matches what the real TS client signs, since JS object keys are
    # always strings). Signing over the raw int-keyed dict would sort
    # differently (numeric vs lexicographic) and fail verification whenever
    # a two-digit index is sampled alongside a one-digit one.
    wire_proof = _json.loads(_json.dumps(proof))

    # 4. signed submit-proof.
    sp_nonce = signed_ctx.nonce()
    signed_submit_params = {
        "shard_id": shard_id,
        "issued_block": ch["issued_block"],
        "expires_block": ch["expires_block"],
        "indices": ch["indices"],
        "block_seed_hex": ch["block_seed_hex"],
        "proof": wire_proof,
    }
    sp_sig = signed_ctx.sign("vault_submit_proof", signed_submit_params, sp_nonce)
    r3 = signed_ctx.client.post(
        "/api/vault/submit-proof",
        json={
            "wallet_index": WALLET_IDX,
            **signed_submit_params,
            "signature": sp_sig,
            "nonce": sp_nonce,
        },
    )
    assert r3.status_code == 200
    assert r3.json()["accepted"] is True
