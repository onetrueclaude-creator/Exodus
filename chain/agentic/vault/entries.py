"""S4 vault entries — the ONE door game-native content enters the vault DAG
(design 2026-07-05 §5.4; founder gate 2026-07-09).

Kinds: haiku_ncp / agent_intro (game-written + backfill, D8: public) and
agent_note (MCP token-authorized writes, D2/D6). planet_post is deliberately
NOT an ingestable kind (D8): its in-game visibility is ownership/diplomacy-
gated, so it enters the index only under an explicit future decision — adding
it here must be a deliberate design change, not a default.

visibility='private' is structurally rejected at this layer (§5.2): a private
payload can never become an indexable entry atom, so no downstream code path
can ever embed or index it. The game's owner-encrypted private blobs use the
S1 shard path, never this module.

The payload is CANONICAL JSON (sorted keys, tight separators): identical
fields yield identical bytes, hence identical CIDs — idempotent backfill and
a rebuildable index (Global Constraint 8) fall out of content addressing.

NOTE: this module must never touch mint/reward machinery — the S4 structural
guards (tests/test_vault_mcp_structural.py) scan its source for money tokens,
mirroring the time_ledger reverse guard.
"""
from __future__ import annotations

import json

from agentic.params import VAULT_ENTRY_MAX_BYTES
from agentic.vault.dag import VaultDag
from agentic.vault.shard import shard_of_cid

ENTRY_KINDS = ("haiku_ncp", "agent_intro", "agent_note")
ENTRY_VISIBILITIES = ("public", "network")
ENTRY_ORIGINS = ("wallet_signed", "token_authorized")
_ENTRY_SCHEMA_V = 1


def build_entry_payload(
    *,
    kind: str,
    text: str,
    visibility: str,
    owner_hex: str,
    author: str,
    origin: str,
    meta: dict | None,
    created_block: int,
) -> bytes:
    """Validate + serialize one entry to its canonical atom payload."""
    if kind not in ENTRY_KINDS:
        raise ValueError(f"unsupported kind: {kind!r}")
    if visibility == "private":
        raise ValueError(
            "private content is never indexed — the vault entry layer rejects "
            "visibility='private' structurally (design §5.2 / D1)"
        )
    if visibility not in ENTRY_VISIBILITIES:
        raise ValueError(f"unsupported visibility: {visibility!r}")
    if origin not in ENTRY_ORIGINS:
        raise ValueError(f"unsupported origin: {origin!r}")
    if not text or not text.strip():
        raise ValueError("empty text")
    n_bytes = len(text.encode("utf-8"))
    if n_bytes > VAULT_ENTRY_MAX_BYTES:
        raise ValueError(
            f"text exceeds VAULT_ENTRY_MAX_BYTES: {n_bytes} > {VAULT_ENTRY_MAX_BYTES}"
        )
    doc = {
        "v": _ENTRY_SCHEMA_V,
        "kind": kind,
        "text": text,
        "visibility": visibility,
        "owner_hex": owner_hex,
        "author": author,
        "origin": origin,
        "meta": meta or {},
        "created_block": int(created_block),
    }
    return json.dumps(doc, sort_keys=True, separators=(",", ":")).encode("utf-8")


def parse_entry_payload(payload: bytes) -> dict | None:
    """Parse an atom payload back to an entry doc; None if it is not an S4
    entry atom (e.g. a genesis knowledge atom)."""
    try:
        doc = json.loads(payload.decode("utf-8"))
    except Exception:
        return None
    if not isinstance(doc, dict) or doc.get("v") != _ENTRY_SCHEMA_V:
        return None
    if doc.get("kind") not in ENTRY_KINDS:
        return None
    return doc


def ingest_entry(dag: VaultDag, **fields) -> tuple[str, int]:
    """Validate, add the atom, return (cid, shard_id). Content-addressed:
    re-ingesting identical fields is a no-op with the same CID."""
    payload = build_entry_payload(**fields)
    cid = dag.add_atom(payload)
    return cid, shard_of_cid(cid)
