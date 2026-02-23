"""Supabase sync module for Agentic Chain testnet.

Pushes chain state to Supabase after each block is mined so that the
frontend can receive real-time updates via Supabase Realtime subscriptions
(postgres_changes on chain_status and agents tables).

Usage:
    from agentic.testnet.supabase_sync import sync_to_supabase
    sync_to_supabase(g, next_block_in=60.0)

This is fire-and-forget: all errors are caught internally so the blockchain
never crashes due to a Supabase connectivity issue.

TODO: move SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to environment variables.
"""
from __future__ import annotations

import time
from typing import Optional

from supabase import create_client, Client

from agentic.galaxy.coordinate import resource_density, storage_slots
from agentic.params import GENESIS_FACTION_MASTERS, GENESIS_ORIGIN
from agentic.testnet.genesis import GenesisState

# Sets for fast O(1) lookup during sync
_ORIGIN_COORD: frozenset[tuple[int, int]] = frozenset([GENESIS_ORIGIN])
_FACTION_MASTER_COORDS: frozenset[tuple[int, int]] = frozenset(GENESIS_FACTION_MASTERS)

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

# TODO: load from environment variables (os.environ) instead of hardcoding.
_SUPABASE_URL = "https://inqwwaqiptrmpxruyczy.supabase.co"
_SUPABASE_SERVICE_ROLE_KEY = (
    "***REDACTED_JWT_HEADER***"
    ".***REDACTED***"
    ".***REDACTED***"
)

_client: Optional[Client] = None


def _get_client() -> Client:
    """Return (and lazily initialize) the Supabase service-role client."""
    global _client
    if _client is None:
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

    row = {
        "id": 1,
        "blocks_processed": int(g.mining_engine.total_blocks_processed),
        "state_root": state_root,
        # Live schema stores these as INTEGER — cast to int to avoid postgrest
        # rejecting floats with "invalid input syntax for type integer".
        "community_pool_remaining": int(g.community_pool.remaining),
        "total_mined": int(g.mining_engine.total_rewards_distributed),
        "total_claims": len(claims),
        "next_block_in": int(round(float(next_block_in))),
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
        else:
            tier = "sonnet"
            border_radius = 60

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
            "cpu_per_turn": 1,
            "staked_cpu": 0,
            "parent_agent_id": None,
            "synced_at": _iso_now(),
        }
        rows.append(row)

    client.table("agents").upsert(rows).execute()


def _iso_now() -> str:
    """Return current UTC time as an ISO-8601 string."""
    import datetime
    return datetime.datetime.utcnow().isoformat() + "Z"
