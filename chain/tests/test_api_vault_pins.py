"""API tests: /api/beacon + /api/vault/pins (DePIN S1)."""
import pytest
from fastapi.testclient import TestClient

import agentic.testnet.api as api_mod
from agentic.testnet.api import app

client = TestClient(app)


def test_get_beacon_reports_source_and_staleness():
    r = client.get("/api/beacon")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] in ("drand", "solana", "local", "stale")
    assert isinstance(body["stale"], bool)
    assert len(body["value_prefix"]) == 16      # first 8 bytes, hex
