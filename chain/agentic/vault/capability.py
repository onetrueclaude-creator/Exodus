"""Capability probe for the shard-fetch auth gate (issue #221).

`shard_fetch_is_authenticated(app)` answers exactly one question: is the
`/api/vault/shard` route signature-gated in THIS process, right now? A later
consumer (the S4 entry-write path, `post_vault_entry`) calls this before
accepting a `network`-visibility write, so "a network write while the shard
route is unauthenticated" is refused by construction rather than by operator
memory. See docs/superpowers/specs/2026-07-16-issue-221-shard-route-auth-design.md
Sec 8 ("Gate-as-code: the fail-closed network-write guard").

Deliberately NOT cached (design D2): the dev-bypass check below is
env-dependent, not static -- the chain test suite sets
ALLOW_DEV_CUSTODIAL_SIGN=1 globally (tests/conftest.py) and individual tests
monkeypatch.delenv it while sharing the same module-global app singleton, so
a per-app cache would be poisoned by whichever probe call ran first and go
stale the instant a later test flips the env var (order-dependent test
results). The probe only ever runs on `network` writes, so the cost of
evaluating it fresh -- iterating ~100 routes plus one inspect.getsource call
-- is trivial at testnet write rates. Runtime safety is identical either way:
the environment cannot change under a live, already-running process from
outside it.

Scope (design D3): this probe pins ONE route. The broader invariant -- that
no OTHER route serves raw payload bytes -- is NOT this function's job; it is
carried by the standing payload-access allowlist tripwire
(chain/tests/test_vault_capability.py::test_p6_payload_access_tripwire), not
by this module.
"""
from __future__ import annotations

import inspect


def shard_fetch_is_authenticated(app) -> bool:
    """True IFF the /api/vault/shard route is signature-gated in THIS
    process. ANY inspection failure returns False (fail closed).

    Checks, in order (first match decides):
      1. Dev-bypass active (ALLOW_DEV_CUSTODIAL_SIGN=1) -> False. Under the
         bypass the route is structurally wired but behaviorally open.
      2. Any route whose path starts with "/api/vault/shard" accepts GET
         -> False. Catches a convenience GET being re-added.
      3. A POST /api/vault/shard route must exist AND its endpoint source
         must contain a `verify_write(` call -> else False. Catches auth
         being removed from the handler.
      4. Any exception anywhere (route table oddities, source unavailable
         in an exotic deploy) -> False.
    """
    try:
        from agentic.testnet.signing import _dev_bypass

        if _dev_bypass():
            return False

        post_shard_route = None
        for route in app.routes:
            path = getattr(route, "path", None)
            if path is None or not path.startswith("/api/vault/shard"):
                continue
            methods = getattr(route, "methods", None) or set()
            if "GET" in methods:
                return False
            if path == "/api/vault/shard" and "POST" in methods:
                post_shard_route = route

        if post_shard_route is None:
            return False

        endpoint = getattr(post_shard_route, "endpoint", None)
        if endpoint is None:
            return False
        source = inspect.getsource(endpoint)
        return "verify_write(" in source
    except Exception:
        return False
