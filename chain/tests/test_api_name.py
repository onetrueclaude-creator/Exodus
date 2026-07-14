"""Tests for the owner-name endpoints (/api/name) and /api/agents owner_name.

Every wallet has a unique, human owner-name: random-looking but deterministic by
default (derived from the pubkey), player-changeable, uniqueness-enforced.
"""
import pytest
from fastapi.testclient import TestClient

from agentic.testnet.api import app
from tests.conftest import reset_chain, seat_player_claims


@pytest.fixture
def client():
    """Fresh genesis per test so name mutations don't leak between tests."""
    with TestClient(app) as c:
        reset_chain(c, wallets=50, seed=42)
        yield c


def test_get_returns_default_name(client):
    # Default names are deterministic: wallet 0 is the Singularity, others are
    # the first 6 hex chars of their pubkey.
    r0 = client.get("/api/name/0")
    assert r0.status_code == 200
    assert r0.json() == {"wallet_index": 0, "name": "singularity"}

    r1 = client.get("/api/name/1")
    assert r1.status_code == 200
    body = r1.json()
    assert body["wallet_index"] == 1
    assert len(body["name"]) == 6  # pubkey-hex[:6]


def test_post_sets_name_and_get_reflects_it(client):
    r = client.post("/api/name", json={"wallet_index": 1, "name": "Neo"})
    assert r.status_code == 200
    assert r.json() == {"wallet_index": 1, "name": "Neo", "success": True}

    r2 = client.get("/api/name/1")
    assert r2.status_code == 200
    assert r2.json()["name"] == "Neo"


def test_post_duplicate_name_conflicts(client):
    # Wallet 1 takes "Trinity"; wallet 2 cannot (case-insensitive).
    assert client.post("/api/name", json={"wallet_index": 1, "name": "Trinity"}).status_code == 200
    dup = client.post("/api/name", json={"wallet_index": 2, "name": "trinity"})
    assert dup.status_code == 409
    assert dup.json()["detail"] == "Name taken"
    # Re-setting the same wallet to its own name is allowed (not a conflict).
    assert client.post("/api/name", json={"wallet_index": 1, "name": "Trinity"}).status_code == 200


def test_post_invalid_chars_rejected(client):
    bad = client.post("/api/name", json={"wallet_index": 1, "name": "bad name!"})
    assert bad.status_code == 400
    # Empty / whitespace-only and over-length also rejected.
    assert client.post("/api/name", json={"wallet_index": 1, "name": "   "}).status_code == 400
    assert client.post("/api/name", json={"wallet_index": 1, "name": "x" * 25}).status_code == 400


def test_post_out_of_range_wallet_404(client):
    assert client.post("/api/name", json={"wallet_index": 9999, "name": "Morpheus"}).status_code == 404
    assert client.get("/api/name/9999").status_code == 404


def test_agents_include_owner_name(client):
    # Genesis seats only the Singularity at the origin; seat a player too.
    seat_player_claims([(20, 0)], wallet_index=1)
    client.post("/api/name", json={"wallet_index": 1, "name": "Cipher"})

    agents = client.get("/api/agents?user_count=3").json()
    assert agents
    for a in agents:
        assert "owner_name" in a

    singular = [a for a in agents if a["is_singularity"]]
    assert len(singular) == 1
    assert singular[0]["owner_name"] == "singularity"

    player = [a for a in agents if a["owner_name"] == "Cipher"]
    assert len(player) == 1
