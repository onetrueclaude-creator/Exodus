"""Epoch beacon: drand → Solana-slot → deterministic-local ladder (spec §3.3).

Default (AGENTIC_BEACON unset) is the deterministic LOCAL chain so genesis
and CI stay hermetic; real sources are opt-in via AGENTIC_BEACON=1.
"""
import hashlib

from agentic.vault import beacon as beacon_mod
from agentic.vault.beacon import EpochBeacon, get_epoch_beacon


def test_local_default_is_deterministic_chain(monkeypatch):
    monkeypatch.delenv("AGENTIC_BEACON", raising=False)
    b1 = get_epoch_beacon(None)
    b2 = get_epoch_beacon(None)
    assert b1.source == "local" and not b1.stale
    assert b1.value == b2.value == hashlib.sha256(b"agentic-local-beacon:genesis").digest()
    b3 = get_epoch_beacon(b1)
    assert b3.value == hashlib.sha256(b"agentic-local-beacon:" + b1.value).digest()
    assert b3.value != b1.value


def test_drand_used_when_enabled(monkeypatch):
    monkeypatch.setenv("AGENTIC_BEACON", "1")
    monkeypatch.setattr(beacon_mod, "_fetch_drand", lambda: (4242, bytes.fromhex("ab" * 32)))
    b = get_epoch_beacon(None)
    assert b.source == "drand" and b.round_id == 4242 and not b.stale
    assert b.value == bytes.fromhex("ab" * 32)


def test_solana_fallback_when_drand_fails(monkeypatch):
    monkeypatch.setenv("AGENTIC_BEACON", "1")
    monkeypatch.setattr(beacon_mod, "_fetch_drand", lambda: None)
    monkeypatch.setattr(beacon_mod, "_fetch_solana_blockhash", lambda: bytes.fromhex("cd" * 32))
    b = get_epoch_beacon(None)
    assert b.source == "solana" and not b.stale


def test_stale_reuses_prev_and_flags(monkeypatch):
    monkeypatch.setenv("AGENTIC_BEACON", "1")
    monkeypatch.setattr(beacon_mod, "_fetch_drand", lambda: None)
    monkeypatch.setattr(beacon_mod, "_fetch_solana_blockhash", lambda: None)
    prev = EpochBeacon(value=b"\x11" * 32, source="drand", round_id=1, stale=False)
    b = get_epoch_beacon(prev)
    assert b.stale and b.source == "stale" and b.value == prev.value


def test_stale_with_no_prev_falls_back_to_local(monkeypatch):
    monkeypatch.setenv("AGENTIC_BEACON", "1")
    monkeypatch.setattr(beacon_mod, "_fetch_drand", lambda: None)
    monkeypatch.setattr(beacon_mod, "_fetch_solana_blockhash", lambda: None)
    b = get_epoch_beacon(None)
    assert b.stale and len(b.value) == 32
