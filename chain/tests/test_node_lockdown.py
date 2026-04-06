"""Tests for Agent Lockdown — node hash verification, sessions, and transaction gating."""

from __future__ import annotations

import os
import sqlite3
import tempfile
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from agentic.params import CANONICAL_CLAUDE_HASH, NODE_HASH_LENGTH
from agentic.testnet.node_session import (
    verify_hash,
    register_session,
    get_session,
    clear_sessions,
    NodeSession,
)

TEST_ADMIN_TOKEN = "test-admin-token"
VALID_HASH = CANONICAL_CLAUDE_HASH
INVALID_HASH = "a" * 64
TAMPERED_HASH = VALID_HASH[:63] + ("0" if VALID_HASH[-1] != "0" else "1")


@pytest.fixture
def client():
    from agentic.testnet.api import app, _init_genesis
    from agentic.testnet import api as _api
    _api._ADMIN_TOKEN = TEST_ADMIN_TOKEN
    _init_genesis()
    c = TestClient(app)
    c.post("/api/reset", headers={"X-Admin-Token": TEST_ADMIN_TOKEN})
    clear_sessions()
    return c


# ── Hash Verification ────────────────────────────────────────


class TestHashVerification:
    def test_verify_valid_hash_returns_true(self):
        assert verify_hash(VALID_HASH) is True

    def test_verify_invalid_hash_returns_false(self):
        assert verify_hash(INVALID_HASH) is False

    def test_verify_empty_hash_returns_false(self):
        assert verify_hash("") is False

    def test_verify_wrong_length_hash_returns_false(self):
        assert verify_hash("abc123") is False

    def test_verify_canonical_hash_matches_params(self):
        assert VALID_HASH == CANONICAL_CLAUDE_HASH

    def test_canonical_hash_is_64_hex_chars(self):
        assert len(CANONICAL_CLAUDE_HASH) == NODE_HASH_LENGTH
        assert all(c in "0123456789abcdef" for c in CANONICAL_CLAUDE_HASH)

    def test_verify_endpoint_valid(self, client):
        r = client.post("/api/node/verify", json={"claude_hash": VALID_HASH})
        assert r.status_code == 200
        assert r.json()["valid"] is True

    def test_verify_endpoint_invalid(self, client):
        r = client.post("/api/node/verify", json={"claude_hash": INVALID_HASH})
        assert r.status_code == 200
        assert r.json()["valid"] is False

    def test_verify_endpoint_returns_canonical(self, client):
        r = client.post("/api/node/verify", json={"claude_hash": INVALID_HASH})
        assert r.json()["canonical_hash"] == CANONICAL_CLAUDE_HASH

    def test_register_with_valid_hash_succeeds(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 200
        assert r.json()["status"] == "registered"

    def test_register_with_invalid_hash_returns_403(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": INVALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 403

    def test_register_with_tampered_hash_returns_403(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": TAMPERED_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 403


class TestSessionManagement:
    def test_register_creates_session(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        r = client.get("/api/node/session/0")
        assert r.json()["active"] is True

    def test_register_returns_session_id_and_expiry(self, client):
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        data = r.json()
        assert "session_id" in data
        assert "expires_at" in data
        assert len(data["session_id"]) == 36

    def test_duplicate_register_returns_409(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 409

    def test_expired_session_allows_re_register(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        session = get_session(0)
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)
        r = client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        assert r.status_code == 200

    def test_session_status_shows_active(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        r = client.get("/api/node/session/0")
        data = r.json()
        assert data["active"] is True
        assert data["claude_hash"] == VALID_HASH

    def test_session_status_inactive_for_unknown(self, client):
        r = client.get("/api/node/session/999")
        assert r.json()["active"] is False

    def test_reset_clears_all_sessions(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        client.post("/api/reset", headers={"X-Admin-Token": TEST_ADMIN_TOKEN})
        r = client.get("/api/node/session/0")
        assert r.json()["active"] is False

    def test_session_expiry_enforced(self, client):
        client.post("/api/node/register", json={
            "wallet_index": 0, "claude_hash": VALID_HASH, "coordinates": [0, 0]
        })
        session = get_session(0)
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)
        r = client.get("/api/node/session/0")
        assert r.json()["active"] is False


class TestTransactionGating:
    def test_assign_with_valid_hash_succeeds(self, client):
        r = client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": VALID_HASH},
        )
        assert r.status_code != 403

    def test_assign_with_invalid_hash_returns_403(self, client):
        r = client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert r.status_code == 403

    def test_assign_without_hash_succeeds(self, client):
        r = client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
        )
        assert r.status_code != 403

    def test_birth_with_invalid_hash_returns_403(self, client):
        r = client.post(
            "/api/birth",
            json={"wallet_index": 0},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert r.status_code == 403

    def test_claim_with_invalid_hash_returns_403(self, client):
        r = client.post(
            "/api/claim",
            json={"wallet_index": 0, "x": 100, "y": 100},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert r.status_code == 403

    def test_valid_hash_header_accepted(self, client):
        r = client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": VALID_HASH},
        )
        assert r.status_code != 403

    def test_invalid_hash_does_not_create_session(self, client):
        client.post(
            "/api/resources/0/assign",
            json={"cell_index": 0, "resource_type": "SECURE"},
            headers={"X-Node-Hash": INVALID_HASH},
        )
        assert get_session(0) is None

    def test_multiple_endpoints_check_hash(self, client):
        for endpoint, payload in [
            ("/api/resources/0/assign", {"cell_index": 0, "resource_type": "SECURE"}),
            ("/api/birth", {"wallet_index": 0}),
        ]:
            r = client.post(endpoint, json=payload, headers={"X-Node-Hash": INVALID_HASH})
            assert r.status_code == 403, f"{endpoint} did not reject invalid hash"


class TestSessionPersistence:
    def test_session_cleared_on_clear(self):
        clear_sessions()
        register_session(0, VALID_HASH, (0, 0))
        assert get_session(0) is not None
        clear_sessions()
        assert get_session(0) is None

    def test_expired_session_returns_none(self):
        clear_sessions()
        register_session(0, VALID_HASH, (0, 0))
        session = get_session(0)
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)
        assert get_session(0) is None

    def test_verify_hash_rejects_none(self):
        assert verify_hash(None) is False

    def test_verify_hash_rejects_int(self):
        assert verify_hash(12345) is False
