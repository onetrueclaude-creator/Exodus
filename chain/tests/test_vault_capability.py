"""Tests for the shard-fetch capability probe + standing payload-access
tripwire (#221 design Sec 8.1/8.3, D2/D3).

`shard_fetch_is_authenticated(app)` is the "is /api/vault/shard actually
signature-gated in THIS process" question the S4 entry-write path consults
before accepting a `network`-visibility write. It is deliberately UNCACHED
(D2) -- see the docstring in agentic/vault/capability.py for why.

The payload-access tripwire (P6, D3) is the standing invariant that catches
the drift class the probe alone cannot see: a differently-named byte-serving
route (a debug/export route, say) appearing anywhere in the app.
"""
import inspect
from types import SimpleNamespace

import pytest

from agentic.testnet.api import app
from agentic.vault.capability import shard_fetch_is_authenticated


def _route(path, methods, endpoint):
    return SimpleNamespace(path=path, methods=set(methods), endpoint=endpoint)


def _fake_app(*routes):
    return SimpleNamespace(routes=list(routes))


# ── P1/P2: real app, both bypass states ─────────────────────────────────── #

def test_p1_real_app_bypass_off_true(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    assert shard_fetch_is_authenticated(app) is True


def test_p2_real_app_bypass_on_false(monkeypatch):
    monkeypatch.setenv("ALLOW_DEV_CUSTODIAL_SIGN", "1")
    assert shard_fetch_is_authenticated(app) is False


def test_order_independence_no_caching(monkeypatch):
    """D2: the probe must not cache -- flipping the bypass env var back and
    forth on the SAME shared app object must yield the state-correct answer
    every time, proving no earlier call's result leaks into a later one.
    This is exactly the suite-wide conftest.py bypass + per-test delenv
    pattern that made caching unsafe in the first place."""
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    assert shard_fetch_is_authenticated(app) is True
    monkeypatch.setenv("ALLOW_DEV_CUSTODIAL_SIGN", "1")
    assert shard_fetch_is_authenticated(app) is False
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    assert shard_fetch_is_authenticated(app) is True


# ── P3/P4/P5: synthetic apps (SimpleNamespace fakes -- no real FastAPI
#    registration, so route-signature quirks and global `inspect` state
#    never enter the picture; the probe only needs .routes/.path/.methods/
#    .endpoint) ────────────────────────────────────────────────────────── #

def test_p3_synthetic_unauth_get_route_is_false(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)

    def get_shard(sid: int):
        return {}

    fake = _fake_app(_route("/api/vault/shard/{sid}", {"GET"}, get_shard))
    assert shard_fetch_is_authenticated(fake) is False


def test_p4_synthetic_post_without_verify_write_is_false(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)

    def post_shard(req):
        return {}

    fake = _fake_app(_route("/api/vault/shard", {"POST"}, post_shard))
    assert shard_fetch_is_authenticated(fake) is False


def test_p5_inspection_failure_fails_closed(monkeypatch):
    """A builtin (no retrievable Python source) as the endpoint makes
    inspect.getsource raise naturally -- proves the probe fails closed on
    any inspection error without having to monkeypatch the global `inspect`
    module (which would risk breaking pytest's own introspection machinery
    mid-test)."""
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    fake = _fake_app(_route("/api/vault/shard", {"POST"}, len))
    assert shard_fetch_is_authenticated(fake) is False


def test_no_post_shard_route_at_all_is_false(monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    fake = _fake_app(_route("/api/vault/root", {"GET"}, lambda: {}))
    assert shard_fetch_is_authenticated(fake) is False


# ── P6: standing payload-access tripwire (D3) ───────────────────────────── #

def _payload_accessor_endpoints():
    """Every route endpoint on the real app whose source references a
    payload-byte accessor."""
    hits: dict[str, object] = {}
    for route in app.routes:
        endpoint = getattr(route, "endpoint", None)
        if endpoint is None:
            continue
        try:
            source = inspect.getsource(endpoint)
        except (OSError, TypeError):
            continue
        if "shard_sub_units(" in source or ".get_payload(" in source:
            hits[endpoint.__name__] = endpoint
    return hits


def test_p6_payload_access_tripwire():
    """Standing invariant: the ONLY route endpoints whose source references
    a payload-byte accessor (shard_sub_units( / .get_payload() are
    post_vault_shard_fetch (which must ALSO call verify_write() -- i.e. be
    the authenticated fetch route) and post_vault_submit_proof (length-sum
    only, never returns bytes). Any new/renamed byte-serving route trips
    this the moment it's added, regardless of its path."""
    hits = _payload_accessor_endpoints()
    assert set(hits) == {"post_vault_shard_fetch", "post_vault_submit_proof"}, (
        f"payload-byte accessor set drifted: {sorted(hits)} -- if this is a "
        "deliberate new route, it must be added to the frozen allowlist "
        "ABOVE only after a security review of what it exposes"
    )
    fetch_source = inspect.getsource(hits["post_vault_shard_fetch"])
    assert "verify_write(" in fetch_source, (
        "post_vault_shard_fetch no longer calls verify_write() -- the "
        "shard-fetch route would be serving payload bytes unauthenticated"
    )
