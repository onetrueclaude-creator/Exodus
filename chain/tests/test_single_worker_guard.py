"""R7 — single-worker runtime guard.

The chain holds mutable module-global state and does an unlocked nonce
read-modify-write, so it MUST run as a SINGLE Uvicorn worker. These tests verify:

  1. the OS file-lock mechanism rejects a second worker (the core R7 guarantee);
  2. the guard's startup handler is a SAFE NO-OP for the test suite (which builds
     the app many times inside one process) — so adding it keeps the suite green.

The handler self-disables under pytest, so the "enabled" paths are exercised by
monkeypatching `_running_under_pytest` to False (simulating a real server run).
"""
from __future__ import annotations

import os

import pytest

from agentic.testnet import api as _api


def test_acquire_lock_then_second_acquire_blocks(tmp_path):
    """First acquire wins; a second acquire on the same path (a second worker)
    is rejected with OSError — the load-bearing R7 guarantee."""
    lock_path = tmp_path / "agentic-chain.worker.lock"
    fd1 = _api._acquire_single_worker_lock(lock_path)
    try:
        with pytest.raises(OSError):
            _api._acquire_single_worker_lock(lock_path)
    finally:
        os.close(fd1)


def test_lock_released_after_close(tmp_path):
    """Closing the fd releases the OS lock, so a clean restart can re-acquire it
    (no permanent lockout after a graceful exit)."""
    lock_path = tmp_path / "agentic-chain.worker.lock"
    fd1 = _api._acquire_single_worker_lock(lock_path)
    os.close(fd1)
    fd2 = _api._acquire_single_worker_lock(lock_path)  # would raise if still held
    os.close(fd2)


def test_guard_is_noop_by_default(monkeypatch):
    """Default (env flag unset) => the startup guard acquires no lock. This is
    why the suite's repeated in-process app startups never trip it."""
    monkeypatch.delenv("AGENTIC_SINGLE_WORKER_GUARD", raising=False)
    monkeypatch.setattr(_api, "_SINGLE_WORKER_GUARD_ENABLED", False)
    saved = _api._single_worker_lock_fd
    _api._single_worker_lock_fd = None
    try:
        _api._enforce_single_worker_guard()
        assert _api._single_worker_lock_fd is None
    finally:
        _api._single_worker_lock_fd = saved


def test_guard_skipped_under_pytest_even_if_enabled(monkeypatch, tmp_path):
    """Even with the flag ON, the guard no-ops under pytest (defense in depth):
    a developer running the suite with the deploy env set stays green."""
    monkeypatch.setattr(_api, "_SINGLE_WORKER_GUARD_ENABLED", True)
    monkeypatch.setattr(_api, "_SINGLE_WORKER_LOCK_PATH", tmp_path / "x.lock")
    saved = _api._single_worker_lock_fd
    _api._single_worker_lock_fd = None
    try:
        _api._enforce_single_worker_guard()  # pytest detected => skipped
        assert _api._single_worker_lock_fd is None
    finally:
        if _api._single_worker_lock_fd is not None:
            os.close(_api._single_worker_lock_fd)
        _api._single_worker_lock_fd = saved


def test_guard_acquires_when_enabled_and_free(monkeypatch, tmp_path):
    """Enabled + not-pytest + uncontended => acquires the lock, and a second
    in-process call is a harmless re-entrant no-op (same fd)."""
    lock_path = tmp_path / "agentic-chain.worker.lock"
    monkeypatch.setattr(_api, "_SINGLE_WORKER_GUARD_ENABLED", True)
    monkeypatch.setattr(_api, "_SINGLE_WORKER_LOCK_PATH", lock_path)
    monkeypatch.setattr(_api, "_running_under_pytest", lambda: False)
    saved = _api._single_worker_lock_fd
    _api._single_worker_lock_fd = None
    try:
        _api._enforce_single_worker_guard()
        assert _api._single_worker_lock_fd is not None
        first_fd = _api._single_worker_lock_fd
        _api._enforce_single_worker_guard()  # re-entrant
        assert _api._single_worker_lock_fd == first_fd
    finally:
        if _api._single_worker_lock_fd is not None:
            os.close(_api._single_worker_lock_fd)
        _api._single_worker_lock_fd = saved


def test_guard_refuses_second_worker_when_enabled(monkeypatch, tmp_path):
    """Enabled + not-pytest + lock already held (by another open fd, i.e. the
    first worker) => the second worker is refused with RuntimeError and acquires
    nothing. This is the real 'refuse to serve' path."""
    lock_path = tmp_path / "agentic-chain.worker.lock"
    monkeypatch.setattr(_api, "_SINGLE_WORKER_GUARD_ENABLED", True)
    monkeypatch.setattr(_api, "_SINGLE_WORKER_LOCK_PATH", lock_path)
    monkeypatch.setattr(_api, "_running_under_pytest", lambda: False)
    saved = _api._single_worker_lock_fd
    _api._single_worker_lock_fd = None
    held = _api._acquire_single_worker_lock(lock_path)  # the "first worker"
    try:
        with pytest.raises(RuntimeError):
            _api._enforce_single_worker_guard()
        assert _api._single_worker_lock_fd is None  # nothing acquired by loser
    finally:
        os.close(held)
        _api._single_worker_lock_fd = saved
