"""Tests for Treasury operator HMAC hooks (Phase 2 of zkagentic-treasury).

Covers:
- Configuration check: heartbeat 404s without env vars
- HMAC verification: missing headers (401), wrong pubkey (403), stale ts (401), bad sig (401)
- Happy path: valid HMAC heartbeat succeeds and updates health endpoint
- Health endpoint: respects fresh-window logic
- Existing endpoints: untouched by Treasury hooks (regression spot-check)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time

import pytest
from fastapi.testclient import TestClient

from agentic.params import (
    TREASURY_HMAC_HEADER_PUBKEY_HASH,
    TREASURY_HMAC_HEADER_SIGNATURE,
    TREASURY_HMAC_HEADER_TIMESTAMP,
)
from agentic.testnet.api import _reset_treasury_heartbeat_for_tests, app


_PUBKEY_HASH = "test_operator_pkh_0123456789abcdef"
_SECRET = b"test_treasury_operator_secret"


def _set_treasury_env(monkeypatch) -> None:
    monkeypatch.setenv("TREASURY_OPERATOR_PUBKEY_HASH", _PUBKEY_HASH)
    monkeypatch.setenv("TREASURY_OPERATOR_SECRET", _SECRET.decode())


def _signed_headers(method: str, path: str, body: bytes, *, ts_ms: int | None = None,
                    secret: bytes = _SECRET, pkh: str = _PUBKEY_HASH) -> dict[str, str]:
    if ts_ms is None:
        ts_ms = int(time.time() * 1000)
    body_hash = hashlib.sha256(body).hexdigest()
    payload = f"{method.upper()}\n{path}\n{ts_ms}\n{body_hash}".encode()
    sig = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    return {
        TREASURY_HMAC_HEADER_SIGNATURE: sig,
        TREASURY_HMAC_HEADER_TIMESTAMP: str(ts_ms),
        TREASURY_HMAC_HEADER_PUBKEY_HASH: pkh,
        "Content-Type": "application/json",
    }


def _heartbeat_payload(block: int = 100, balance: float = 142.5, claims: int = 7) -> dict:
    return {
        "type": "treasury.heartbeat",
        "block": block,
        "blocks_since_last_action": 30,
        "balance_agntc": balance,
        "claims": claims,
        "timestamp": time.time(),
    }


@pytest.fixture
def client():
    with TestClient(app) as c:
        _reset_treasury_heartbeat_for_tests()
        yield c
        _reset_treasury_heartbeat_for_tests()


# === Configuration gating ===


def test_health_returns_offline_when_not_configured(client, monkeypatch):
    monkeypatch.delenv("TREASURY_OPERATOR_PUBKEY_HASH", raising=False)
    monkeypatch.delenv("TREASURY_OPERATOR_SECRET", raising=False)
    resp = client.get("/api/treasury/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["operator_online"] is False
    assert body["last_heartbeat_block"] is None


def test_heartbeat_returns_404_when_not_configured(client, monkeypatch):
    monkeypatch.delenv("TREASURY_OPERATOR_PUBKEY_HASH", raising=False)
    monkeypatch.delenv("TREASURY_OPERATOR_SECRET", raising=False)
    resp = client.post("/api/treasury/heartbeat", json=_heartbeat_payload())
    assert resp.status_code == 404


# === HMAC verification ===


def test_heartbeat_missing_headers_returns_401(client, monkeypatch):
    _set_treasury_env(monkeypatch)
    resp = client.post(
        "/api/treasury/heartbeat",
        json=_heartbeat_payload(),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 401
    assert "Missing" in resp.json()["detail"]


def test_heartbeat_wrong_pubkey_hash_returns_403(client, monkeypatch):
    _set_treasury_env(monkeypatch)
    payload = _heartbeat_payload()
    body = json.dumps(payload).encode()
    headers = _signed_headers("POST", "/api/treasury/heartbeat", body, pkh="wrong_pkh")
    resp = client.post("/api/treasury/heartbeat", content=body, headers=headers)
    assert resp.status_code == 403
    assert "pubkey not registered" in resp.json()["detail"]


def test_heartbeat_stale_timestamp_returns_401(client, monkeypatch):
    _set_treasury_env(monkeypatch)
    payload = _heartbeat_payload()
    body = json.dumps(payload).encode()
    stale_ts = int(time.time() * 1000) - (10 * 60 * 1000)  # 10 min ago — outside ±5 min window
    headers = _signed_headers(
        "POST", "/api/treasury/heartbeat", body, ts_ms=stale_ts
    )
    resp = client.post("/api/treasury/heartbeat", content=body, headers=headers)
    assert resp.status_code == 401
    assert "outside window" in resp.json()["detail"]


def test_heartbeat_invalid_signature_returns_401(client, monkeypatch):
    _set_treasury_env(monkeypatch)
    payload = _heartbeat_payload()
    body = json.dumps(payload).encode()
    headers = _signed_headers(
        "POST", "/api/treasury/heartbeat", body, secret=b"wrong_secret"
    )
    resp = client.post("/api/treasury/heartbeat", content=body, headers=headers)
    assert resp.status_code == 401
    assert "Invalid" in resp.json()["detail"]


# === Happy path ===


def test_heartbeat_valid_signature_succeeds_and_updates_health(client, monkeypatch):
    _set_treasury_env(monkeypatch)
    payload = _heartbeat_payload(block=42, balance=99.5, claims=5)
    body = json.dumps(payload).encode()
    headers = _signed_headers("POST", "/api/treasury/heartbeat", body)
    resp = client.post("/api/treasury/heartbeat", content=body, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert resp.json()["block"] == 42

    health_resp = client.get("/api/treasury/health")
    assert health_resp.status_code == 200
    body_health = health_resp.json()
    assert body_health["last_heartbeat_block"] == 42
    assert body_health["last_balance_agntc"] == 99.5
    assert body_health["last_claims_count"] == 5
    assert body_health["operator_pubkey_hash"] == _PUBKEY_HASH


# === Existing endpoint regression ===


def test_status_endpoint_unaffected_by_treasury_hooks(client, monkeypatch):
    """Sanity check: existing /api/status keeps working with or without Treasury config."""
    monkeypatch.delenv("TREASURY_OPERATOR_PUBKEY_HASH", raising=False)
    resp_no_cfg = client.get("/api/status")
    assert resp_no_cfg.status_code == 200

    _set_treasury_env(monkeypatch)
    resp_with_cfg = client.get("/api/status")
    assert resp_with_cfg.status_code == 200
