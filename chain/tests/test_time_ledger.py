"""DePIN Vault S3 — Time (tenure) ledger tests (design spec 2026-07-02 §2.1,
founder round 2026-07-05: GATES ONLY).

Unit: accrual watermark semantics (the restart-farming defense), sqrt
influence, T(N) gate reads. Integration tests (persistence, _do_mine hook,
endpoints, soulbound tripwires) are appended by later tasks.
"""
import pytest

from agentic.economics.time_ledger import TimeLedger, gate_threshold
from agentic.params import TIME_EPOCH_BLOCKS, TIME_TICKS_PER_EPOCH, TIME_INFLUENCE_EXPONENT

OWNER = "a" * 64
OTHER = "b" * 64


def _ledger_with_accrued(n: int) -> TimeLedger:
    """A ledger where OWNER served n epochs (one new pass in each of n
    consecutive fixed block windows)."""
    tl = TimeLedger()
    for i in range(1, n + 1):
        tl.accrue_epoch({OWNER: i}, block=i * TIME_EPOCH_BLOCKS)
    return tl


class TestAccrualWatermark:
    def test_first_epoch_with_passes_grants_exactly_one_tick(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 3}, block=10)      # 3 passes, ONE epoch
        row = tl.get(OWNER)
        assert row["time_accrued"] == TIME_TICKS_PER_EPOCH   # flat: not 3
        assert row["passes_watermark"] == 3
        assert row["updated_at_block"] == 10

    def test_zero_or_absent_passes_grant_nothing(self):
        tl = TimeLedger()
        tl.accrue_epoch({}, block=5)
        tl.accrue_epoch({OWNER: 0}, block=6)       # miss-only owner: no row at all
        assert tl.get(OWNER) is None
        assert tl.all() == {}

    def test_unchanged_totals_at_next_boundary_grant_nothing(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 3}, block=10)
        tl.accrue_epoch({OWNER: 3}, block=TIME_EPOCH_BLOCKS + 20)  # next window, not serving: flat
        assert tl.get(OWNER)["time_accrued"] == 1

    def test_new_passes_at_next_boundary_grant_second_tick(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 3}, block=10)
        tl.accrue_epoch({OWNER: 5}, block=TIME_EPOCH_BLOCKS + 20)  # next window, new passes
        assert tl.get(OWNER)["time_accrued"] == 2
        assert tl.get(OWNER)["passes_watermark"] == 5

    def test_same_window_double_call_credits_once(self):
        """Reviewer repro (T1-A): two calls at blocks W+10 and W+20 — both
        inside the SAME fixed window — with advancing pass counts must still
        cap accrual at exactly one tick. Before this fix, "once per window"
        was unenforced caller discipline and this exact shape double-credited."""
        tl = TimeLedger()
        W = TIME_EPOCH_BLOCKS
        tl.accrue_epoch({OWNER: 3}, block=W + 10)
        tl.accrue_epoch({OWNER: 5}, block=W + 20)   # same window, MORE passes
        row = tl.get(OWNER)
        assert row["time_accrued"] == 1             # capped — NOT 2
        assert row["passes_watermark"] == 5         # latest total still recorded
        assert row["last_window"] == 1

    def test_next_window_with_new_passes_credits_again(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 3}, block=10)
        tl.accrue_epoch({OWNER: 5}, block=TIME_EPOCH_BLOCKS + 20)  # next window, new pass
        row = tl.get(OWNER)
        assert row["time_accrued"] == 2
        assert row["passes_watermark"] == 5

    def test_next_window_without_new_passes_credits_nothing(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 3}, block=10)
        tl.accrue_epoch({OWNER: 3}, block=TIME_EPOCH_BLOCKS + 20)  # next window, no new pass
        row = tl.get(OWNER)
        assert row["time_accrued"] == 1
        assert row["passes_watermark"] == 3

    def test_restart_reconstruction_never_double_counts(self):
        """THE regression this design exists for. Pin-registry pass counts are
        cumulative-since-genesis and persisted, so the watermark must ride the
        persisted row — a reconstructed ledger fed the same totals again (even
        in a later window, the realistic restart case) must grant nothing. The
        score_ledger trick (empty in-memory watermark) would grant a free tick
        per reboot."""
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 5}, block=10)
        assert tl.get(OWNER)["time_accrued"] == 1

        restored = TimeLedger(rows=tl.all())            # reboot: rows reloaded whole
        restored.accrue_epoch({OWNER: 5}, block=TIME_EPOCH_BLOCKS + 30)  # same facts, later window
        assert restored.get(OWNER)["time_accrued"] == 1  # no restart farming

        restored.accrue_epoch({OWNER: 6}, block=2 * TIME_EPOCH_BLOCKS + 40)  # genuinely new pass
        assert restored.get(OWNER)["time_accrued"] == 2

    def test_watermark_regression_resyncs_without_subtracting(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 5}, block=10)
        tl.accrue_epoch({OWNER: 2}, block=20)      # registry regressed (reseed), same window
        row = tl.get(OWNER)
        assert row["time_accrued"] == 1            # tenure never decreases
        assert row["passes_watermark"] == 2        # resynced downward
        tl.accrue_epoch({OWNER: 3}, block=TIME_EPOCH_BLOCKS + 30)  # next window: +1 pass from the resynced base
        assert tl.get(OWNER)["time_accrued"] == 2


class TestInfluenceAndGates:
    def test_sqrt_influence_curve(self):
        tl = _ledger_with_accrued(4)
        assert tl.sqrt_influence(OWNER) == pytest.approx(4 ** TIME_INFLUENCE_EXPONENT)  # 2.0
        assert tl.sqrt_influence(OTHER) == 0.0     # no history → zero influence

    def test_gate_threshold_curve(self):
        assert gate_threshold(0) == 0
        assert gate_threshold(1) == 0              # the starting level is never gated
        assert gate_threshold(2) == 2              # TIME_GATE_BASE
        assert gate_threshold(3) == 3              # ceil(2 * 1.5)
        assert gate_threshold(4) == 5              # ceil(2 * 1.5^2) = ceil(4.5)
        # Strictly non-decreasing — a later level never gets cheaper.
        thresholds = [gate_threshold(n) for n in range(1, 12)]
        assert thresholds == sorted(thresholds)

    def test_meets_gate_is_a_pure_threshold_read(self):
        tl = _ledger_with_accrued(3)               # 3 epochs of service
        assert tl.meets_gate(OWNER, 1) is True     # T(1) = 0
        assert tl.meets_gate(OWNER, 3) is True     # T(3) = 3 <= 3
        assert tl.meets_gate(OWNER, 4) is False    # T(4) = 5 > 3
        assert tl.meets_gate(OTHER, 1) is True     # unknown owner, ungated level
        assert tl.meets_gate(OTHER, 2) is False
        # GATES ONLY: reading a gate consumed nothing.
        assert tl.get(OWNER)["time_accrued"] == 3

    def test_get_and_all_return_copies(self):
        tl = _ledger_with_accrued(1)
        tl.get(OWNER)["time_accrued"] = 999
        assert tl.get(OWNER)["time_accrued"] == 1
        tl.all()[OWNER]["passes_watermark"] = 999
        assert tl.get(OWNER)["passes_watermark"] == 1


class TestPersistence:
    def test_genesis_state_has_fresh_time_ledger(self):
        from agentic.testnet.genesis import create_genesis
        g = create_genesis(seed=42)
        assert g.time_ledger.all() == {}

    def test_sqlite_roundtrip_preserves_counter_and_watermark(self, tmp_path):
        """save_state -> load_state restores tenure exactly, INCLUDING both
        the pass watermark and the window watermark — then a post-restart
        call in the SAME window, even with a genuinely advanced pass total,
        grants nothing (the end-to-end restart double-count defense, and the
        reviewer's T1-A repro shape survives a real persistence roundtrip)."""
        from agentic.testnet.genesis import create_genesis
        from agentic.testnet.persistence import init_db, save_state, load_state

        db = tmp_path / "t.db"
        init_db(db)
        g = create_genesis(seed=42)
        g.time_ledger.accrue_epoch({OWNER: 3}, block=8)
        g.time_ledger.accrue_epoch({OWNER: 5}, block=TIME_EPOCH_BLOCKS + 9)
        before = g.time_ledger.get(OWNER)
        assert before["time_accrued"] == 2 and before["passes_watermark"] == 5
        assert before["last_window"] == 1
        save_state(g, last_block_time=0.0, db_path=db)

        g2 = create_genesis(seed=42)
        load_state(g2, db_path=db)
        assert g2.time_ledger.get(OWNER) == before     # incl. passes_watermark + last_window
        g2.time_ledger.accrue_epoch({OWNER: 6}, block=TIME_EPOCH_BLOCKS + 99)  # same window, NEW pass
        assert g2.time_ledger.get(OWNER)["time_accrued"] == 2   # no free tick — window gate holds

    def test_clear_state_wipes_time_rows(self, tmp_path):
        from agentic.testnet.genesis import create_genesis
        from agentic.testnet.persistence import init_db, save_state, load_state, clear_state

        db = tmp_path / "t.db"
        init_db(db)
        g = create_genesis(seed=42)
        g.time_ledger.accrue_epoch({OWNER: 1}, block=1)
        save_state(g, last_block_time=0.0, db_path=db)
        clear_state(db)
        g2 = create_genesis(seed=42)
        load_state(g2, db_path=db)
        assert g2.time_ledger.get(OWNER) is None


def _force_next_window(g):
    """Park total_blocks_processed just below the next TIME_EPOCH_BLOCKS
    boundary so the next _do_mine() call's block_slot (= total_blocks_processed
    + 1, computed at agentic/testnet/api.py:775) lands in a new fixed window.

    S3 review R1 superseded ring-based accrual: rings open on cumulative
    AGNTC mined (agentic/lattice/epoch.py, decelerating quadratically) and
    are NOT time-like, so Time accrual keys on fixed block windows
    (``block // TIME_EPOCH_BLOCKS``) instead — this helper forces that
    boundary directly rather than mining TIME_EPOCH_BLOCKS real blocks.
    """
    current_window = g.mining_engine.total_blocks_processed // TIME_EPOCH_BLOCKS
    g.mining_engine.total_blocks_processed = (current_window + 1) * TIME_EPOCH_BLOCKS - 1


def _reset(c, api_module) -> None:
    """Reset the testnet and assert it actually took effect.

    Reads the LIVE ``api_module._ADMIN_TOKEN`` instead of the static
    ``admin_headers`` fixture value: an unrelated pre-existing bug elsewhere
    in this suite (tests/test_signed_writes_b4b.py::
    test_secure_endpoint_rejects_unsigned_when_bypass_off calls
    ``importlib.reload(api)`` after ``monkeypatch.setenv("ADMIN_TOKEN", ...)``,
    which re-executes ``_ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")`` at
    api.py:447 and permanently overwrites the module global for the rest of
    the pytest session — outlasting monkeypatch's own env-var teardown) can
    make the session's admin token silently diverge from what conftest.py's
    fixture sends, so a reset keyed to the stale fixture value 401s
    silently and every "before any work" assertion below would be testing
    stale cross-test leftovers instead of a clean boundary. Asserting the
    response here turns that hazard into a loud, immediate failure instead
    of a confusing downstream state-leak assertion.
    """
    r = c.post(
        "/api/reset", headers={"X-Admin-Token": api_module._ADMIN_TOKEN}
    )
    assert r.status_code == 200, (
        f"/api/reset failed ({r.status_code}): {r.text} — admin token may "
        "have been clobbered by an unrelated test (see docstring)"
    )


class TestBlockWindowAccrualHook:
    """Integration: the real _do_mine hook (S3 Task 3), driven through fixed
    block-window boundaries per Controller Resolution R1 — NOT ring-epochs."""

    def test_window_boundary_grants_tick_only_with_passed_audit(self):
        from fastapi.testclient import TestClient
        from agentic.testnet import api as api_module

        c = TestClient(api_module.app)
        _reset(c, api_module)
        g = api_module._g()
        owner0_hex = g.wallets[0].public_key.hex()

        # Window closes with NO passes → no Time row (present-and-serving unmet).
        _force_next_window(g)
        api_module._do_mine(g)
        assert g.time_ledger.get(owner0_hex) is None

        # Record a passed audit (the S1 fact source), close the next window.
        pr = api_module._pin_registry(g)
        pr.assign_pin(owner0_hex, shard_id=0, block=1, size_bytes=4096)
        pr.record_audit(owner0_hex, shard_id=0, passed=True, block=2)
        _force_next_window(g)
        api_module._do_mine(g)
        row = g.time_ledger.get(owner0_hex)
        assert row is not None and row["time_accrued"] == 1

        # Non-boundary block, same window: no accrual.
        api_module._do_mine(g)
        assert g.time_ledger.get(owner0_hex)["time_accrued"] == 1

        # Still the same window: calling again still can't double-credit.
        api_module._do_mine(g)
        assert g.time_ledger.get(owner0_hex)["time_accrued"] == 1

        # New pass + next window boundary → second tick.
        pr.record_audit(owner0_hex, shard_id=0, passed=True, block=99)
        _force_next_window(g)
        api_module._do_mine(g)
        assert g.time_ledger.get(owner0_hex)["time_accrued"] == 2

    def test_misses_never_accrue_time(self):
        from fastapi.testclient import TestClient
        from agentic.testnet import api as api_module

        c = TestClient(api_module.app)
        _reset(c, api_module)
        g = api_module._g()
        owner0_hex = g.wallets[0].public_key.hex()

        pr = api_module._pin_registry(g)
        pr.assign_pin(owner0_hex, shard_id=0, block=1, size_bytes=4096)
        pr.record_audit(owner0_hex, shard_id=0, passed=False, block=2)
        pr.record_audit(owner0_hex, shard_id=-1, passed=False, block=3)  # owner-level miss bucket
        _force_next_window(g)
        api_module._do_mine(g)
        assert g.time_ledger.get(owner0_hex) is None   # misses are not service

    def test_restart_then_window_boundary_without_new_passes_grants_nothing(
        self, tmp_path
    ):
        """End-to-end restart-farming defense through the REAL persistence path:
        earn a tick, save, reboot into a fresh genesis, force a window boundary
        with no new passes → tenure stays flat. Then genuinely serve again →
        it climbs."""
        from fastapi.testclient import TestClient
        from agentic.testnet import api as api_module
        from agentic.testnet.genesis import create_genesis
        from agentic.testnet.persistence import init_db, save_state, load_state

        c = TestClient(api_module.app)
        _reset(c, api_module)
        g = api_module._g()
        owner0_hex = g.wallets[0].public_key.hex()

        pr = api_module._pin_registry(g)
        pr.assign_pin(owner0_hex, shard_id=0, block=1, size_bytes=4096)
        pr.record_audit(owner0_hex, shard_id=0, passed=True, block=2)
        _force_next_window(g)
        api_module._do_mine(g)
        before = g.time_ledger.get(owner0_hex)
        assert before["time_accrued"] == 1

        db = tmp_path / "restart.db"
        init_db(db)
        save_state(g, last_block_time=1.0, db_path=db)

        g2 = create_genesis(num_wallets=50, num_claims=0, seed=42)
        load_state(g2, db_path=db)
        assert g2.time_ledger.get(owner0_hex) == before   # tenure + watermark restored

        _force_next_window(g2)
        api_module._do_mine(g2)                            # boundary, no new passes
        assert g2.time_ledger.get(owner0_hex)["time_accrued"] == 1   # no free tick

        g2.pin_registry.record_audit(owner0_hex, shard_id=0, passed=True, block=500)
        _force_next_window(g2)
        api_module._do_mine(g2)
        assert g2.time_ledger.get(owner0_hex)["time_accrued"] == 2


class TestTimeReadEndpoints:
    """Integration: GET /api/time/{wallet_index} + GET /api/time/leaderboard
    (S3 Task 4). Uses the module's _reset/_force_next_window helpers (S3
    review pattern), not admin_headers/_force_next_ring — accrual is fixed
    block-window based (Controller Resolution R1), not ring-based."""

    def test_single_wallet_contract(self):
        from fastapi.testclient import TestClient
        from agentic.testnet import api as api_module

        c = TestClient(api_module.app)
        _reset(c, api_module)
        g = api_module._g()
        owner0_hex = g.wallets[0].public_key.hex()

        pr = api_module._pin_registry(g)
        pr.assign_pin(owner0_hex, shard_id=0, block=1, size_bytes=1024)
        pr.record_audit(owner0_hex, shard_id=0, passed=True, block=2)
        _force_next_window(g)
        api_module._do_mine(g)

        r = c.get("/api/time/0")
        assert r.status_code == 200
        body = r.json()
        # Exact payload: the rank inputs (raw epochs + sqrt influence) and
        # nothing else — the internal passes_watermark/last_window
        # bookkeeping must never leak.
        assert set(body) == {
            "wallet_index", "owner_hex", "time_accrued", "influence",
            "updated_at_block",
        }
        assert body["owner_hex"] == owner0_hex
        assert body["wallet_index"] == 0
        assert body["time_accrued"] == 1
        assert body["influence"] == pytest.approx(1.0)
        assert body["updated_at_block"] > 0

        # Valid wallet with no service history → zeroed row, not 404.
        r2 = c.get("/api/time/2")
        assert r2.status_code == 200
        assert r2.json()["time_accrued"] == 0
        assert r2.json()["influence"] == 0.0

        # Out-of-range wallet → 404.
        assert c.get("/api/time/99999").status_code == 404

    def test_wallet_index_exact_boundary_404(self):
        """The guard at agentic/testnet/api.py::get_time is
        `wallet_index < 0 or wallet_index >= len(g.wallets)`. Only a wildly
        out-of-range index (99999, see test_single_wallet_contract) was
        covered — the boundary value itself (exactly len(g.wallets), the
        first invalid index) was untested, while one below it (the last
        valid index) must still resolve to a zeroed row rather than 404
        (#209 task 5)."""
        from fastapi.testclient import TestClient
        from agentic.testnet import api as api_module

        c = TestClient(api_module.app)
        _reset(c, api_module)
        g = api_module._g()
        n = len(g.wallets)

        # Last valid index: still resolves (zeroed row, no service history).
        r = c.get(f"/api/time/{n - 1}")
        assert r.status_code == 200
        assert r.json()["time_accrued"] == 0

        # Exactly len(wallets): the first invalid index — the boundary itself.
        assert c.get(f"/api/time/{n}").status_code == 404

    def test_leaderboard_sorted_and_route_order(self):
        from fastapi.testclient import TestClient
        from agentic.testnet import api as api_module

        c = TestClient(api_module.app)
        _reset(c, api_module)
        g = api_module._g()
        owner0_hex = g.wallets[0].public_key.hex()
        owner1_hex = g.wallets[1].public_key.hex()

        # Seed tenure at the ledger level (accrual mechanics proven in Task 3).
        # The second grant lands in a LATER fixed window (S3 review R1:
        # windowed, not ring-boundary, accrual) so owner0 genuinely earns a
        # second tick rather than a same-window no-op.
        g.time_ledger.accrue_epoch({owner0_hex: 1, owner1_hex: 1}, block=10)
        g.time_ledger.accrue_epoch(
            {owner0_hex: 2}, block=TIME_EPOCH_BLOCKS + 20
        )  # owner0: 2, owner1: 1

        r = c.get("/api/time/leaderboard")
        # Route-order regression guard: if /api/time/{wallet_index} were
        # registered first, "leaderboard" would 422 as a non-integer index.
        assert r.status_code == 200
        board = r.json()
        assert len(board) == 2
        assert [e["owner_hex"] for e in board] == [owner0_hex, owner1_hex]
        assert board[0]["time_accrued"] == 2
        assert board[0]["influence"] == pytest.approx(2 ** 0.5)
        assert board[1]["time_accrued"] == 1
        assert set(board[0]) == {"owner_hex", "time_accrued", "influence"}


class TestSoulboundStructuralInvariants:
    """Spec §2.1: Time transfers/purchases are structurally impossible — no
    API path and no ledger operation moves Time between owners. These are
    tripwires: adding any transfer-shaped surface fails them loudly and
    forces a deliberate Howey/soulbound re-review."""

    def test_time_api_surface_is_readonly_allowlist(self):
        from agentic.testnet import api as api_module

        time_routes = [
            r for r in api_module.app.routes
            if getattr(r, "path", "").startswith("/api/time")
        ]
        surface = {
            (r.path, tuple(sorted(r.methods))) for r in time_routes
        }
        # The frozen allowlist: two read-only routes, nothing else, ever.
        # (HEAD may be auto-added alongside GET by the framework — allow it.)
        assert {p for p, _ in surface} == {
            "/api/time/leaderboard", "/api/time/{wallet_index}",
        }
        for path, methods in surface:
            assert set(methods) <= {"GET", "HEAD"}, (
                f"{path} exposes {methods} — Time is read-only; no route may "
                f"write or move it (spec §2.1 soulbound)"
            )

    def test_time_ledger_public_surface_is_soulbound(self):
        from agentic.economics.time_ledger import TimeLedger

        public = sorted(
            name for name, member in vars(TimeLedger).items()
            if not name.startswith("_") and callable(member)
        )
        # The frozen allowlist: no method takes a second owner; nothing spends,
        # splits, or moves Time. Growing this list is a design decision that
        # must re-clear the soulbound/Howey review (spec §2.1, dossier §6).
        assert public == [
            "accrue_epoch", "all", "get", "meets_gate", "sqrt_influence",
        ]
