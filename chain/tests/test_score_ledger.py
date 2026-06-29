"""W5 Score Ledger (Slice 1) — persistent, anti-sybil contribution ledger.

TDD coverage for the five plan tasks:
  T1  score params exist + secure is the heaviest weight
  T2  score_ledger table round-trips through save_state/load_state
  T3  ScoreLedger accumulator: composes, caps (M4/M5), resists sybil-splitting,
      and survives a restart with no double-count (the killer test)
  T4  per-epoch accrual is wired into the chain + persists across save/load
  T5  GET /api/score/{wallet_index} + GET /api/scores read endpoints
"""
from __future__ import annotations

from agentic import params


# --------------------------------------------------------------------------- #
# Task 1 — Score params                                                        #
# --------------------------------------------------------------------------- #
def test_score_params_exist_and_secure_is_heaviest():
    assert params.SCORE_W_SECURE > params.SCORE_W_MINE > 0
    assert params.SCORE_EPOCH_CAP > 0


# --------------------------------------------------------------------------- #
# Task 3 — ScoreLedger accumulator: compose + cap + delta-tracking            #
# --------------------------------------------------------------------------- #
def _norm(x):  # match the impl's slice-1 normalization (linear)
    return float(x)


def test_capped_contribution_composes_mine_and_secure():
    from agentic.economics.score_ledger import ScoreLedger
    sl = ScoreLedger()
    sl.record_epoch({"a": {"mined": 10, "proofs": 2, "activity": 0.5}}, block=1)
    row = sl.get("a")
    assert row["mined_blocks"] == 10 and row["proof_secured_count"] == 2
    assert row["activity_score"] == 0.5
    assert row["capped_contribution"] == min(
        params.SCORE_W_MINE * _norm(10) + params.SCORE_W_SECURE * _norm(2),
        params.SCORE_EPOCH_CAP,
    )


def test_epoch_cap_limits_gain_per_epoch():
    from agentic.economics.score_ledger import ScoreLedger
    sl = ScoreLedger()
    sl.record_epoch({"a": {"mined": 10_000, "proofs": 10_000, "activity": 0}}, block=1)
    assert sl.get("a")["capped_contribution"] == params.SCORE_EPOCH_CAP


def test_sybil_split_not_more_than_single_wallet():
    from agentic.economics.score_ledger import ScoreLedger
    honest = ScoreLedger()
    honest.record_epoch({"a": {"mined": 90, "proofs": 30, "activity": 0}}, 1)
    split = ScoreLedger()
    split.record_epoch(
        {f"s{i}": {"mined": 30, "proofs": 10, "activity": 0} for i in range(3)}, 1
    )
    total_split = sum(r["capped_contribution"] for r in split.all().values())
    # With a per-wallet per-epoch cap, splitting cannot beat the honest wallet's
    # capped gain.
    assert total_split <= 3 * honest.get("a")["capped_contribution"] + 1e-9
    # And each split wallet is itself capped.
    assert all(
        r["capped_contribution"] <= params.SCORE_EPOCH_CAP for r in split.all().values()
    )


def test_restart_no_double_count():
    """The killer test: rebuild from persisted cumulative; in-memory metrics
    reset to 0; the next epoch's delta must not re-count the restored work."""
    from agentic.economics.score_ledger import ScoreLedger
    sl = ScoreLedger()
    sl.record_epoch({"a": {"mined": 5, "proofs": 1, "activity": 0}}, 1)  # delta 5/1
    c1 = sl.get("a")["capped_contribution"]
    # Simulate restart: rebuild from persisted rows; in-memory metrics reset to 0.
    persisted = sl.all()
    sl2 = ScoreLedger(rows=persisted)  # cumulative restored; _last_flushed empty
    sl2.record_epoch({"a": {"mined": 5, "proofs": 1, "activity": 0}}, 2)  # delta 5/1 again
    assert sl2.get("a")["mined_blocks"] == 10  # 5 + 5, no double-count of the restored 5
    assert sl2.get("a")["proof_secured_count"] == 2
    assert sl2.get("a")["capped_contribution"] == c1 + c1
    # The persisted snapshot must not have been mutated by sl2's accrual.
    assert persisted["a"]["mined_blocks"] == 5


def test_get_unknown_owner_returns_none():
    from agentic.economics.score_ledger import ScoreLedger
    assert ScoreLedger().get("nobody") is None


# --------------------------------------------------------------------------- #
# Task 2 — score_ledger table persists through save_state / load_state        #
# --------------------------------------------------------------------------- #
def test_score_ledger_persists_round_trip(tmp_path):
    from agentic.testnet.genesis import create_genesis
    from agentic.testnet.persistence import init_db, save_state, load_state

    db = tmp_path / "score_state.db"
    init_db(db)

    g = create_genesis(num_wallets=10, num_claims=0, seed=42)
    owner_hex = g.wallets[1].public_key.hex()
    # Accrue some verifiable work into the ledger, then persist.
    g.score_ledger.record_epoch({owner_hex: {"mined": 7, "proofs": 3, "activity": 0.25}}, block=4)
    expected = g.score_ledger.get(owner_hex)
    save_state(g, last_block_time=123.0, db_path=db)

    # Reload into a fresh genesis (in-memory ledger empty before load).
    g2 = create_genesis(num_wallets=10, num_claims=0, seed=42)
    assert g2.score_ledger.get(owner_hex) is None
    load_state(g2, db)

    restored = g2.score_ledger.get(owner_hex)
    assert restored is not None
    assert restored["mined_blocks"] == expected["mined_blocks"] == 7
    assert restored["proof_secured_count"] == expected["proof_secured_count"] == 3
    assert restored["activity_score"] == expected["activity_score"] == 0.25
    assert restored["capped_contribution"] == expected["capped_contribution"]
    assert restored["last_activity_block"] == 4
    assert restored["updated_at_block"] == 4


def test_score_ledger_load_is_noop_on_empty_db(tmp_path):
    """An old/empty db (no score_ledger rows) must load to an empty ledger,
    not crash — fresh genesis fallback."""
    from agentic.testnet.genesis import create_genesis
    from agentic.testnet.persistence import init_db, load_state

    db = tmp_path / "empty.db"
    init_db(db)
    g = create_genesis(num_wallets=10, num_claims=0, seed=42)
    load_state(g, db)  # must not raise
    assert g.score_ledger.all() == {}


# --------------------------------------------------------------------------- #
# Task 4 — accrual wired into the mining/save cadence + persists              #
# --------------------------------------------------------------------------- #
def test_build_score_metrics_maps_wallet_index_to_owner_hex():
    """The keying contract: securing proofs are per wallet_index and MUST map to
    the same owner_hex that mining/activity use (g.wallets[i].public_key)."""
    from agentic.testnet.genesis import create_genesis
    from agentic.testnet.api import _build_score_metrics

    g = create_genesis(num_wallets=10, num_claims=0, seed=42)
    owner0 = g.wallets[0].public_key
    # Mining credits by owner bytes; securing proofs credit by wallet_index.
    g.mining_engine._blocks_mined_per_owner[owner0] = 4
    g.securing_registry.credit_proof_secured(0)
    g.securing_registry.credit_proof_secured(0)

    metrics = _build_score_metrics(g)
    owner0_hex = owner0.hex()
    assert owner0_hex in metrics
    assert metrics[owner0_hex]["mined"] == 4
    assert metrics[owner0_hex]["proofs"] == 2  # wallet_index 0 mapped to owner0_hex


def test_accrual_hooked_into_do_mine_and_persists(tmp_path, admin_headers):
    """Drive blocks through the real _do_mine; the ledger climbs with verifiable
    work, maps proofs by wallet_index correctly, and survives save/load."""
    from fastapi.testclient import TestClient
    from agentic.testnet import api as api_module
    from agentic.testnet.genesis import create_genesis
    from agentic.testnet.persistence import init_db, save_state, load_state

    c = TestClient(api_module.app)
    c.post("/api/reset", headers=admin_headers)
    g = api_module._g()
    owner0_hex = g.wallets[0].public_key.hex()

    # Singularity (wallet 0) earns mining yield each block. Credit a PoAW proof
    # for wallet 0 so the proof term (keyed by wallet_index) is exercised too.
    g.securing_registry.credit_proof_secured(0)

    # No ledger entry before any work.
    assert g.score_ledger.get(owner0_hex) is None

    for _ in range(3):
        api_module._do_mine(g)

    row = g.score_ledger.get(owner0_hex)
    assert row is not None
    assert row["mined_blocks"] == 3          # one mined block accrued per _do_mine
    assert row["proof_secured_count"] == 1   # the single credited proof, mapped by index
    assert row["capped_contribution"] > 0

    # Persist via the real save_state, reload into a fresh genesis → survives.
    db = tmp_path / "accrual.db"
    init_db(db)
    save_state(g, last_block_time=1.0, db_path=db)
    g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
    load_state(g2, db)
    restored = g2.score_ledger.get(owner0_hex)
    assert restored == row


# --------------------------------------------------------------------------- #
# Task 5 — read API: GET /api/score/{wallet_index} + GET /api/scores          #
# --------------------------------------------------------------------------- #
def test_score_read_endpoints(admin_headers):
    from fastapi.testclient import TestClient
    from agentic.testnet import api as api_module

    c = TestClient(api_module.app)
    c.post("/api/reset", headers=admin_headers)
    g = api_module._g()
    owner0_hex = g.wallets[0].public_key.hex()

    for _ in range(2):
        api_module._do_mine(g)

    # Single-wallet route: the scored Singularity returns its row.
    r = c.get("/api/score/0")
    assert r.status_code == 200
    body = r.json()
    assert body["owner_hex"] == owner0_hex
    assert body["wallet_index"] == 0
    assert body["mined_blocks"] == 2
    assert body["capped_contribution"] > 0
    # The spec's row fields are all present.
    for field in (
        "mined_blocks", "proof_secured_count", "activity_score",
        "capped_contribution", "last_activity_block", "updated_at_block",
    ):
        assert field in body

    # A valid-but-unscored wallet returns a zeroed row (its score is genuinely 0).
    r2 = c.get("/api/score/2")
    assert r2.status_code == 200
    assert r2.json()["capped_contribution"] == 0
    assert r2.json()["mined_blocks"] == 0

    # An unknown wallet 404s.
    assert c.get("/api/score/99999").status_code == 404

    # Bulk route: {owner_hex: row} for every scored owner.
    rs = c.get("/api/scores")
    assert rs.status_code == 200
    scores = rs.json()
    assert owner0_hex in scores
    assert scores[owner0_hex]["mined_blocks"] == 2
    assert scores[owner0_hex]["capped_contribution"] > 0
