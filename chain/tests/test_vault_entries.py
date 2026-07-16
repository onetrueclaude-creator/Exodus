"""DePIN Vault S4 — entry core (the ONE door into the vault, design §5.4)
+ vault-atom persistence (runtime entries must survive restart: live-smoke
requirement, §12). Mirrors the house S1/S3 test style."""
import json

import pytest

from agentic.params import VAULT_ENTRY_MAX_BYTES
from agentic.vault.dag import VaultDag
from agentic.vault.entries import (
    ENTRY_KINDS,
    build_entry_payload,
    ingest_entry,
    parse_entry_payload,
)
from agentic.vault.shard import shard_of_cid

OWNER = "a" * 64

def _fields(**over):
    base = dict(
        kind="agent_note", text="a packet drifts on the grid",
        visibility="public", owner_hex=OWNER, author="neo",
        origin="token_authorized", meta={"coord": {"x": 0, "y": 0}},
        created_block=7,
    )
    base.update(over)
    return base


class TestEntryPayload:
    def test_private_visibility_raises_structurally(self):
        """Global Constraint 5 / design §5.2: the entry layer REFUSES private
        input — not a filter, a raise."""
        with pytest.raises(ValueError, match="private content is never indexed"):
            build_entry_payload(**_fields(visibility="private"))

    def test_planet_post_is_not_an_ingestable_kind(self):
        """D8: planet_post is excluded — not backfilled, not auto-indexed.
        Adding it to ENTRY_KINDS must be a deliberate future decision."""
        assert "planet_post" not in ENTRY_KINDS
        with pytest.raises(ValueError, match="unsupported kind"):
            build_entry_payload(**_fields(kind="planet_post"))

    def test_unknown_kind_visibility_origin_raise(self):
        with pytest.raises(ValueError):
            build_entry_payload(**_fields(kind="upload"))
        with pytest.raises(ValueError):
            build_entry_payload(**_fields(visibility="secret"))
        with pytest.raises(ValueError):
            build_entry_payload(**_fields(origin="anonymous"))

    def test_size_cap_and_empty_text(self):
        with pytest.raises(ValueError, match="exceeds"):
            build_entry_payload(**_fields(text="x" * (VAULT_ENTRY_MAX_BYTES + 1)))
        with pytest.raises(ValueError, match="empty"):
            build_entry_payload(**_fields(text="   "))
        # exactly at the cap is fine
        build_entry_payload(**_fields(text="x" * VAULT_ENTRY_MAX_BYTES))

    def test_payload_is_canonical_and_deterministic(self):
        a = build_entry_payload(**_fields())
        b = build_entry_payload(**_fields())
        assert a == b                                   # same fields → same bytes → same CID
        doc = json.loads(a.decode("utf-8"))
        assert doc["v"] == 1 and doc["kind"] == "agent_note"
        assert doc["owner_hex"] == OWNER and doc["created_block"] == 7

    def test_parse_roundtrip_and_rejects_non_entry_atoms(self):
        payload = build_entry_payload(**_fields())
        doc = parse_entry_payload(payload)
        assert doc is not None and doc["text"] == "a packet drifts on the grid"
        assert parse_entry_payload(b"genesis prose atom, not an entry") is None
        assert parse_entry_payload(b'{"v": 99, "kind": "agent_note"}') is None


class TestIngest:
    def test_ingest_returns_cid_and_shard(self):
        dag = VaultDag()
        cid, shard_id = ingest_entry(dag, **_fields())
        assert dag.get_payload(cid) == build_entry_payload(**_fields())
        assert shard_id == shard_of_cid(cid)

    def test_ingest_is_idempotent_by_content_address(self):
        dag = VaultDag()
        cid1, _ = ingest_entry(dag, **_fields())
        root1 = dag.root_cid()
        cid2, _ = ingest_entry(dag, **_fields())
        assert cid1 == cid2 and dag.root_cid() == root1   # re-run: no new atom


class TestVaultAtomPersistence:
    def test_sqlite_roundtrip_restores_entry_atoms(self, tmp_path):
        """THE restart requirement: a runtime-written entry must survive a
        chain restart (fresh genesis + load_state) with identical root and
        provenance meta — genesis atoms alone would drop it."""
        from agentic.testnet.genesis import create_genesis
        from agentic.testnet.persistence import init_db, save_state, load_state

        db = tmp_path / "s4.db"
        init_db(db)
        g = create_genesis(seed=42)
        cid, _shard = ingest_entry(g.vault_dag, **_fields())
        g.vault_entry_meta = {cid: {"vault_root": g.vault_dag.root_cid(), "block": 7}}
        root_before = g.vault_dag.root_cid()
        save_state(g, last_block_time=0.0, db_path=db)

        g2 = create_genesis(seed=42)
        load_state(g2, db_path=db)
        assert g2.vault_dag.root_cid() == root_before
        assert parse_entry_payload(g2.vault_dag.get_payload(cid))["kind"] == "agent_note"
        assert g2.vault_entry_meta[cid]["block"] == 7
        assert g2.vault_entry_meta[cid]["vault_root"] == root_before

    def test_clear_state_wipes_vault_atoms(self, tmp_path):
        from agentic.testnet.genesis import create_genesis
        from agentic.testnet.persistence import init_db, save_state, load_state, clear_state

        db = tmp_path / "s4.db"
        init_db(db)
        g = create_genesis(seed=42)
        cid, _ = ingest_entry(g.vault_dag, **_fields())
        g.vault_entry_meta = {cid: {"vault_root": g.vault_dag.root_cid(), "block": 1}}
        save_state(g, last_block_time=0.0, db_path=db)
        clear_state(db)
        g2 = create_genesis(seed=42)
        load_state(g2, db_path=db)
        assert not hasattr(g2, "vault_entry_meta") or cid not in g2.vault_entry_meta
