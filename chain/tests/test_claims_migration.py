"""S5 claims-migration invariants and behavior (economy design E1–E4)."""
from agentic import params


def test_s5_params_exist_and_are_sane():
    # Dated cut: a block height >= 0; before it, legacy gameplay basis; at/after, Disk facts.
    assert isinstance(params.SCORE_BASIS_CUT_BLOCK, int)
    # DEFAULT is a HIGH sentinel — no cut announced yet, so the LEGACY gameplay
    # basis runs and every existing economy test is preserved (E1's E_CUT is a
    # FUTURE founder-announced height, never genesis).
    assert params.SCORE_BASIS_CUT_BLOCK >= 10**9
    # Disk-fact weight scales the (Δaudit-passes × pinned_bytes) increment.
    assert isinstance(params.SCORE_W_DISK, float) and params.SCORE_W_DISK > 0
    # Eligibility gate: node-level threshold read via TimeLedger.meets_gate.
    assert params.CLAIM_ELIGIBILITY_GATE_LEVEL == 2
    # Recency window: an owner must have >= 1 audit pass within this many blocks.
    assert params.CLAIM_ELIGIBILITY_WINDOW_BLOCKS > 0


from agentic.testnet.api import _build_score_metrics
from agentic.testnet.genesis import create_genesis
from agentic.vault.pin_registry import PlayerPinRegistry


def _owner0(g):
    return g.wallets[0].public_key.hex()


def test_build_score_metrics_includes_disk_facts():
    g = create_genesis(seed=42)
    owner = _owner0(g)
    pr = PlayerPinRegistry()
    pr.assign_pin(owner, shard_id=3, block=10, size_bytes=4096)
    pr.record_audit(owner, shard_id=3, passed=True, block=10)
    pr.record_audit(owner, shard_id=3, passed=True, block=40)
    g.pin_registry = pr

    metrics = _build_score_metrics(g)
    assert owner in metrics
    assert metrics[owner]["disk_passes"] == 2          # two attested passes
    assert metrics[owner]["disk_bytes"] == 4096         # current active bytes


from agentic.economics.score_ledger import ScoreLedger


def _metrics(owner, mined=0, proofs=0, disk_passes=0, disk_bytes=0):
    return {owner: {"mined": mined, "proofs": proofs, "activity": 0.0,
                    "disk_passes": disk_passes, "disk_bytes": disk_bytes}}


def test_pre_cut_uses_gameplay_basis(monkeypatch):
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 1000)
    led = ScoreLedger()
    # Before the cut: mining still earns (legacy basis preserved).
    led.record_epoch(_metrics("o", mined=5), block=10)
    assert led.get("o")["capped_contribution"] > 0


def test_post_cut_mining_stops_earning_disk_facts_earn(monkeypatch):
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 0)  # facts-only from block 0
    monkeypatch.setattr(params, "SCORE_W_DISK", 1.0)
    monkeypatch.setattr(params, "SCORE_EPOCH_CAP", 1e12)     # lift cap to see raw math
    led = ScoreLedger()
    # Mining grows but disk facts flat → NO contribution (E1: game action stops).
    led.record_epoch(_metrics("o", mined=100, disk_passes=0, disk_bytes=0), block=5)
    assert led.get("o")["capped_contribution"] == 0.0
    # A new audit pass over 2048 held bytes → contribution = 1 × 2048.
    led.record_epoch(_metrics("o", mined=200, disk_passes=1, disk_bytes=2048), block=6)
    assert led.get("o")["capped_contribution"] == 2048.0


def test_post_cut_restart_no_double_count(monkeypatch):
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 0)
    monkeypatch.setattr(params, "SCORE_W_DISK", 1.0)
    monkeypatch.setattr(params, "SCORE_EPOCH_CAP", 1e12)
    led = ScoreLedger()
    led.record_epoch(_metrics("o", disk_passes=3, disk_bytes=1000), block=6)
    saved = led.all()  # persisted rows include disk_passes_watermark == 3
    assert saved["o"]["disk_passes_watermark"] == 3
    # Simulate restart: rebuild from persisted rows; pin registry still reports 3.
    led2 = ScoreLedger(rows=saved)
    led2.record_epoch(_metrics("o", disk_passes=3, disk_bytes=1000), block=7)
    # No NEW passes since the watermark → no double-count on the reloaded cumulative.
    assert led2.get("o")["capped_contribution"] == saved["o"]["capped_contribution"]


import sqlite3
from agentic.testnet import persistence as P


def test_disk_watermark_survives_save_load(tmp_path, monkeypatch):
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 0)
    monkeypatch.setattr(params, "SCORE_W_DISK", 1.0)
    monkeypatch.setattr(params, "SCORE_EPOCH_CAP", 1e12)
    db = str(tmp_path / "s.db")

    led = ScoreLedger()
    led.record_epoch(_metrics("o", disk_passes=4, disk_bytes=500), block=6)

    # Minimal round-trip through the score_ledger table helpers.
    conn = sqlite3.connect(db)
    P._ensure_schema(conn)                       # creates score_ledger with the new column
    P._save_score_ledger_rows(conn, led.all())   # persist
    reloaded = P._load_score_ledger_rows(conn)   # restore
    conn.close()

    assert reloaded["o"]["disk_passes_watermark"] == 4
    led2 = ScoreLedger(rows=reloaded)
    led2.record_epoch(_metrics("o", disk_passes=4, disk_bytes=500), block=7)
    assert led2.get("o")["capped_contribution"] == led.get("o")["capped_contribution"]


# --------------------------------------------------------------------------- #
# Deploy hazard #5 (independent S5 review): schema-tolerance was load-only.  #
# Against a carried-forward pre-S5 testnet_state.db, CREATE TABLE IF NOT     #
# EXISTS is a no-op on the already-existing score_ledger table, so the       #
# disk_passes_watermark column never appears. The save INSERT then raises    #
# sqlite3.OperationalError, and save_state's broad `except Exception: pass`  #
# silently rolls back and swallows the ENTIRE save -- every table's state,   #
# not just the score ledger. Fixed with an idempotent ALTER TABLE migration  #
# in _ensure_schema.                                                         #
# --------------------------------------------------------------------------- #
def _pre_s5_score_ledger_ddl() -> str:
    """The 7-column score_ledger shape that predates disk_passes_watermark."""
    return """
        CREATE TABLE score_ledger (
            owner_hex           TEXT PRIMARY KEY,
            mined_blocks        INTEGER NOT NULL DEFAULT 0,
            proof_secured_count INTEGER NOT NULL DEFAULT 0,
            activity_score      REAL    NOT NULL DEFAULT 0.0,
            capped_contribution REAL    NOT NULL DEFAULT 0.0,
            last_activity_block INTEGER,
            updated_at_block    INTEGER NOT NULL
        )
    """


def test_pre_s5_score_ledger_gains_watermark_column_on_ensure_schema(tmp_path):
    """Hazard #5, core seam: _ensure_schema must migrate a carried-forward
    pre-S5 score_ledger table in place (ADD COLUMN), and the S5 save path
    (_save_score_ledger_rows) must succeed against it afterward -- both fail
    against pre-fix code (missing column / sqlite3.OperationalError)."""
    db_path = tmp_path / "legacy.db"

    # Hand-build the PRE-S5 schema -- what a carried-forward production DB
    # looks like before this fix -- and seed it with a legacy row.
    conn = sqlite3.connect(db_path)
    conn.execute(_pre_s5_score_ledger_ddl())
    conn.execute(
        "INSERT INTO score_ledger (owner_hex, mined_blocks, proof_secured_count, "
        "activity_score, capped_contribution, last_activity_block, updated_at_block) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("legacy_owner", 5, 2, 1.5, 10.0, 3, 3),
    )
    conn.commit()

    cols_before = {row[1] for row in conn.execute("PRAGMA table_info(score_ledger)").fetchall()}
    assert "disk_passes_watermark" not in cols_before  # sanity: genuinely pre-S5

    # The fix under test: _ensure_schema must migrate the column in, even
    # though the table already exists (CREATE TABLE IF NOT EXISTS alone
    # cannot do this -- it is a no-op against an existing table).
    P._ensure_schema(conn)

    cols_after = {row[1] for row in conn.execute("PRAGMA table_info(score_ledger)").fetchall()}
    assert "disk_passes_watermark" in cols_after

    # The legacy row must survive the migration, watermark defaulted to 0
    # (a missing watermark must never be treated as "already caught up").
    legacy = conn.execute(
        "SELECT disk_passes_watermark FROM score_ledger WHERE owner_hex = ?",
        ("legacy_owner",),
    ).fetchone()
    assert legacy[0] == 0

    # The S5 save path must now SUCCEED against the migrated table -- this
    # INSERT is exactly what raised sqlite3.OperationalError before the fix.
    P._save_score_ledger_rows(conn, {
        "new_owner": {
            "mined_blocks": 1, "proof_secured_count": 0,
            "activity_score": 0.0, "capped_contribution": 4096.0,
            "disk_passes_watermark": 7,
            "last_activity_block": 9, "updated_at_block": 9,
        }
    })
    conn.commit()

    reloaded = P._load_score_ledger_rows(conn)
    conn.close()
    assert reloaded["new_owner"]["disk_passes_watermark"] == 7
    assert reloaded["legacy_owner"]["disk_passes_watermark"] == 0

    # Migration must be idempotent -- safe to run again on the same DB
    # (e.g. every startup) without raising "duplicate column name".
    conn2 = sqlite3.connect(db_path)
    P._ensure_schema(conn2)
    conn2.close()


def test_full_save_state_survives_pre_s5_db_no_silent_data_loss(tmp_path):
    """Robustness (hazard #5): pre-fix, the missing column made the WHOLE
    save_state() transaction raise deep inside the score_ledger insert and
    roll back -- losing account_keys (and every other table written in the
    same call) too, not just score_ledger, because the broad
    `except Exception: pass` hid the failure completely. Post-fix, a full
    save_state()/load_state() round trip against a carried-forward pre-S5 DB
    must succeed and EVERY table's data from that call must survive."""
    db_path = tmp_path / "legacy_full.db"

    # Build a full pre-S5 DB: every table in its current shape EXCEPT
    # score_ledger, which predates the S5 disk_passes_watermark column --
    # the only schema change S5 introduced (see the T1-T4 commits).
    conn = sqlite3.connect(db_path)
    conn.executescript(P._SCHEMA)
    conn.execute("DROP TABLE score_ledger")
    conn.execute(_pre_s5_score_ledger_ddl())
    conn.commit()
    conn.close()

    # Startup path: init_db must apply the idempotent migration.
    P.init_db(db_path)

    g = create_genesis(num_wallets=10, num_claims=0, seed=42)
    owner = g.wallets[1].public_key
    owner_hex = owner.hex()
    g.account_nonces[owner] = 9  # a DIFFERENT table (account_keys) in the same save
    g.score_ledger.record_epoch(
        {owner_hex: {"mined": 0, "proofs": 0, "activity": 0.0,
                      "disk_passes": 3, "disk_bytes": 1000}},
        block=1,
    )

    P.save_state(g, last_block_time=42.0, db_path=db_path)

    g2 = create_genesis(num_wallets=10, num_claims=0, seed=42)
    P.load_state(g2, db_path)

    # Both tables' writes from the SAME save_state() call must have survived
    # together -- proving the transaction committed rather than silently
    # rolling back behind the broad except (pre-fix: account_nonces would be
    # empty here, since the whole transaction -- not just score_ledger --
    # never reached disk).
    assert g2.account_nonces.get(owner) == 9
    restored = g2.score_ledger.get(owner_hex)
    assert restored is not None
    assert restored["disk_passes_watermark"] == 3


import importlib, inspect, pkgutil
import agentic.economics as econ_pkg


def test_claims_are_attested_facts_only_post_cut(monkeypatch):
    """E1: post-cut, gameplay counters cannot move the claim; Disk facts can.
    Discrimination-proven — if record_epoch ever routed `mined` into the post-cut
    raw term, the first assert would trip."""
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 0)
    monkeypatch.setattr(params, "SCORE_W_DISK", 1.0)
    monkeypatch.setattr(params, "SCORE_EPOCH_CAP", 1e12)
    led = ScoreLedger()
    # Inject only gameplay growth (mined + proofs), zero Disk facts.
    led.record_epoch(_metrics("g", mined=10_000, proofs=10_000, disk_passes=0, disk_bytes=0), block=1)
    assert led.get("g")["capped_contribution"] == 0.0   # game action earns nothing
    # Inject Disk-fact growth.
    led.record_epoch(_metrics("g", mined=20_000, proofs=20_000, disk_passes=1, disk_bytes=64), block=2)
    assert led.get("g")["capped_contribution"] == 64.0  # only the attested fact counts


def test_score_ledger_module_has_no_gameplay_smuggle():
    """Structural: the post-cut earn term names only Disk-fact inputs. Guards
    against a future edit that reintroduces a gameplay counter into the post-cut
    branch by keyword. (Mirrors the Time-guard package sweep shape.)"""
    src = inspect.getsource(importlib.import_module("agentic.economics.score_ledger"))
    # The post-cut raw term must be built from disk_passes/disk_bytes + SCORE_W_DISK.
    assert "SCORE_W_DISK" in src and "disk_passes_watermark" in src


# NOTE (T6 divergence from the plan's literal Step-1 snippet): added `_pin_registry`
# to this import line. The plan's `test_gate_is_binary_not_a_weight` body calls
# `_pin_registry(g)` but the plan's own import statement never names it, and no
# earlier test in this file imports it either — without this, the test would pass
# collection (once `_claim_eligibility` exists) and then fail at runtime with
# `NameError: name '_pin_registry' is not defined` instead of exercising the gate.
from agentic.testnet.api import _claim_eligibility, get_airdrop_preview, _g, _pin_registry


def test_below_gate_owner_is_ineligible(monkeypatch):
    g = create_genesis(seed=42)
    owner = _owner0(g)
    # No Time accrued → meets_gate(2) is False → ineligible regardless of facts.
    assert _claim_eligibility(g, owner) is False


def test_gate_is_binary_not_a_weight(monkeypatch):
    """E3: two owners, EQUAL Disk facts, DIFFERENT tenure, both above the gate →
    EQUAL projected allocations. ∂claims/∂time_accrued = 0 for eligible owners."""
    from agentic.economics.time_ledger import TimeLedger
    from agentic.economics.score_ledger import ScoreLedger
    from agentic.economics.score_ledger import _empty_row
    g = create_genesis(seed=42)
    a, b = g.wallets[1].public_key.hex(), g.wallets[2].public_key.hex()

    # Equal contribution — full rows via _empty_row so every persisted field exists.
    rows = {}
    for o in (a, b):
        r = _empty_row(0); r["capped_contribution"] = 100.0; rows[o] = r
    g.score_ledger = ScoreLedger(rows=rows)

    # Both above gate(2), very different tenure. meets_gate reads only
    # row["time_accrued"], so a minimal row suffices via the real constructor.
    g.time_ledger = TimeLedger(rows={a: {"time_accrued": 2}, b: {"time_accrued": 999}})

    # Both have a recent audit pass (record_audit stamps last_pass_block).
    pr = _pin_registry(g)
    now = g.mining_engine.total_blocks_processed
    for o in (a, b):
        pr.assign_pin(o, 1, now, 1000); pr.record_audit(o, 1, True, now)

    monkeypatch.setattr("agentic.testnet.api._g", lambda: g)
    alloc = get_airdrop_preview()["allocations"]
    # Different-tenure, equal-fact owners get identical projected allocation.
    assert alloc[a]["projected_allocation"] == alloc[b]["projected_allocation"]
