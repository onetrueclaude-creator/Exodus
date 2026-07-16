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

    r = client.post("/api/vault/shard", json={"wallet_index": 1, "shard_id": shard_id})
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
    r = client.post("/api/vault/shard", json={"wallet_index": 1, "shard_id": unowned})
    assert r.status_code == 404


def test_shard_bytes_endpoint_bad_wallet_404():
    client = TestClient(app)
    r = client.post("/api/vault/shard", json={"wallet_index": 99999, "shard_id": 0})
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
    shard_body = client.post("/api/vault/shard", json={"wallet_index": 1, "shard_id": shard_id}).json()
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


# --------------------------------------------------------------------------- #
# Possession-proof soundness regression suite (security fix:
# canonical-root binding) at the full HTTP accept path. Each encodes an attack
# from verify-possession-proof-soundness.md as MUST-REJECT and FAILS against
# the pre-fix accept path. Siblings of the weaker one-leaf
# test_submit_tampered_proof_rejected, which never covered a self-consistent
# forged tree.
# --------------------------------------------------------------------------- #

def test_submit_forged_tree_over_fabricated_bytes_rejected():
    """PoC-A/B over HTTP: a self-consistent proof over FABRICATED bytes (never
    held) for an OWNED shard WITH a real open challenge must be rejected — the
    server binds expected_root to its own canonical per-shard root (fix #1)."""
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    if not assignment["shards"]:
        pytest.skip("wallet 1 holds no shard in this seeding")
    shard_id = assignment["shards"][0]
    ch = client.post("/api/vault/challenge",
                     json={"wallet_index": 1, "shard_id": shard_id}).json()
    g = api_module._g()
    from agentic.vault.pdp import build_shard_tree, make_proof
    real_units = g.vault_registry.shard_sub_units(shard_id)
    canonical_root, _ = build_shard_tree(real_units)
    fabricated = sorted(f"FORGED-{i}".encode() for i in range(len(real_units)))
    forged = make_proof(fabricated, ch["indices"])
    assert forged["root"] != canonical_root
    resp = client.post("/api/vault/submit-proof", json={
        "wallet_index": 1, "shard_id": shard_id,
        "issued_block": ch["issued_block"], "expires_block": ch["expires_block"],
        "indices": ch["indices"], "block_seed_hex": ch["block_seed_hex"],
        "proof": forged,
    }).json()
    assert resp["accepted"] is False


def test_submit_proof_without_challenge_rejected():
    """Fix #2 over HTTP: a genuinely valid proof over real bytes for an OWNED
    shard but with NO server-issued challenge must be rejected."""
    client = TestClient(app)
    assignment = client.get("/api/vault/assignment/1").json()
    if not assignment["shards"]:
        pytest.skip("wallet 1 holds no shard in this seeding")
    shard_id = assignment["shards"][0]
    g = api_module._g()
    from agentic.vault.pdp import make_proof
    units = g.vault_registry.shard_sub_units(shard_id)
    indices = [0]
    proof = make_proof(units, indices)                # a genuinely valid proof
    # NOTE: no /api/vault/challenge call at all
    resp = client.post("/api/vault/submit-proof", json={
        "wallet_index": 1, "shard_id": shard_id,
        "issued_block": 0, "expires_block": 10**9,
        "indices": indices, "block_seed_hex": "00" * 32,
        "proof": proof,
    }).json()
    assert resp["accepted"] is False


def test_submit_proof_for_unowned_shard_rejected():
    """PoC-B end to end: wallet 1 earns NO Disk-fact for a data shard it is not
    responsible for and never requested a challenge for (fixes #2 + #3). Also
    asserts no durable pin/audit row is written for the attacker."""
    client = TestClient(app)
    g = api_module._g()
    owned = set(client.get("/api/vault/assignment/1").json()["shards"])
    data_shards = [s for s in range(16) if g.vault_registry.shard_sub_units(s)]
    target = next((s for s in data_shards if s not in owned), None)
    if target is None:
        pytest.skip("no data shard unowned by wallet 1 in this seeding")
    from agentic.vault.pdp import make_proof
    fabricated = sorted(f"FORGED-{i}".encode() for i in range(6))
    indices = [0, 2, 4]
    forged = make_proof(fabricated, indices)
    resp = client.post("/api/vault/submit-proof", json={
        "wallet_index": 1, "shard_id": target,
        "issued_block": 0, "expires_block": 10**9,
        "indices": indices, "block_seed_hex": "00" * 32,
        "proof": forged,
    }).json()
    assert resp["accepted"] is False
    # no durable pin row / passed audit was created for the non-holder
    pins = client.get("/api/vault/pins/1").json()
    row = next((p for p in pins["pins"] if p["shard_id"] == target), None)
    assert row is None or row["passes"] == 0
