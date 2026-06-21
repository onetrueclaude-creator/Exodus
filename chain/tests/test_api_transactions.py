"""Tests for earn-by-securing + GET /api/transactions + transact-by-name.

Covers:
  - an accepted possession proof mints spendable AGNTC to the prover, enough that
    a subsequent small transact succeeds (the earn-source for player↔player txs);
  - GET /api/transactions is empty initially and reflects a successful transfer
    with from/to/amount, most-recent-first;
  - recipient_name resolution works and 404s on an unknown name.
"""
import pytest
from fastapi.testclient import TestClient

from agentic.testnet import api as api_module
from agentic.testnet.api import app
from tests.conftest import seat_player_claims


@pytest.fixture(autouse=True)
def _fresh_chain(admin_headers):
    """Fresh genesis + several distinct seated owners so shard ownership is
    distributed (so a wallet actually owns a shard to prove)."""
    client = TestClient(app)
    client.post("/api/reset", headers=admin_headers)
    seat_player_claims([(20, 0)], wallet_index=1)
    seat_player_claims([(0, 20)], wallet_index=2)
    seat_player_claims([(-20, 0)], wallet_index=3)
    seat_player_claims([(0, -20)], wallet_index=4)
    seat_player_claims([(20, 20)], wallet_index=5)
    api_module._refresh_vault_owners()
    yield client


def _drive_accepted_proof(client: TestClient, wallet_index: int) -> bool:
    """Drive a full challenge→submit-proof roundtrip for a wallet that owns a
    shard (same flow as test_api_vault). Returns True if a proof was accepted."""
    assignment = client.get(f"/api/vault/assignment/{wallet_index}").json()
    if not assignment["shards"]:
        return False
    shard_id = assignment["shards"][0]
    ch = client.post(
        "/api/vault/challenge",
        json={"wallet_index": wallet_index, "shard_id": shard_id},
    ).json()
    g = api_module._g()
    from agentic.vault.pdp import make_proof
    units = g.vault_registry.shard_sub_units(shard_id)
    proof = make_proof(units, ch["indices"])
    resp = client.post("/api/vault/submit-proof", json={
        "wallet_index": wallet_index, "shard_id": shard_id,
        "issued_block": ch["issued_block"], "expires_block": ch["expires_block"],
        "indices": ch["indices"], "block_seed_hex": ch["block_seed_hex"],
        "proof": proof,
    }).json()
    return bool(resp["accepted"])


def _find_proving_wallet(client: TestClient) -> int:
    """Return a wallet index that owns at least one shard (so it can prove)."""
    for wi in (1, 2, 3, 4, 5):
        if client.get(f"/api/vault/assignment/{wi}").json()["shards"]:
            return wi
    pytest.skip("no seeded wallet owns a shard in this seeding")


# --------------------------------------------------------------------------- #
# (a) earn-by-securing: accepted proof → spendable balance → transact succeeds
# --------------------------------------------------------------------------- #


def test_accepted_proof_credits_spendable_agntc_enough_to_transact():
    client = TestClient(app)
    prover = _find_proving_wallet(client)

    # Before proving, the prover has no spendable AGNTC: a transact must fail.
    recipient = 2 if prover != 2 else 3
    pre = client.post("/api/transact", json={
        "sender_wallet": prover, "recipient_wallet": recipient, "amount": 0.1,
    })
    assert pre.status_code == 400  # zero balance

    # Prove possession → mints SECURE_AGNTC_REWARD (1.0 AGNTC) to the prover.
    assert _drive_accepted_proof(client, prover) is True

    # Now a small transfer (well under 1.0 AGNTC) succeeds from the earned reward.
    resp = client.post("/api/transact", json={
        "sender_wallet": prover, "recipient_wallet": recipient, "amount": 0.1,
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True


# --------------------------------------------------------------------------- #
# (b) GET /api/transactions: empty initially, then reflects a transfer
# --------------------------------------------------------------------------- #


def test_transactions_empty_initially():
    client = TestClient(app)
    body = client.get("/api/transactions").json()
    assert body["transactions"] == []


def test_transactions_reflect_successful_transfer():
    client = TestClient(app)
    prover = _find_proving_wallet(client)
    recipient = 2 if prover != 2 else 3
    assert _drive_accepted_proof(client, prover) is True

    resp = client.post("/api/transact", json={
        "sender_wallet": prover, "recipient_wallet": recipient, "amount": 0.05,
    })
    assert resp.status_code == 200, resp.text

    txs = client.get("/api/transactions").json()["transactions"]
    assert len(txs) >= 1
    tx = txs[0]  # most-recent-first
    g = api_module._g()
    assert tx["from"] == g.wallets[prover].public_key.hex()
    assert tx["to"] == g.wallets[recipient].public_key.hex()
    assert tx["amount"] == 0.05
    assert "from_name" in tx and "to_name" in tx
    assert "block" in tx


# --------------------------------------------------------------------------- #
# (c) recipient_name resolution + 404 on unknown name
# --------------------------------------------------------------------------- #


def test_transact_by_recipient_name_resolves():
    client = TestClient(app)
    prover = _find_proving_wallet(client)
    recipient = 2 if prover != 2 else 3
    # Give the recipient a known name.
    client.post("/api/name", json={"wallet_index": recipient, "name": "Trinity"})
    assert _drive_accepted_proof(client, prover) is True

    resp = client.post("/api/transact", json={
        "sender_wallet": prover, "recipient_name": "trinity", "amount": 0.05,
    })
    assert resp.status_code == 200, resp.text
    # Resolved to the recipient's index.
    assert resp.json()["recipient_wallet"] == recipient

    txs = client.get("/api/transactions").json()["transactions"]
    assert txs[0]["to_name"] == "Trinity"


def test_transact_by_unknown_recipient_name_404():
    client = TestClient(app)
    prover = _find_proving_wallet(client)
    assert _drive_accepted_proof(client, prover) is True
    resp = client.post("/api/transact", json={
        "sender_wallet": prover, "recipient_name": "does-not-exist", "amount": 0.05,
    })
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Recipient name not found"
