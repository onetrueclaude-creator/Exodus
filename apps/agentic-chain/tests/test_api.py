"""Tests for the FastAPI testnet API."""
import json

import pytest
from fastapi.testclient import TestClient

from agentic.testnet.api import app
from agentic.galaxy.coordinate import GLOBAL_BOUNDS
GRID_MIN = GLOBAL_BOUNDS.min_val
GRID_MAX = GLOBAL_BOUNDS.max_val


@pytest.fixture(scope="module")
def client():
    """Create a TestClient that triggers startup/shutdown events."""
    with TestClient(app) as c:
        # Zero genesis has no claims — seed 25 for tests that expect them
        c.post("/api/reset?wallets=50&claims=25&seed=42")
        yield c


class TestStatus:
    def test_status_returns_all_fields(self, client):
        resp = client.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "state_root" in data
        assert "record_count" in data
        assert "total_claims" in data
        assert "blocks_processed" in data
        assert "total_mined" in data
        assert "next_block_in" in data
        # state_root should be a hex string
        assert isinstance(data["state_root"], str)
        assert len(data["state_root"]) == 64  # 32 bytes hex
        # next_block_in is a non-negative number
        assert data["next_block_in"] >= 0


class TestCoordinate:
    def test_coordinate_valid(self, client):
        resp = client.get("/api/coordinate/0/0")
        assert resp.status_code == 200
        data = resp.json()
        assert data["x"] == 0
        assert data["y"] == 0
        assert "density" in data
        assert 0.0 <= data["density"] <= 1.0
        assert "storage_slots" in data
        assert 1 <= data["storage_slots"] <= 10
        assert "claimed" in data
        assert isinstance(data["claimed"], bool)

    def test_coordinate_out_of_range(self, client):
        out = GRID_MAX + 1
        resp = client.get(f"/api/coordinate/{out}/0")
        assert resp.status_code == 400

        resp2 = client.get(f"/api/coordinate/0/{GRID_MIN - 1}")
        assert resp2.status_code == 400


class TestClaims:
    def test_claims_returns_list(self, client):
        resp = client.get("/api/claims")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 25  # genesis creates 25 claims
        first = data[0]
        assert "x" in first
        assert "y" in first
        assert "owner" in first
        assert "stake" in first
        assert "density" in first
        assert "storage_slots" in first
        # owner should be hex string
        assert isinstance(first["owner"], str)


class TestGridRegion:
    def test_grid_region_returns_data(self, client):
        resp = client.get("/api/grid/region?x_min=-5&x_max=5&y_min=-5&y_max=5")
        assert resp.status_code == 200
        data = resp.json()
        assert "x_min" in data
        assert "x_max" in data
        assert "y_min" in data
        assert "y_max" in data
        assert "cells" in data
        assert isinstance(data["cells"], list)
        # 11 x 11 = 121 cells
        assert len(data["cells"]) == 121

    def test_grid_region_too_large(self, client):
        # 100 * 100 = 10000 — exactly at the limit, should succeed
        resp_ok = client.get("/api/grid/region?x_min=0&x_max=99&y_min=0&y_max=99")
        assert resp_ok.status_code == 200

        # Full grid is way over 10000 cells — should return 400
        resp_large = client.get(
            f"/api/grid/region?x_min={GRID_MIN}&x_max={GRID_MAX}"
            f"&y_min={GRID_MIN}&y_max={GRID_MAX}"
        )
        assert resp_large.status_code == 400


class TestMine:
    def test_mine_returns_yields(self, client):
        # Reset to clear any block timing state
        client.post("/api/reset?claims=25")
        resp = client.post("/api/mine")
        assert resp.status_code == 200
        data = resp.json()
        assert "block_number" in data
        assert "yields" in data
        assert "block_time" in data
        assert "next_block_at" in data
        assert isinstance(data["yields"], dict)
        # Should have some yields since genesis has 25 claims
        assert len(data["yields"]) > 0
        # All keys should be hex strings (owner public keys)
        for key in data["yields"]:
            assert isinstance(key, str)
        # All values should be floats
        for val in data["yields"].values():
            assert isinstance(val, (int, float))
        # next_block_at should be ~60s after block_time
        assert data["next_block_at"] > data["block_time"]

    def test_mine_enforces_block_timing(self, client):
        # Reset to clear timing, mine first block
        client.post("/api/reset?claims=25")
        first = client.post("/api/mine")
        assert first.status_code == 200
        # Second mine immediately should be rejected (429)
        second = client.post("/api/mine")
        assert second.status_code == 429
        detail = second.json()["detail"]
        assert "remaining" in detail.lower() or "block" in detail.lower()


class TestAgents:
    def test_agents_returns_3_user_agents_by_default(self, client):
        resp = client.get("/api/agents")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 25  # all claims
        user_agents = [a for a in data if a["is_user_agent"]]
        slots = [a for a in data if not a["is_user_agent"]]
        assert len(user_agents) == 3
        assert len(slots) == 22
        # User agents are Sonnet tier
        for a in user_agents:
            assert a["tier"] == "sonnet"
            assert a["id"].startswith("agent-")
            assert a["border_radius"] == 90
            assert a["mining_rate"] > 0
        # Slots are Haiku tier
        for s in slots:
            assert s["tier"] == "haiku"
            assert s["id"].startswith("slot-")
            assert s["border_radius"] == 30
            assert s["mining_rate"] == 0.0

    def test_agents_custom_user_count(self, client):
        resp = client.get("/api/agents?user_count=5")
        assert resp.status_code == 200
        data = resp.json()
        user_agents = [a for a in data if a["is_user_agent"]]
        assert len(user_agents) == 5


class TestReset:
    def test_reset_creates_fresh_ledger(self, client):
        # Get state before reset
        before = client.get("/api/status").json()
        # Reset with different seed
        resp = client.post("/api/reset?wallets=10&claims=5&seed=99")
        assert resp.status_code == 200
        data = resp.json()
        assert data["record_count"] == 15  # 10 mint + 5 birth records
        assert data["total_claims"] == 5
        assert "reset" in data["message"].lower()
        # State root should differ from before (different seed)
        assert data["state_root"] != before["state_root"]
        # Verify claims reflect new genesis
        claims = client.get("/api/claims").json()
        assert len(claims) == 5
        # Reset also clears block timing — mining should work immediately
        mine_resp = client.post("/api/mine")
        assert mine_resp.status_code == 200
        # Reset back to default for other tests
        client.post("/api/reset?wallets=50&claims=25&seed=42")


class TestIntro:
    def _get_first_claim(self, client):
        """Helper: get a claimed coordinate and its wallet index."""
        claims = client.get("/api/claims").json()
        first = claims[0]
        return {"x": first["x"], "y": first["y"]}, first["owner"]

    def test_set_intro(self, client):
        client.post("/api/reset?claims=25")
        coord, _ = self._get_first_claim(client)
        resp = client.post("/api/intro", json={
            "wallet_index": 0,
            "agent_coordinate": coord,
            "message": "Hello from the stars",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["message"] == "Hello from the stars"

    def test_intro_too_long(self, client):
        client.post("/api/reset?claims=25")
        coord, _ = self._get_first_claim(client)
        resp = client.post("/api/intro", json={
            "wallet_index": 0,
            "agent_coordinate": coord,
            "message": "x" * 141,
        })
        assert resp.status_code == 400
        assert "too long" in resp.json()["detail"].lower()

    def test_intro_wrong_owner(self, client):
        client.post("/api/reset?claims=25")
        coord, _ = self._get_first_claim(client)
        # Wallet 49 doesn't own claim 0
        resp = client.post("/api/intro", json={
            "wallet_index": 49,
            "agent_coordinate": coord,
            "message": "Impostor!",
        })
        assert resp.status_code == 403


class TestMessage:
    def _get_two_claims(self, client):
        """Helper: get two distinct claimed coordinates."""
        claims = client.get("/api/claims").json()
        return (
            {"x": claims[0]["x"], "y": claims[0]["y"]},
            {"x": claims[1]["x"], "y": claims[1]["y"]},
        )

    def test_send_message(self, client):
        client.post("/api/reset?claims=25")
        c1, c2 = self._get_two_claims(client)
        resp = client.post("/api/message", json={
            "sender_wallet": 0,
            "sender_coord": c1,
            "target_coord": c2,
            "text": "greetings neighbor",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["text"] == "greetings neighbor"
        assert data["id"].startswith("msg-")
        assert "timestamp" in data

    def test_message_too_long(self, client):
        client.post("/api/reset?claims=25")
        c1, c2 = self._get_two_claims(client)
        resp = client.post("/api/message", json={
            "sender_wallet": 0,
            "sender_coord": c1,
            "target_coord": c2,
            "text": "x" * 141,
        })
        assert resp.status_code == 400

    def test_message_empty(self, client):
        client.post("/api/reset?claims=25")
        c1, c2 = self._get_two_claims(client)
        resp = client.post("/api/message", json={
            "sender_wallet": 0,
            "sender_coord": c1,
            "target_coord": c2,
            "text": "",
        })
        assert resp.status_code == 400

    def test_message_to_unclaimed(self, client):
        client.post("/api/reset?claims=25")
        c1, _ = self._get_two_claims(client)
        resp = client.post("/api/message", json={
            "sender_wallet": 0,
            "sender_coord": c1,
            "target_coord": {"x": 0, "y": 0},  # likely unclaimed
            "text": "hello void",
        })
        # May be 400 (unclaimed) or 200 (if by chance 0,0 is claimed)
        assert resp.status_code in (200, 400)

    def test_message_wrong_sender(self, client):
        client.post("/api/reset?claims=25")
        c1, c2 = self._get_two_claims(client)
        resp = client.post("/api/message", json={
            "sender_wallet": 49,
            "sender_coord": c1,
            "target_coord": c2,
            "text": "fake",
        })
        assert resp.status_code == 403


class TestMessages:
    def test_empty_history(self, client):
        client.post("/api/reset?claims=25")
        resp = client.get("/api/messages/0/0")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_message_appears_in_history(self, client):
        client.post("/api/reset?claims=25")
        claims = client.get("/api/claims").json()
        c1 = {"x": claims[0]["x"], "y": claims[0]["y"]}
        c2 = {"x": claims[1]["x"], "y": claims[1]["y"]}
        # Send a message
        client.post("/api/message", json={
            "sender_wallet": 0,
            "sender_coord": c1,
            "target_coord": c2,
            "text": "stored haiku",
        })
        # Check target's inbox
        resp = client.get(f"/api/messages/{c2['x']}/{c2['y']}")
        assert resp.status_code == 200
        messages = resp.json()
        assert len(messages) == 1
        assert messages[0]["text"] == "stored haiku"
        assert messages[0]["sender_coord"] == c1

    def test_out_of_range(self, client):
        resp = client.get("/api/messages/99999/0")
        assert resp.status_code == 400


class TestWebSocket:
    def test_websocket_connects_and_receives_pong(self, client):
        """WebSocket /ws should accept connections and respond to ping."""
        with client.websocket_connect("/ws") as ws:
            ws.send_text(json.dumps({"type": "ping"}))
            data = ws.receive_json()
            assert data["event"] == "pong"

    def test_websocket_ignores_invalid_json(self, client):
        """WebSocket should silently ignore non-JSON messages."""
        with client.websocket_connect("/ws") as ws:
            ws.send_text("not json at all")
            # Send a valid ping to verify connection still works
            ws.send_text(json.dumps({"type": "ping"}))
            data = ws.receive_json()
            assert data["event"] == "pong"
