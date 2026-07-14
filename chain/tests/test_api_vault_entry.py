"""DePIN Vault S4 — HTTP entry surfaces (design §5.4): service-gated write
door + rebuild listing. Provenance/backfill tests are appended by Tasks 5/6."""
import pytest
from fastapi.testclient import TestClient

OWNER = "a" * 64
SVC = {"X-Service-Token": "test-svc"}


@pytest.fixture()
def client(monkeypatch):
    from agentic.testnet import api as api_module
    monkeypatch.setattr(api_module, "_VAULT_SERVICE_TOKEN", "test-svc")
    c = TestClient(api_module.app)
    r = c.post("/api/reset", headers={"X-Admin-Token": api_module._ADMIN_TOKEN})
    assert r.status_code == 200
    return c


def _entry(**over):
    base = {"kind": "agent_note", "text": "a quiet audit passes",
            "visibility": "public", "owner_hex": OWNER, "author": "neo",
            "origin": "token_authorized", "meta": {}}
    base.update(over)
    return base


class TestServiceAuth:
    def test_unset_token_disables_surface(self, client, monkeypatch):
        from agentic.testnet import api as api_module
        monkeypatch.setattr(api_module, "_VAULT_SERVICE_TOKEN", "")
        assert client.post("/api/vault/entry", json=_entry()).status_code == 503
        assert client.get("/api/vault/entries").status_code == 503

    def test_wrong_token_forbidden(self, client):
        r = client.post("/api/vault/entry", json=_entry(),
                        headers={"X-Service-Token": "wrong"})
        assert r.status_code == 403
        assert client.get("/api/vault/entries",
                          headers={"X-Service-Token": "wrong"}).status_code == 403


class TestEntryWrite:
    def test_happy_path_creates_audited_atom(self, client):
        from agentic.testnet import api as api_module
        g = api_module._g()
        root_before = g.vault_dag.root_cid()
        r = client.post("/api/vault/entry", json=_entry(), headers=SVC)
        assert r.status_code == 200
        body = r.json()
        assert set(body) == {"cid", "block", "shard_id", "vault_root"}
        assert len(body["cid"]) == 64
        assert body["vault_root"] != root_before          # the root moved
        assert body["vault_root"] == g.vault_dag.root_cid()
        # the new atom is inside the shard/audit universe
        from agentic.vault.shard import assign_shards, shard_of_cid
        assert body["shard_id"] == shard_of_cid(body["cid"])
        sharded = {c for cids in assign_shards(g.vault_dag.cids()).values() for c in cids}
        assert body["cid"] in sharded

    def test_private_rejected_422(self, client):
        r = client.post("/api/vault/entry", json=_entry(visibility="private"), headers=SVC)
        assert r.status_code == 422
        assert "private content is never indexed" in r.json()["detail"]

    def test_planet_post_kind_rejected_422(self, client):
        # D8 exclusion, enforced at the HTTP boundary too.
        r = client.post("/api/vault/entry", json=_entry(kind="planet_post"), headers=SVC)
        assert r.status_code == 422

    def test_oversize_rejected_422(self, client):
        from agentic.params import VAULT_ENTRY_MAX_BYTES
        r = client.post("/api/vault/entry",
                        json=_entry(text="x" * (VAULT_ENTRY_MAX_BYTES + 1)), headers=SVC)
        assert r.status_code == 422

    def test_write_persists_across_restart_without_mining(self, client, tmp_path, monkeypatch):
        """Auto-mine may be OFF in prod — the entry endpoint must persist
        immediately, not at the next block (live-smoke restart requirement)."""
        from agentic.testnet import api as api_module
        from agentic.testnet.genesis import create_genesis
        from agentic.testnet.persistence import init_db, load_state
        db = tmp_path / "s4-api.db"
        init_db(db)
        monkeypatch.setattr(api_module, "_DB_PATH", db)
        r = client.post("/api/vault/entry", json=_entry(text="restart survivor"), headers=SVC)
        assert r.status_code == 200
        cid = r.json()["cid"]
        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, db_path=db)
        from agentic.vault.entries import parse_entry_payload
        assert parse_entry_payload(g2.vault_dag.get_payload(cid))["text"] == "restart survivor"


class TestEntriesListing:
    def test_listing_pages_and_parses(self, client):
        for i in range(3):
            assert client.post("/api/vault/entry",
                               json=_entry(text=f"entry {i}"), headers=SVC).status_code == 200
        r = client.get("/api/vault/entries?offset=0&limit=2", headers=SVC)
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 3 and len(body["entries"]) == 2
        item = body["entries"][0]
        assert set(item) == {"cid", "vault_root", "block", "shard_id", "entry"}
        from agentic.vault.shard import shard_of_cid
        assert item["shard_id"] == shard_of_cid(item["cid"])
        assert item["entry"]["visibility"] in ("public", "network")
        r2 = client.get("/api/vault/entries?offset=2&limit=2", headers=SVC)
        assert len(r2.json()["entries"]) == 1


class TestProvenanceReads:
    def test_pins_expose_durable_last_pass_block(self, client):
        from agentic.testnet import api as api_module
        g = api_module._g()
        owner = g.wallets[0].public_key.hex()
        pr = api_module._pin_registry(g)
        pr.assign_pin(owner, shard_id=3, block=5, size_bytes=2048)
        pr.record_audit(owner, shard_id=3, passed=True, block=9)
        r = client.get("/api/vault/pins/0")
        assert r.status_code == 200
        row = [p for p in r.json()["pins"] if p["shard_id"] == 3][0]
        assert row["last_pass_block"] == 9

    def test_audit_summary_aggregates_freshest_pass_per_shard(self, client):
        from agentic.testnet import api as api_module
        g = api_module._g()
        o0 = g.wallets[0].public_key.hex()
        o1 = g.wallets[1].public_key.hex()
        pr = api_module._pin_registry(g)
        pr.assign_pin(o0, shard_id=3, block=1, size_bytes=1024)
        pr.record_audit(o0, shard_id=3, passed=True, block=10)
        pr.assign_pin(o1, shard_id=3, block=1, size_bytes=1024)
        pr.record_audit(o1, shard_id=3, passed=True, block=22)   # fresher
        pr.assign_pin(o0, shard_id=5, block=1, size_bytes=1024)  # never passed
        pr.record_audit(o0, shard_id=-1, passed=False, block=30) # miss bucket
        r = client.get("/api/vault/audit-summary")
        assert r.status_code == 200
        body = r.json()
        assert set(body) == {"block", "beacon_stale", "shards"}
        assert body["shards"]["3"] == 22          # max across owners
        assert body["shards"]["5"] is None        # pinned, never passed
        assert "-1" not in body["shards"]         # miss bucket never leaks
        assert isinstance(body["beacon_stale"], bool)
