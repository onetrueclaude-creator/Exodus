"""API tests: /api/beacon + /api/vault/pins (DePIN S1)."""
import pytest
from fastapi.testclient import TestClient

import agentic.testnet.api as api_mod
from agentic.testnet.api import app


@pytest.fixture(autouse=True)
def _fresh_chain(admin_headers):
    """Reset before every test so this file is order-independent and
    standalone-runnable — it must not depend on another test module having
    already initialized `_genesis` (module load order / alphabetical
    discovery). Mirrors tests/test_api_vault.py's convention."""
    client = TestClient(app)
    client.post("/api/reset", headers=admin_headers)
    yield client


def test_get_beacon_reports_source_and_staleness():
    client = TestClient(app)
    r = client.get("/api/beacon")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] in ("drand", "solana", "local", "stale")
    assert isinstance(body["stale"], bool)
    assert len(body["value_prefix"]) == 16      # first 8 bytes, hex


def test_beacon_warm_from_boot_seeds_challenges():
    """Spec §3.3: seeds are beacon-mixed from the FIRST challenge after boot —
    the beacon is warmed inside _init_genesis() itself, not lazily on first
    request. Self-boots and asserts BEFORE any HTTP request, so reverting the
    boot-warm hunk in _init_genesis fails this test (revert-discriminating).
    Self-boot pattern per tests/test_api_mine_records.py."""
    api_mod._init_genesis()
    g = api_mod._g()
    assert getattr(g, "epoch_beacon", None) is not None
    assert len(g.epoch_beacon.value) == 32
    assert getattr(g.vault_registry, "epoch_beacon_value", None) == g.epoch_beacon.value


def test_reset_warms_beacon_into_registry():
    """Closes the post-reset cold window: /api/reset must warm the epoch
    beacon immediately (mirroring _init_genesis's boot-warm) rather than
    leaving it to be lazily created on the first /api/beacon call or mined
    block. The autouse _fresh_chain fixture above has already reset by the
    time this test body runs, so this asserts directly on that reset."""
    g = api_mod._g()
    assert getattr(g, "epoch_beacon", None) is not None
    assert g.vault_registry.epoch_beacon_value == g.epoch_beacon.value


def test_pins_endpoint_returns_registry_state():
    client = TestClient(app)
    r = client.get("/api/vault/pins/1")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"wallet_index", "owner", "pins", "pinned_bytes", "pass_rate"}
    assert body["wallet_index"] == 1 and isinstance(body["pins"], list)
    assert 0.0 <= body["pass_rate"] <= 1.0


def test_pins_endpoint_404_on_bad_wallet():
    client = TestClient(app)
    assert client.get("/api/vault/pins/99999").status_code == 404


def test_pins_endpoint_hides_owner_level_miss_bucket():
    """shard_id=-1 (owner-level miss sentinel) must not appear as a phantom pin,
    while pass_rate still reflects those misses."""
    client = TestClient(app)
    g = api_mod._g()
    owner = g.wallets[1].public_key.hex()
    api_mod._pin_registry(g).record_audit(owner, shard_id=-1, passed=False, block=5)
    r = client.get("/api/vault/pins/1")
    assert r.status_code == 200
    body = r.json()
    assert all(p["shard_id"] >= 0 for p in body["pins"])
    assert body["pass_rate"] == 0.0
