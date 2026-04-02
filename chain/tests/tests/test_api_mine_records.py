"""Tests that /api/mine creates real ledger Records."""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import TEST_ADMIN_TOKEN

_ADMIN = {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture
def client():
    from agentic.testnet.api import app, _init_genesis
    _init_genesis()
    c = TestClient(app)
    # Mining requires claims to produce yields — seed them
    c.post("/api/reset?claims=25", headers=_ADMIN)
    return c


class TestMineCreatesRecords:
    def test_mine_changes_state_root(self, client):
        status1 = client.get("/api/status").json()
        root1 = status1["state_root"]

        from agentic.testnet import api as api_mod
        api_mod._last_block_time = 0.0
        resp = client.post("/api/mine")
        assert resp.status_code == 200

        status2 = client.get("/api/status").json()
        root2 = status2["state_root"]
        assert root1 != root2, "State root must change after mining"

    def test_mine_increases_record_count(self, client):
        status1 = client.get("/api/status").json()
        count1 = status1["record_count"]

        from agentic.testnet import api as api_mod
        api_mod._last_block_time = 0.0
        resp = client.post("/api/mine")
        assert resp.status_code == 200

        status2 = client.get("/api/status").json()
        count2 = status2["record_count"]
        assert count2 > count1, "Mining should create new Records"
