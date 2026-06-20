"""Integration tests for /api/vault/* + securing rewire (Proof-of-Vault)."""
import pytest
from fastapi.testclient import TestClient

from agentic.testnet import api as api_module
from agentic.testnet.api import app
from tests.conftest import seat_player_claims


@pytest.fixture(autouse=True)
def _fresh_chain(admin_headers):
    client = TestClient(app)
    client.post("/api/reset", headers=admin_headers)
    # Seat several DISTINCT player owners so shard ownership is actually
    # distributed. With replication factor 3, any owner set of size <= 3 makes
    # every owner a replica of every populated shard (so no shard is "unowned"
    # by a given wallet). Seat 5 distinct wallets (+ the genesis Singularity =
    # 6 owners) so each wallet owns a proper subset of shards — this lets both
    # the roundtrip test (wallet owns >=1 shard) and the 404 test (some shard
    # is unowned by the wallet) hold.
    seat_player_claims([(20, 0)], wallet_index=1)
    seat_player_claims([(0, 20)], wallet_index=2)
    seat_player_claims([(-20, 0)], wallet_index=3)
    seat_player_claims([(0, -20)], wallet_index=4)
    seat_player_claims([(20, 20)], wallet_index=5)
    # re-run owner assignment now that seats exist
    api_module._refresh_vault_owners()
    yield client


def test_vault_root_endpoint():
    client = TestClient(app)
    r = client.get("/api/vault/root")
    assert r.status_code == 200
    body = r.json()
    assert len(body["root_cid"]) == 64
    assert body["atom_count"] > 0
    assert body["shard_count"] == 16
    assert body["replication_factor"] == 3


def test_vault_assignment_lists_owner_shards():
    client = TestClient(app)
    r = client.get("/api/vault/assignment/1")
    assert r.status_code == 200
    body = r.json()
    assert body["wallet_index"] == 1
    assert isinstance(body["shards"], list)


def test_full_challenge_submit_proof_roundtrip():
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    if not assignment["shards"]:
        pytest.skip("wallet 1 holds no shard in this seeding")
    shard_id = assignment["shards"][0]

    ch = client.post("/api/vault/challenge",
                     json={"wallet_index": 1, "shard_id": shard_id}).json()
    assert ch["shard_id"] == shard_id
    assert len(ch["indices"]) > 0

    # build the proof on the coordinator's own shard data (testnet trust model)
    g = api_module._g()
    from agentic.vault.pdp import make_proof
    units = g.vault_registry.shard_sub_units(shard_id)
    proof = make_proof(units, ch["indices"])

    resp = client.post("/api/vault/submit-proof", json={
        "wallet_index": 1, "shard_id": shard_id,
        "issued_block": ch["issued_block"], "expires_block": ch["expires_block"],
        "indices": ch["indices"], "block_seed_hex": ch["block_seed_hex"],
        "proof": proof,
    }).json()
    assert resp["accepted"] is True
    assert resp["cpu_credit"] == 50.0


def test_submit_tampered_proof_rejected():
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    if not assignment["shards"]:
        pytest.skip("wallet 1 holds no shard in this seeding")
    shard_id = assignment["shards"][0]
    ch = client.post("/api/vault/challenge",
                     json={"wallet_index": 1, "shard_id": shard_id}).json()
    g = api_module._g()
    from agentic.vault.pdp import make_proof
    units = g.vault_registry.shard_sub_units(shard_id)
    proof = make_proof(units, ch["indices"])
    proof["leaves"][str(ch["indices"][0])] = "ff" * 32  # JSON keys are strings
    resp = client.post("/api/vault/submit-proof", json={
        "wallet_index": 1, "shard_id": shard_id,
        "issued_block": ch["issued_block"], "expires_block": ch["expires_block"],
        "indices": ch["indices"], "block_seed_hex": ch["block_seed_hex"],
        "proof": proof,
    }).json()
    assert resp["accepted"] is False


def test_challenge_for_unowned_shard_404():
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    owned = set(assignment["shards"])
    unowned = next(s for s in range(16) if s not in owned)
    r = client.post("/api/vault/challenge",
                    json={"wallet_index": 1, "shard_id": unowned})
    assert r.status_code == 404


def test_shard_bytes_endpoint_serves_owner_sub_units():
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    if not assignment["shards"]:
        pytest.skip("wallet 1 holds no shard in this seeding")
    shard_id = assignment["shards"][0]

    r = client.get(f"/api/vault/shard/{shard_id}?wallet_index=1")
    assert r.status_code == 200
    body = r.json()
    assert body["shard_id"] == shard_id
    assert isinstance(body["sub_units"], list)
    assert body["count"] == len(body["sub_units"])
    assert body["count"] > 0
    # served entries are hex strings that decode to bytes
    for u in body["sub_units"]:
        assert isinstance(u, str)
        bytes.fromhex(u)  # raises if not valid hex

    # served bytes match what the registry holds for that shard
    g = api_module._g()
    units = g.vault_registry.shard_sub_units(shard_id)
    assert body["sub_units"] == [u.hex() for u in units]


def test_shard_bytes_endpoint_unowned_shard_404():
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    owned = set(assignment["shards"])
    unowned = next(s for s in range(16) if s not in owned)
    r = client.get(f"/api/vault/shard/{unowned}?wallet_index=1")
    assert r.status_code == 404


def test_shard_bytes_endpoint_bad_wallet_404():
    client = TestClient(app)
    r = client.get("/api/vault/shard/0?wallet_index=99999")
    assert r.status_code == 404


def test_client_builds_valid_proof_from_served_shard_bytes():
    """End-to-end 'player's machine proves' model: fetch a shard's sub_units
    via the endpoint, decode them client-side, and build a Merkle proof from
    ONLY those bytes that verify_proof accepts against the challenge."""
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    if not assignment["shards"]:
        pytest.skip("wallet 1 holds no shard in this seeding")
    shard_id = assignment["shards"][0]

    # 1. fetch the full sub-unit list from the new endpoint (what the browser sees)
    shard_body = client.get(f"/api/vault/shard/{shard_id}?wallet_index=1").json()
    sub_units = [bytes.fromhex(u) for u in shard_body["sub_units"]]

    # 2. get a challenge (the indices to spot-check)
    ch = client.post("/api/vault/challenge",
                     json={"wallet_index": 1, "shard_id": shard_id}).json()
    assert len(ch["indices"]) > 0

    # 3. build the proof purely from the served bytes (the TS client does this)
    from agentic.vault.pdp import make_proof, verify_proof
    proof = make_proof(sub_units, ch["indices"])

    # 4. that proof verifies against the challenge root — a client CAN prove
    #    possession using only what this endpoint serves.
    assert verify_proof(ch["indices"], proof["root"], proof) is True

    # and the chain accepts it end-to-end
    resp = client.post("/api/vault/submit-proof", json={
        "wallet_index": 1, "shard_id": shard_id,
        "issued_block": ch["issued_block"], "expires_block": ch["expires_block"],
        "indices": ch["indices"], "block_seed_hex": ch["block_seed_hex"],
        "proof": proof,
    }).json()
    assert resp["accepted"] is True
