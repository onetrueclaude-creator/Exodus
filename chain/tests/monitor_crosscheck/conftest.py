"""Shared fixtures for the monitor crosscheck test suite.

All tests use FastAPI TestClient against an in-process genesis instance.
No real Supabase connection is required — sync tests monkeypatch the client.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from agentic.testnet.api import app

TEST_ADMIN_TOKEN = "test-admin-token"


@pytest.fixture(autouse=True, scope="session")
def _enable_admin():
    """Patch ADMIN_TOKEN for admin-gated endpoints."""
    from agentic.testnet import api as _api
    original = _api._ADMIN_TOKEN
    _api._ADMIN_TOKEN = TEST_ADMIN_TOKEN
    yield
    _api._ADMIN_TOKEN = original


@pytest.fixture(scope="module")
def client():
    """TestClient with a freshly initialised genesis (9 nodes, 50 wallets, seed=42)."""
    with TestClient(app) as c:
        c.post("/api/reset?wallets=50&seed=42",
               headers={"X-Admin-Token": TEST_ADMIN_TOKEN})
        yield c


@pytest.fixture(scope="module")
def admin():
    return {"X-Admin-Token": TEST_ADMIN_TOKEN}


@pytest.fixture(scope="module")
def status(client):
    """Cached /api/status response data."""
    return client.get("/api/status").json()


@pytest.fixture(scope="module")
def epoch(client):
    """Cached /api/epoch response data."""
    return client.get("/api/epoch").json()


@pytest.fixture(scope="module")
def agents(client):
    """Cached /api/agents response data."""
    return client.get("/api/agents").json()


@pytest.fixture(scope="module")
def claims(client):
    """Cached /api/claims response data."""
    return client.get("/api/claims").json()
