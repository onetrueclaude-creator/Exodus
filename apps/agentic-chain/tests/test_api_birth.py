"""Tests for the /api/birth endpoint."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from agentic.testnet.api import app, _init_genesis
    _init_genesis()
    c = TestClient(app)
    # Birth requires a home star — seed claims for the test
    c.post("/api/reset?claims=25")
    return c


class TestBirthEndpoint:
    def test_birth_endpoint_exists(self, client):
        resp = client.post("/api/birth", json={"wallet_index": 0})
        assert resp.status_code != 404

    def test_birth_creates_star_system(self, client):
        resp = client.post("/api/birth", json={"wallet_index": 0})
        assert resp.status_code == 200
        data = resp.json()
        assert "coordinate" in data
        assert "ring" in data
        assert "birth_cost" in data

    def test_birth_returns_proper_structure(self, client):
        resp = client.post("/api/birth", json={"wallet_index": 0})
        assert resp.status_code == 200
        data = resp.json()
        assert "x" in data["coordinate"]
        assert "y" in data["coordinate"]
        assert isinstance(data["ring"], int)
        assert isinstance(data["birth_cost"], int)

    def test_birth_invalid_wallet(self, client):
        resp = client.post("/api/birth", json={"wallet_index": 999})
        assert resp.status_code == 400
