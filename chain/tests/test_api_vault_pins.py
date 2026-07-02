"""API tests: /api/beacon + /api/vault/pins (DePIN S1)."""
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


def test_beacon_warm_from_boot_seeds_challenges():
    """Spec §3.3: seeds are beacon-mixed from the FIRST challenge after boot —
    the beacon is warmed at genesis init, not lazily on the first mine."""
    g = api_mod._g()
    assert getattr(g, "epoch_beacon", None) is not None
    assert len(g.epoch_beacon.value) == 32
    assert getattr(g.vault_registry, "epoch_beacon_value", None) == g.epoch_beacon.value
