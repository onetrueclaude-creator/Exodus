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
