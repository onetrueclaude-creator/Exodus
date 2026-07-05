"""DePIN Vault S3 — Time (tenure) ledger tests (design spec 2026-07-02 §2.1,
founder round 2026-07-05: GATES ONLY).

Unit: accrual watermark semantics (the restart-farming defense), sqrt
influence, T(N) gate reads. Integration tests (persistence, _do_mine hook,
endpoints, soulbound tripwires) are appended by later tasks.
"""
import pytest

from agentic.economics.time_ledger import TimeLedger, gate_threshold
from agentic.params import TIME_TICKS_PER_EPOCH, TIME_INFLUENCE_EXPONENT

OWNER = "a" * 64
OTHER = "b" * 64


def _ledger_with_accrued(n: int) -> TimeLedger:
    """A ledger where OWNER served n epochs (one new pass before each boundary)."""
    tl = TimeLedger()
    for i in range(1, n + 1):
        tl.accrue_epoch({OWNER: i}, block=i * 10)
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
        tl.accrue_epoch({OWNER: 3}, block=20)      # present but not serving: flat
        assert tl.get(OWNER)["time_accrued"] == 1

    def test_new_passes_at_next_boundary_grant_second_tick(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 3}, block=10)
        tl.accrue_epoch({OWNER: 5}, block=20)
        assert tl.get(OWNER)["time_accrued"] == 2
        assert tl.get(OWNER)["passes_watermark"] == 5

    def test_restart_reconstruction_never_double_counts(self):
        """THE regression this design exists for. Pin-registry pass counts are
        cumulative-since-genesis and persisted, so the watermark must ride the
        persisted row — a reconstructed ledger fed the same totals again (the
        exact post-restart situation) must grant nothing. The score_ledger
        trick (empty in-memory watermark) would grant a free tick per reboot."""
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 5}, block=10)
        assert tl.get(OWNER)["time_accrued"] == 1

        restored = TimeLedger(rows=tl.all())            # reboot: rows reloaded whole
        restored.accrue_epoch({OWNER: 5}, block=30)     # same cumulative facts
        assert restored.get(OWNER)["time_accrued"] == 1  # no restart farming

        restored.accrue_epoch({OWNER: 6}, block=40)     # genuinely new pass
        assert restored.get(OWNER)["time_accrued"] == 2

    def test_watermark_regression_resyncs_without_subtracting(self):
        tl = TimeLedger()
        tl.accrue_epoch({OWNER: 5}, block=10)
        tl.accrue_epoch({OWNER: 2}, block=20)      # registry regressed (reseed)
        row = tl.get(OWNER)
        assert row["time_accrued"] == 1            # tenure never decreases
        assert row["passes_watermark"] == 2        # resynced downward
        tl.accrue_epoch({OWNER: 3}, block=30)      # +1 pass from the resynced base
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
