"""Supabase sync module for Agentic Chain testnet.

Pushes chain state to Supabase after each block is mined so that the
frontend can receive real-time updates via Supabase Realtime subscriptions
(postgres_changes on chain_status and agents tables).

Usage:
    from agentic.testnet.supabase_sync import sync_to_supabase
    sync_to_supabase(g, next_block_in=60.0)

This is fire-and-forget: all errors are caught internally so the blockchain
never crashes due to a Supabase connectivity issue.

Environment variables required:
    SUPABASE_URL              — Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY — Service role JWT (never commit this)
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env from the agentic-chain root (two levels up from this file)
_CHAIN_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_CHAIN_ROOT / ".env")
# Also try the Exodus repo root .env.local as fallback
load_dotenv(_CHAIN_ROOT.parent / ".env.local")

from agentic.lattice.coordinate import resource_density, storage_slots
from agentic.params import GENESIS_FACTION_MASTERS, GENESIS_HOMENODES, GENESIS_ORIGIN
from agentic.testnet.genesis import GenesisState

# Sets for fast O(1) lookup during sync
_ORIGIN_COORD: frozenset[tuple[int, int]] = frozenset([GENESIS_ORIGIN])
_FACTION_MASTER_COORDS: frozenset[tuple[int, int]] = frozenset(GENESIS_FACTION_MASTERS)
_GENESIS_HOMENODE_COORDS: frozenset[tuple[int, int]] = frozenset(GENESIS_HOMENODES)

# ---------------------------------------------------------------------------
# Coordinate mapping — chain grid → visual grid
# ---------------------------------------------------------------------------

_CHAIN_MIN: int = -3240
_CHAIN_SPAN: float = 6480.0
_VISUAL_SPAN: float = 8000.0
_VISUAL_HALF: float = 4000.0


def chain_to_visual(cx: int, cy: int) -> tuple[float, float]:
    """Map chain coordinates [-3240,3240] to visual coordinates [-4000,4000].

    Matches the chainToVisual() transform in src/services/testnetChainService.ts.
    """
    vx = ((cx - _CHAIN_MIN) / _CHAIN_SPAN) * _VISUAL_SPAN - _VISUAL_HALF
    vy = ((cy - _CHAIN_MIN) / _CHAIN_SPAN) * _VISUAL_SPAN - _VISUAL_HALF
    return round(vx, 2), round(vy, 2)

# ---------------------------------------------------------------------------
# Supabase client (singleton, lazy-initialized)
# ---------------------------------------------------------------------------

_SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
_SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_client: Optional[Client] = None


def _get_client() -> Client:
    """Return (and lazily initialize) the Supabase service-role client."""
    global _client
    if _client is None:
        if not _SUPABASE_URL or not _SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables. "
                "Add them to vault/agentic-chain/.env or export them in your shell."
            )
        _client = create_client(_SUPABASE_URL, _SUPABASE_SERVICE_ROLE_KEY)
    return _client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def sync_to_supabase(g: GenesisState, next_block_in: float = 60.0) -> None:
    """Push current chain state to Supabase.

    Upserts:
    - ``chain_status`` (singleton row id=1) with block stats
    - ``agents`` (one row per active claim)

    All exceptions are swallowed so the blockchain miner never crashes.
    """
    try:
        _sync_chain_status(g, next_block_in)
    except Exception:
        pass  # never crash the miner

    try:
        _sync_agents(g)
    except Exception:
        pass  # never crash the miner

    try:
        _sync_subgrid_allocations(g)
    except Exception:
        pass

    try:
        _sync_resource_rewards(g)
    except Exception:
        pass


def sync_message(
    msg_id: str,
    sx: int,
    sy: int,
    tx: int,
    ty: int,
    text: str,
    timestamp: float,
) -> None:
    """Upsert a single chain_message row to Supabase.

    Called immediately after a message is stored in-memory so it appears
    in the frontend without waiting for the next block mine.
    All exceptions are swallowed — messaging never crashes due to Supabase errors.
    """
    try:
        client = _get_client()
        client.table("chain_messages").upsert({
            "id": msg_id,
            "sender_chain_x": sx,
            "sender_chain_y": sy,
            "target_chain_x": tx,
            "target_chain_y": ty,
            "text": text,
            "timestamp": int(round(timestamp * 1000)),
        }).execute()
    except Exception:
        pass  # never crash the API


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _sync_chain_status(g: GenesisState, next_block_in: float) -> None:
    """Upsert the singleton chain_status row (id=1).

    Live schema uses ``synced_at`` (not ``updated_at``) and includes
    ``total_claims``.
    """
    client = _get_client()
    state_root = g.ledger_state.get_state_root().hex()
    claims = g.claim_registry.all_active_claims()

    ring = g.epoch_tracker.current_ring
    hardness = g.epoch_tracker.hardness(ring)

    row = {
        "id": 1,
        "blocks_processed": int(g.mining_engine.total_blocks_processed),
        "state_root": state_root,
        # CommunityPool was removed in Tokenomics v2 — send 0 for backwards compat.
        "community_pool_remaining": 0,
        "total_mined": round(float(g.mining_engine.total_rewards_distributed), 6),
        "total_claims": len(claims),
        "next_block_in": int(round(float(next_block_in))),
        "epoch_ring": ring,
        "hardness": float(hardness),
        "circulating_supply": round(float(g.mining_engine.total_rewards_distributed), 6),
        "burned_fees": int(g.fee_engine.total_burned),
        "synced_at": _iso_now(),
    }

    client.table("chain_status").upsert(row).execute()


def _sync_agents(g: GenesisState) -> None:
    """Upsert all active claims as rows in the agents table.

    Agent ID format mirrors /api/agents:
    - First 3 claims: ``agent-000``, ``agent-001``, ``agent-002``  (user Sonnet agents)
    - Remaining claims: ``slot-0003``, ``slot-0004``, ...          (unclaimed Haiku slots)

    Tier assignment:
    - First 3 claims → 'sonnet'
    - Rest           → 'haiku'

    is_primary: only the very first claim is True.
    """
    client = _get_client()
    claims = g.claim_registry.all_active_claims()

    if not claims:
        return

    rows = []
    for i, c in enumerate(claims):
        x, y = c.coordinate.x, c.coordinate.y
        coord_key = (x, y)
        density = resource_density(x, y)
        slots = storage_slots(x, y)

        # Tier assignment mirrors the genesis topology:
        #   origin (0,0)        → 'sonnet'  — system anchor
        #   Faction Masters     → 'opus'    — highest-tier homenodes (cardinal ring)
        #   remaining genesis   → 'sonnet'  — regular homenodes (diagonal ring)
        #   all user claims     → 'haiku'   — user-deployed agents
        if coord_key in _FACTION_MASTER_COORDS:
            tier = "opus"
            border_radius = 90
        elif coord_key in _ORIGIN_COORD:
            tier = "sonnet"
            border_radius = 90
        elif coord_key in _GENESIS_HOMENODE_COORDS:
            tier = "sonnet"
            border_radius = 60
        else:
            tier = "haiku"
            border_radius = 30

        agent_id = f"agent-{i:03d}" if tier in ("opus", "sonnet") else f"slot-{i:04d}"
        is_primary = coord_key in _ORIGIN_COORD
        mining_rate = round(density * 5.0, 6) if tier != "haiku" else 0.0

        # Retrieve intro message if one was set
        intro_msg = g.intro_messages.get((x, y))

        visual_x, visual_y = chain_to_visual(x, y)

        row = {
            "id": agent_id,
            "user_id": None,          # no user_id in chain state (auth-only concern)
            "chain_x": x,
            "chain_y": y,
            "visual_x": visual_x,
            "visual_y": visual_y,
            "tier": tier,
            "is_primary": is_primary,
            "username": None,
            "bio": None,
            "intro_message": intro_msg,
            "density": round(float(density), 6),
            "storage_slots": slots,
            "stake": c.stake_amount,
            "border_radius": border_radius,
            "mining_rate": round(float(mining_rate), 6),
            # cpu_per_turn and staked_cpu are NUMERIC in Postgres — pass as int
            # to avoid "invalid input syntax for type integer" from postgrest.
            # Option A: staked_cpu = validator.cpu_vpu for this claim's validator.
            # TODO(Option B): switch to subgrid_allocator.count(SECURE) × BASE_SECURE_RATE
            #   once subgrid allocation is actively used by players.
            "cpu_per_turn": 1,
            "staked_cpu": int(g.validators[i].cpu_vpu) if i < len(g.validators) else 0,
            "parent_agent_id": None,
            "synced_at": _iso_now(),
        }
        rows.append(row)

    client.table("agents").upsert(rows).execute()


def _sync_subgrid_allocations(g: GenesisState) -> None:
    """Upsert per-wallet subgrid cell counts to the subgrid_allocations table."""
    client = _get_client()
    from agentic.lattice.subgrid import SubcellType

    rows = []
    for i, wallet in enumerate(g.wallets):
        alloc = g.subgrid_allocators.get(wallet.public_key)
        if alloc is None:
            continue
        rows.append({
            "wallet_index": i,
            "secure_cells": alloc.count(SubcellType.SECURE),
            "develop_cells": alloc.count(SubcellType.DEVELOP),
            "research_cells": alloc.count(SubcellType.RESEARCH),
            "storage_cells": alloc.count(SubcellType.STORAGE),
            "synced_at": _iso_now(),
        })

    if rows:
        client.table("subgrid_allocations").upsert(rows).execute()


def _sync_resource_rewards(g: GenesisState) -> None:
    """Upsert per-wallet cumulative resource yields to the resource_rewards table."""
    client = _get_client()
    claims = g.claim_registry.all_active_claims()
    if not claims:
        return

    owner_to_index: dict[str, int] = {}
    for i, w in enumerate(g.wallets):
        owner_to_index[w.public_key] = i

    # Build owner → claim count for secured_chains (same proxy as /api/rewards)
    owner_claim_count: dict[str, int] = {}
    for c in claims:
        owner_claim_count[c.owner] = owner_claim_count.get(c.owner, 0) + 1

    rows = []
    seen_owners: set[str] = set()
    for c in claims:
        if c.owner in seen_owners:
            continue
        seen_owners.add(c.owner)
        idx = owner_to_index.get(c.owner)
        if idx is None:
            continue
        totals = g.resource_totals.get(c.owner, {})
        rows.append({
            "wallet_index": idx,
            # Per-wallet AGNTC tracking not yet implemented — 0.0 matches /api/rewards
            "agntc_earned": 0.0,
            "dev_points": round(float(totals.get("dev_points", 0.0)), 4),
            "research_points": round(float(totals.get("research_points", 0.0)), 4),
            "storage_size": round(float(totals.get("storage_units", 0.0)), 4),
            "secured_chains": owner_claim_count.get(c.owner, 0),
            "synced_at": _iso_now(),
        })

    if rows:
        client.table("resource_rewards").upsert(rows).execute()


def _iso_now() -> str:
    """Return current UTC time as an ISO-8601 string."""
    import datetime
    return datetime.datetime.utcnow().isoformat() + "Z"
