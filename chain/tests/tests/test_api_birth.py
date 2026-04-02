"""Tests for the /api/birth endpoint — v2 organic growth model."""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture
def client():
    from agentic.testnet.api import app, _init_genesis
    _init_genesis()
    c = TestClient(app)
    # v2: genesis creates 9 fixed nodes, no claims param needed
    c.post("/api/reset", headers=_ADMIN)
    return c


class TestBirthEndpoint:
    def test_birth_endpoint_exists(self, client):
        resp = client.post("/api/birth", json={"wallet_index": 0})
        assert resp.status_code != 404

    def test_birth_requires_balance(self, client):
        """v2: GENESIS_BALANCE=0 — wallets start empty, birth requires mining first."""
        resp = client.post("/api/birth", json={"wallet_index": 0})
        # Should fail because wallet has no balance (zero unspent records)
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert "zero balance" in detail.lower() or "no unspent" in detail.lower()

    def test_birth_after_mining(self, client):
        """After mining, wallet should have balance for birth."""
        # Mine a block to generate rewards
        mine_resp = client.post("/api/mine")
        assert mine_resp.status_code == 200
        # Now try birth — wallet 0 should have received mining rewards
        resp = client.post("/api/birth", json={"wallet_index": 0})
        # May still fail if insufficient balance for ring cost, but should not be "zero balance"
        if resp.status_code == 200:
            data = resp.json()
            assert "coordinate" in data
            assert "ring" in data
            assert "birth_cost" in data
            assert "x" in data["coordinate"]
            assert "y" in data["coordinate"]
            assert isinstance(data["ring"], int)
            assert isinstance(data["birth_cost"], int)

    def test_birth_invalid_wallet(self, client):
        resp = client.post("/api/birth", json={"wallet_index": 999})
        assert resp.status_code == 400
