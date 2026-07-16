"""S4-#221-C precondition (issue #221 design §8.2/§8.3/§9): the fail-closed
`network`-write guard in `post_vault_entry`, plus the standing second-door
structural pin.

`post_vault_entry` is the ONE production door that may write a
`network`-visibility vault atom. A `network` atom becomes readable by every
enrolled pinner the moment it lands in a shard (D7), so writing one while
`/api/vault/shard` is not signature-gated would hand an unauthenticated
fetcher a way to read it before the route is actually locked down. This
guard makes "no network entry written while the shard route is unauth" true
by construction rather than by operator memory (discharging the S4 Task 13
hard gate's leg 2 — see design §8.4).

G1 is written RED-first: run against the pre-gate code, it fails (a
`network` write currently succeeds unconditionally), proving the test is
discriminating and not a tautology.
"""
import inspect

import pytest
from fastapi.testclient import TestClient

OWNER = "a" * 64
SVC = {"X-Service-Token": "test-svc"}


@pytest.fixture()
def client(monkeypatch):
    from agentic.testnet import api as api_module
    monkeypatch.setattr(api_module, "_VAULT_SERVICE_TOKEN", "test-svc")
    c = TestClient(api_module.app)
    r = c.post("/api/reset", headers={"X-Admin-Token": api_module._ADMIN_TOKEN})
    assert r.status_code == 200
    return c


def _entry(**over):
    base = {"kind": "agent_note", "text": "a quiet audit passes",
            "visibility": "public", "owner_hex": OWNER, "author": "neo",
            "origin": "token_authorized", "meta": {}}
    base.update(over)
    return base


# ── G1-G3: the write-handler gate's behavior (design §9 S4-branch table) ── #

def test_g1_network_write_refused_while_probe_forced_false(client, monkeypatch):
    """RED-first (design §9 G1): forcing the probe to report False must
    refuse a `network`-visibility write with 503. Discriminating: against
    the pre-gate code (post_vault_entry never consulted the probe at all)
    this exact request returned 200, so this test fails until the gate is
    implemented -- verified by running it before the implementation edit."""
    import agentic.vault.capability as capability_module
    monkeypatch.setattr(capability_module, "shard_fetch_is_authenticated",
                         lambda app: False)
    r = client.post(
        "/api/vault/entry",
        json=_entry(visibility="network", text="network body while shard route unauth"),
        headers=SVC,
    )
    assert r.status_code == 503
    assert "shard route is not authenticated" in r.json()["detail"]


def test_g2_network_write_accepted_while_probe_genuinely_true(client, monkeypatch):
    """design §9 G3 (dispatch's G2 label): with the shard route genuinely
    authenticated in this process (dev bypass off -- the real
    POST /api/vault/shard route already calls verify_write(), per the
    capability-probe P1 test in test_vault_capability.py), a `network`
    write is accepted."""
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    r = client.post(
        "/api/vault/entry",
        json=_entry(visibility="network", text="network body while shard route authed"),
        headers=SVC,
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["cid"]) == 64
    assert body["shard_id"] >= 0


def test_g3_public_write_accepted_with_probe_forced_false(client, monkeypatch):
    """design §9 G2: `public` writes are never gated, even in the one probe
    state that DOES gate `network` writes -- public content is
    world-readable by design, so no gate ever applies to it."""
    import agentic.vault.capability as capability_module
    monkeypatch.setattr(capability_module, "shard_fetch_is_authenticated",
                         lambda app: False)
    r = client.post(
        "/api/vault/entry",
        json=_entry(visibility="public", text="public while probe forced false"),
        headers=SVC,
    )
    assert r.status_code == 200


def test_g3_public_write_accepted_with_probe_genuinely_true(client, monkeypatch):
    """Same guarantee in the opposite probe state -- the dispatch's
    'accepted regardless of the probe' framing means both states must
    accept a `public` write."""
    monkeypatch.delenv("ALLOW_DEV_CUSTODIAL_SIGN", raising=False)
    r = client.post(
        "/api/vault/entry",
        json=_entry(visibility="public", text="public while probe genuinely true"),
        headers=SVC,
    )
    assert r.status_code == 200


# ── G4: second-door structural pin (D4) ─────────────────────────────────── #

def test_g4_second_door_pin_only_post_vault_entry_may_write_network():
    """Structural pin (design §8.2/D4): `ingest_entry()` has exactly one
    production door that may ever carry visibility="network" --
    post_vault_entry, guarded by the S4-#221-C fail-closed check. The only
    route endpoint whose source references both `ingest_entry(` and the
    literal string "network" must be post_vault_entry, and it must also
    still consult shard_fetch_is_authenticated. Any future backfill variant
    or new MCP-write route that starts writing `network` entries without
    wiring the same gate trips this immediately -- it does not need to name
    the offender in advance."""
    from agentic.testnet import api as api_module
    offenders = []
    for route in api_module.app.routes:
        endpoint = getattr(route, "endpoint", None)
        if endpoint is None:
            continue
        try:
            source = inspect.getsource(endpoint)
        except (OSError, TypeError):
            continue
        if "ingest_entry(" in source and '"network"' in source:
            offenders.append(endpoint.__name__)
    assert offenders == ["post_vault_entry"], (
        f"expected only post_vault_entry to reference both ingest_entry( and "
        f'"network"; found {offenders} instead -- any other ingest_entry '
        f'caller must hardcode visibility="public" (design §8.2/D4)'
    )
    entry_source = inspect.getsource(api_module.post_vault_entry)
    assert "shard_fetch_is_authenticated" in entry_source, (
        'post_vault_entry references "network" but no longer consults '
        "shard_fetch_is_authenticated -- the fail-closed gate was removed "
        "while the network-write path stayed"
    )
