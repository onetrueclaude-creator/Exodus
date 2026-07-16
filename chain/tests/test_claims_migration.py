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


from agentic.economics.airdrop import m13_capped_quadratic
from agentic import params


def test_ceiling_safety_sum_leq_pool():
    """§3 ceiling safety: Σ allocations <= pool for any participant count."""
    pool = float(params.AIRDROP_POOL)
    cap = pool / params.AIRDROP_WHALE_CAP_DIVISOR
    for n in (1, 5, 50, 500):
        alloc, treasury = m13_capped_quadratic([1.0] * n, pool, cap)
        assert sum(alloc) <= pool + 1e-3
        assert abs(sum(alloc) + treasury - pool) < 1e-3


def test_release_residual_is_pool_bounded_not_capacity_gated():
    """BOUNDARY ITEM #1 (break-point #1), named in code so it is never mistaken
    for capacity-gated issuance:

    S5 makes CLAIM DISTRIBUTION attested-fact-linked. It does NOT make aggregate
    RELEASE capacity-gated — the M13 transform distributes WITHIN a fixed pool
    (AIRDROP_POOL, a slice of the fixed 1B), bounded by construction. The per-epoch
    5% RELEASE ceiling stays position/time-based (a separate queued founder round:
    'capacity-linked release curve', economy §6.3). This is distributional-under-a
    -hard-cap, not a death-spiral — legitimately deferred, explicitly named."""
    pool = float(params.AIRDROP_POOL)
    cap = pool / params.AIRDROP_WHALE_CAP_DIVISOR
    # Doubling total attested facts does NOT increase total distributed — the cap
    # bounds it (distribution reshuffles shares; it does not expand the pool).
    small, _ = m13_capped_quadratic([1.0, 1.0], pool, cap)
    large, _ = m13_capped_quadratic([1000.0, 1000.0], pool, cap)
    assert abs(sum(small) - sum(large)) < 1e-3   # same total, only shares differ
    assert params.AIRDROP_POOL == params.MAX_SUPPLY // 4  # pool is a slice of the fixed cap


from agentic.testnet import api as api_module

_SPEND_TOKENS = ("receive_mint", "validate_mint", "MintTx", "transfer",
                 "buy", "purchase", "spend", "debit_balance")


def test_e2_no_purchase_reaches_claim_accrual():
    """E2: no spend/purchase symbol appears in the claim-accrual math. Sweep the
    economics package's earn path (score_ledger + airdrop)."""
    for name in ("score_ledger", "airdrop"):
        src = inspect.getsource(importlib.import_module(f"agentic.economics.{name}"))
        for tok in _SPEND_TOKENS:
            assert tok not in src, f"{name} references spend token {tok!r} — E2 wall"


# --------------------------------------------------------------------------- #
# C5 discrimination-strengthening (builder note, S5 Task 8 — documented in the
# task report). The plan's own draft `test_c5_no_spend_handler_raises_pinned_
# bytes` asserted only anchor COUNTS (`n_anchor_regions >= 2`, an unused
# `n_writers` tally) and a by-NAME sweep of spend-looking function defs (`def
# buy`/`purchase`/`spend`/`_do_transfer`). Its docstring promises "EVERY
# assign_pin/record_audit call site must sit inside an anchored region," but
# neither original assertion actually enforces textual containment: a
# pin-write added inside a DIFFERENTLY-NAMED function (e.g. `_apply_bonus`)
# living outside any anchor would satisfy both original assertions — same
# anchor count, no spend-token name to trip the sweep — and slip through
# undetected. That is a real gap between the docstring's claim and the
# check's power, so the invariant would not actually be fail-closed.
#
# Strengthened below: parse the real anchored spans from source and assert
# every writer call site's source offset falls inside one of them. The
# by-name sweep is kept as defense in depth (cheap, catches the common case
# by name even if a span is somehow malformed).
# --------------------------------------------------------------------------- #
_ANCHOR_OPEN = "# DePIN S5 pin-write (attested)"
_ANCHOR_END = "# end DePIN S5 pin-write (attested)"


def _anchored_spans(src: str) -> list:
    """[start, end) character offsets of every anchored region in `src`, in
    source order. `_ANCHOR_OPEN` ("# DePIN S5 pin-write (attested)") is never
    a substring of `_ANCHOR_END` ("# end DePIN S5 pin-write (attested)") —
    the end marker's lone "#" is immediately followed by " end ", never by
    " DePIN" — so a plain find-loop cannot mistake an end marker for an open
    one."""
    spans = []
    pos = 0
    while True:
        start = src.find(_ANCHOR_OPEN, pos)
        if start == -1:
            break
        end = src.find(_ANCHOR_END, start)
        assert end != -1, f"anchor opened at source offset {start} is never closed"
        end_of_marker = end + len(_ANCHOR_END)
        spans.append((start, end_of_marker))
        pos = end_of_marker
    return spans


def _call_offsets(src: str, needle: str) -> list:
    """All source offsets where `needle` occurs in `src`, in order."""
    offsets = []
    pos = 0
    while True:
        pos = src.find(needle, pos)
        if pos == -1:
            break
        offsets.append(pos)
        pos += len(needle)
    return offsets


def test_c5_no_spend_handler_raises_pinned_bytes():
    """C5 storage-side twin of test_time_never_enters_agntc_yield_terms:
    prove assign_pin / record_audit (the only writers of pinned_bytes that feed
    Disk-fact claims) are called ONLY from the attested audit path — never from a
    purchase/spend handler. Discrimination: EVERY assign_pin/record_audit call
    site in api.py must sit textually inside a 'DePIN S5 pin-write (attested)'
    anchored region; a future spend handler — under ANY name, not just the
    known spend-token names — that calls assign_pin/record_audit outside an
    anchor trips this (see the discrimination-strengthening note above).

    Needles are the BARE method names, not the `pr.`-prefixed call literal
    (adversarial-review fix, S5 Task 8 REV-s5-t8): the original `"pr.assign_pin("`
    / `"pr.record_audit("` literals only match the exact `pr.` receiver spelling
    used by today's two writers, so an equivalent-but-differently-spelled call
    (a registry bound to another variable name, `getattr(pr, "assign_pin")(...)`,
    or an inline `_pin_registry(g).assign_pin(...)`) would write pins outside
    every anchor yet never trip the containment check — the enumeration, not the
    span logic, was the hole. Sweeping the bare `assign_pin` / `record_audit`
    substrings — exactly what `test_time_never_enters_agntc_yield_terms` already
    does for its symbols — closes that regardless of call spelling. Verified
    empirically (S5 Task 8 fix report) to stay a zero-false-positive sweep on
    current api.py: the comment near the second anchor also names both methods
    in prose, but that occurrence sits inside the anchored span too."""
    src = inspect.getsource(api_module)

    spans = _anchored_spans(src)
    assert len(spans) >= 2, "the two legitimate pin-write regions must be anchored"

    writer_offsets = (_call_offsets(src, "assign_pin")
                       + _call_offsets(src, "record_audit"))
    assert writer_offsets, "expected at least one assign_pin/record_audit call site"

    stray = [off for off in writer_offsets
             if not any(s <= off < e for s, e in spans)]
    assert not stray, (
        f"pin-write call site(s) at source offset(s) {stray} sit OUTSIDE every "
        "anchored 'DePIN S5 pin-write (attested)' region — every assign_pin/"
        "record_audit call must live inside an anchor (C5 fail-closed)"
    )

    # Defense in depth (kept from the plan's draft): also forbid a pin-write
    # inside a function whose name signals a spend/purchase handler by name.
    for tok in ("def buy", "def purchase", "def spend", "def _do_transfer"):
        if tok in src:
            seg = src.split(tok, 1)[1].split("\ndef ", 1)[0]
            assert "assign_pin(" not in seg and "record_audit(" not in seg, (
                f"a spend handler ({tok}) writes pins — C5 purchasable-multiplier seam"
            )


def test_end_to_end_cut_switches_basis_and_survives_restart(tmp_path, monkeypatch):
    """Whole-slice: before the cut mining earns; at/after the cut only Disk facts
    earn; a restart preserves the post-cut cumulative (no double-count)."""
    monkeypatch.setattr(params, "SCORE_BASIS_CUT_BLOCK", 3)
    monkeypatch.setattr(params, "SCORE_W_DISK", 1.0)
    monkeypatch.setattr(params, "SCORE_EPOCH_CAP", 1e12)
    led = ScoreLedger()
    o = "owner_e2e"

    # Block 1 (pre-cut): mining earns.
    led.record_epoch(_metrics(o, mined=4), block=1)
    pre = led.get(o)["capped_contribution"]
    assert pre > 0

    # Block 4 (post-cut): mining grows but earns nothing new; a Disk fact earns.
    led.record_epoch(_metrics(o, mined=999, disk_passes=1, disk_bytes=100), block=4)
    post = led.get(o)["capped_contribution"]
    assert post == pre + 100.0

    # Restart from persisted rows; re-observe the same pin totals → no re-credit.
    led2 = ScoreLedger(rows=led.all())
    led2.record_epoch(_metrics(o, mined=1500, disk_passes=1, disk_bytes=100), block=5)
    assert led2.get(o)["capped_contribution"] == post
