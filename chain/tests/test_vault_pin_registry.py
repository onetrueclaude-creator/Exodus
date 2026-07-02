"""PlayerPinRegistry: durable per-(owner, shard) pin + audit history (spec §3.4).

Follows ScoreLedger's persistence semantics: rows are cumulative-since-genesis,
restored whole from SQLite; audit recording is idempotent-per-event and never
raises. Disk score inputs (pinned_bytes × pass_rate) come from here.
"""
from agentic.vault.pin_registry import PlayerPinRegistry

OWNER = "a" * 64


def test_assign_then_audit_accumulates_history():
    pr = PlayerPinRegistry()
    pr.assign_pin(OWNER, shard_id=3, block=10, size_bytes=4096)
    pr.record_audit(OWNER, shard_id=3, passed=True, block=12)
    pr.record_audit(OWNER, shard_id=3, passed=False, block=45)
    row = pr.get(OWNER)[3]
    assert row["passes"] == 1 and row["misses"] == 1
    assert row["last_pass_block"] == 12 and row["last_miss_block"] == 45
    assert row["assigned_block"] == 10 and row["active"] is True


def test_pinned_bytes_sums_active_shards_only():
    pr = PlayerPinRegistry()
    pr.assign_pin(OWNER, 0, block=1, size_bytes=100)
    pr.assign_pin(OWNER, 1, block=1, size_bytes=250)
    assert pr.pinned_bytes(OWNER) == 350
    pr.deactivate_pin(OWNER, 1, block=9)
    assert pr.pinned_bytes(OWNER) == 100


def test_pass_rate_cumulative_and_defaults_to_one():
    pr = PlayerPinRegistry()
    assert pr.pass_rate(OWNER) == 1.0            # no audits yet — no penalty
    pr.assign_pin(OWNER, 0, block=1, size_bytes=1)
    pr.record_audit(OWNER, 0, passed=True, block=2)
    pr.record_audit(OWNER, 0, passed=True, block=3)
    pr.record_audit(OWNER, 0, passed=False, block=4)
    assert abs(pr.pass_rate(OWNER) - (2 / 3)) < 1e-9


def test_audit_on_unknown_pin_autoassigns_never_raises():
    pr = PlayerPinRegistry()
    pr.record_audit(OWNER, shard_id=7, passed=True, block=5)
    row = pr.get(OWNER)[7]
    assert row["passes"] == 1 and row["size_bytes"] == 0


def test_restore_roundtrip_returns_copies():
    pr = PlayerPinRegistry()
    pr.assign_pin(OWNER, 2, block=1, size_bytes=64)
    pr.record_audit(OWNER, 2, passed=True, block=2)
    restored = PlayerPinRegistry(rows=pr.all())
    assert restored.get(OWNER)[2]["passes"] == 1
    restored.get(OWNER)[2]["passes"] = 999      # mutating the copy
    assert restored.get(OWNER)[2]["passes"] == 1  # does not touch internals
