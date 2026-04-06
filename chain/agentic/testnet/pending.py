"""Process pending transactions from Supabase write-through queue.

Phase 2 architecture: clients INSERT into ``pending_transactions`` (Supabase,
anon RLS). The local miner polls this table, executes each transaction against
chain state, and marks it processed or failed.

Supported action types:
- ``assign_subgrid`` — reassign subgrid cells for a wallet
- ``claim`` — claim a grid coordinate

All exceptions are swallowed (fire-and-forget) — the miner must never crash
from a bad transaction.
"""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agentic.testnet.genesis import GenesisState

log = logging.getLogger("agentic.pending")


# ---------------------------------------------------------------------------
# Fetch pending transactions from Supabase
# ---------------------------------------------------------------------------

def fetch_pending(limit: int = 20) -> list[dict]:
    """Fetch up to ``limit`` pending transactions, oldest first.

    Returns list of row dicts or empty list on any failure.
    """
    try:
        from agentic.testnet.supabase_sync import _get_client
        client = _get_client()
        result = (
            client.table("pending_transactions")
            .select("*")
            .eq("status", "pending")
            .order("created_at")
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        log.warning("fetch_pending failed: %s", e)
        return []


# ---------------------------------------------------------------------------
# Mark transaction status in Supabase
# ---------------------------------------------------------------------------

def _mark(txn_id: str, status: str, error_reason: str | None = None) -> None:
    """Update a transaction's status in Supabase."""
    try:
        from agentic.testnet.supabase_sync import _get_client
        client = _get_client()
        update = {"status": status, "processed_at": "now()"}
        if error_reason:
            update["error_reason"] = error_reason
        client.table("pending_transactions").update(update).eq("id", txn_id).execute()
    except Exception as e:
        log.warning("_mark(%s, %s) failed: %s", txn_id, status, e)


def mark_processed(txn_id: str) -> None:
    _mark(txn_id, "processed")


def mark_failed(txn_id: str, reason: str) -> None:
    _mark(txn_id, "failed", reason)


# ---------------------------------------------------------------------------
# Transaction handlers (one per action_type)
# ---------------------------------------------------------------------------

def _handle_assign_subgrid(g: GenesisState, payload: dict) -> None:
    """Reassign subgrid cells for a wallet."""
    wallet_index = payload.get("wallet_index")
    if wallet_index is None or wallet_index < 0 or wallet_index >= len(g.wallets):
        raise ValueError(f"Invalid wallet_index: {wallet_index}")

    wallet = g.wallets[wallet_index]
    owner = wallet.public_key
    alloc = g.subgrid_allocators.get(owner)
    if alloc is None:
        raise ValueError(f"No subgrid allocator for wallet {wallet_index}")

    from agentic.lattice.subgrid import SubcellType

    secure = payload.get("secure", 0)
    develop = payload.get("develop", 0)
    research = payload.get("research", 0)
    storage = payload.get("storage", 0)
    total = secure + develop + research + storage

    if total > 64:
        raise ValueError(f"Total cells {total} exceeds 64")

    # Reset then assign (same pattern as api.py assign_subgrid)
    alloc.assign(SubcellType.SECURE, 0)
    alloc.assign(SubcellType.DEVELOP, 0)
    alloc.assign(SubcellType.RESEARCH, 0)
    alloc.assign(SubcellType.STORAGE, 0)
    alloc.assign(SubcellType.SECURE, secure)
    alloc.assign(SubcellType.DEVELOP, develop)
    alloc.assign(SubcellType.RESEARCH, research)
    alloc.assign(SubcellType.STORAGE, storage)


def _handle_claim(g: GenesisState, payload: dict) -> None:
    """Claim a grid coordinate for a wallet."""
    from agentic.lattice.coordinate import GridCoordinate, resource_density
    from agentic.lattice.claims import claim_cost
    from agentic.consensus.validator import Validator
    from agentic.verification.agent import VerificationAgent, AgentState
    from agentic.params import NODE_GRID_SPACING
    import random as _random

    wallet_index = payload.get("wallet_index")
    if wallet_index is None or wallet_index < 0 or wallet_index >= len(g.wallets):
        raise ValueError(f"Invalid wallet_index: {wallet_index}")

    x, y = payload.get("x"), payload.get("y")
    if x is None or y is None:
        raise ValueError("Claim requires x and y coordinates")

    # Snap to grid
    x = round(x / NODE_GRID_SPACING) * NODE_GRID_SPACING
    y = round(y / NODE_GRID_SPACING) * NODE_GRID_SPACING

    # Ring-gating
    current_ring = g.epoch_tracker.current_ring
    coord_ring = max(abs(x), abs(y)) // NODE_GRID_SPACING
    if coord_ring > current_ring:
        raise ValueError(f"Coordinate ({x},{y}) in ring {coord_ring}, only ring {current_ring} open")

    coord = GridCoordinate(x=x, y=y)
    if g.claim_registry.get_claim_at(coord) is not None:
        raise ValueError(f"Coordinate ({x},{y}) already claimed")

    wallet = g.wallets[wallet_index]
    stake = max(1, payload.get("stake", 200))
    slot = g.mining_engine.total_blocks_processed

    g.claim_registry.register(owner=wallet.public_key, coordinate=coord, stake=stake, slot=slot)

    # Create validator + verification agent
    vid = len(g.validators)
    rng = _random.Random(vid + 7)
    v = Validator(id=vid, token_stake=float(stake), cpu_vpu=float(rng.randint(20, 120)), online=True)
    g.validators.append(v)
    agent = VerificationAgent(
        agent_id=f"verifier-{vid:03d}", validator_id=vid,
        vpu_capacity=v.cpu_vpu, registered_epoch=0, state=AgentState.ACTIVE)
    g.agents.append(agent)
    g.viewing_keys[wallet.public_key] = wallet.viewing_key


# Handler dispatch table
_HANDLERS = {
    "assign_subgrid": _handle_assign_subgrid,
    "claim": _handle_claim,
}


# ---------------------------------------------------------------------------
# Main processor — called from _auto_mine_loop()
# ---------------------------------------------------------------------------

def process_pending_transactions(g: GenesisState, db_path=None) -> int:
    """Fetch and process all pending transactions.

    Returns the number of transactions processed (success + failure).
    If ``db_path`` is provided, persists the last processed txn ID to SQLite.
    """
    rows = fetch_pending(limit=20)
    if not rows:
        return 0

    processed = 0
    last_id = None

    for row in rows:
        txn_id = row.get("id", "unknown")
        action_type = row.get("action_type", "")
        payload = row.get("payload", {})

        # Merge top-level wallet_index into payload for convenience
        if "wallet_index" in row and "wallet_index" not in payload:
            payload["wallet_index"] = row["wallet_index"]

        handler = _HANDLERS.get(action_type)
        if handler is None:
            mark_failed(txn_id, f"Unknown action_type: {action_type}")
            processed += 1
            last_id = txn_id
            continue

        try:
            handler(g, payload)
            mark_processed(txn_id)
            log.info("txn %s (%s) processed", txn_id, action_type)
        except Exception as e:
            mark_failed(txn_id, str(e))
            log.warning("txn %s (%s) failed: %s", txn_id, action_type, e)

        processed += 1
        last_id = txn_id

    # Persist last processed ID for crash recovery
    if last_id and db_path:
        try:
            import sqlite3
            with sqlite3.connect(str(db_path)) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO chain_meta (key, value) VALUES (?, ?)",
                    ("last_processed_txn_id", last_id),
                )
        except Exception as e:
            log.warning("Failed to persist last_processed_txn_id: %s", e)

    return processed
