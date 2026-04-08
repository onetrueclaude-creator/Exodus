"""FastAPI JSON API for the Agentic Chain testnet.

Exposes testnet state for the frontend dashboard.

Run with:
    uvicorn agentic.testnet.api:app --port 8080 --reload
"""
from __future__ import annotations

import asyncio
import json as _json
import os as _os
import time
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------


class ConnectionManager:
    """Manages active WebSocket connections for broadcasting chain events."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> bool:
        """Accept a WebSocket connection. Returns False if the cap is reached."""
        if len(self._connections) >= 50:
            await ws.close(code=1013, reason="Max connections reached")
            return False
        await ws.accept()
        self._connections.append(ws)
        return True

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)

    async def broadcast(self, event: str, data: dict) -> None:
        """Send event to all connected clients. Silently drops failed connections."""
        msg = _json.dumps({"event": event, "data": data})
        stale: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_text(msg)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)


_ws_manager = ConnectionManager()

import random as _random

from agentic.consensus.block import Block, BlockStatus
from agentic.consensus.validator import Validator
from agentic.lattice.allocator import CoordinateAllocator
from agentic.lattice.claims import claim_cost
from agentic.lattice.coordinate import GridCoordinate, resource_density, storage_slots
from agentic.ledger.transaction import BirthTx, validate_birth
from agentic.params import (
    ALPHA, BASE_BIRTH_COST, BASE_CPU_PER_SECURE_BLOCK, BETA, BLOCK_TIME_MS,
    CANONICAL_CLAUDE_HASH, NODE_GRID_SPACING, SECURE_REWARD_IMMEDIATE,
)
from agentic.testnet.genesis import GenesisState, create_genesis
from agentic.testnet.node_session import (
    verify_hash,
    register_session,
    get_session,
    clear_sessions,
)
from agentic.verification.agent import VerificationAgent, AgentState
from agentic.verification.dispute import DisputeOutcome

def _grid_bounds(g) -> tuple[int, int]:
    """Dynamic grid bounds derived from current epoch ring."""
    ring = g.epoch_tracker.current_ring
    radius = (ring + 1) * NODE_GRID_SPACING
    return -radius, radius


# Block timing — fixed interval (epoch hardness replaces old dynamic difficulty)
_BLOCK_TIME_S: float = BLOCK_TIME_MS / 1000.0  # 60s fixed block time
_last_block_time: float = 0.0  # epoch timestamp of last mined block; 0 = never mined
_auto_mine: bool = True  # auto-mining ON — blocks mine automatically at fixed block time


def _snap_to_grid(v: int) -> int:
    """Snap a coordinate to the nearest NODE_GRID_SPACING multiple.

    Ensures homenodes always land on a valid 10×10 block square centre so the
    visual grid stays ordered.  Examples (spacing=10): 7→10, 14→10, 15→20.
    """
    return round(v / NODE_GRID_SPACING) * NODE_GRID_SPACING


def _next_block_in() -> float:
    """Seconds until the next block can be mined.

    Returns -1.0 when no block has ever been mined (chain is idle at genesis).
    Block time is a fixed constant; epoch hardness handles difficulty scaling.
    """
    if _last_block_time == 0.0:
        return 0.0  # no block mined yet — first block can be mined immediately
    elapsed = max(0.0, time.time() - _last_block_time)
    return round(max(0.0, _BLOCK_TIME_S - elapsed), 1)

# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------


class TestnetStatus(BaseModel):
    state_root: str
    record_count: int
    total_claims: int
    blocks_processed: int
    total_mined: float
    next_block_in: float      # seconds until next block can be mined (-1 = chain idle)
    current_block_time: float  # current required interval between blocks (Proof of Energy)
    # Epoch system fields
    epoch_ring: int = 1
    epoch_total_mined: float = 0.0
    epoch_next_threshold: float = 24.0
    epoch_progress: float = 0.0
    epoch_agntc_remaining: float = 24.0
    # Economics fields (v2)
    hardness: float = 16.0
    circulating_supply: float = 0.0
    burned_fees: int = 0


class EpochStatus(BaseModel):
    current_ring: int
    total_mined: float
    next_threshold: float
    progress: float
    agntc_remaining: float
    homenode_coordinates: dict


class CoordinateInfo(BaseModel):
    x: int
    y: int
    density: float
    storage_slots: int
    claimed: bool
    owner: Optional[str] = None
    stake: Optional[int] = None


class ClaimInfo(BaseModel):
    x: int
    y: int
    owner: str
    stake: int
    density: float
    storage_slots: int


class GridCell(BaseModel):
    x: int
    y: int
    density: float
    claimed: bool
    owner: Optional[str] = None


class GridRegion(BaseModel):
    x_min: int
    x_max: int
    y_min: int
    y_max: int
    cells: List[GridCell]


class MineResult(BaseModel):
    block_number: int
    yields: Dict[str, float]
    block_time: float
    next_block_at: float
    verification_outcome: str
    verifiers_assigned: int
    valid_proofs: int


class AgentInfo(BaseModel):
    id: str
    owner: str
    x: int
    y: int
    tier: str  # 'sonnet' for user agents, 'haiku' for unclaimed slots
    is_user_agent: bool
    stake: int
    density: float
    storage_slots: int
    mining_rate: float
    border_radius: int
    staked_cpu: int = 0  # CPU staked by this agent (matches Supabase agents table shape)


class ResetResult(BaseModel):
    state_root: str
    record_count: int
    total_claims: int
    message: str


class BirthRequest(BaseModel):
    wallet_index: int


class BirthResult(BaseModel):
    coordinate: dict
    ring: int
    birth_cost: int
    records_created: int
    new_claim_count: int


class ClaimNodeRequest(BaseModel):
    wallet_index: int
    x: Optional[int] = None
    y: Optional[int] = None
    stake: int = 200


class ClaimNodeResult(BaseModel):
    coordinate: dict
    stake: int
    density: float
    storage_slots: int
    validator_id: int
    message: str


class IntroRequest(BaseModel):
    wallet_index: int
    agent_coordinate: dict  # {x: int, y: int}
    message: str


class IntroResult(BaseModel):
    status: str
    message: str


class MessageRequest(BaseModel):
    sender_wallet: int
    sender_coord: dict  # {x: int, y: int}
    target_coord: dict  # {x: int, y: int}
    text: str


class MessageResult(BaseModel):
    id: str
    timestamp: float
    text: str
    sender_coord: dict
    target_coord: dict


class MessageInfo(BaseModel):
    id: str
    sender_coord: dict
    text: str
    timestamp: float


class NodeInfo(BaseModel):
    """A neural node on the grid — deterministic from chain coordinate functions."""
    id: str
    x: int
    y: int
    name: str
    density: float
    storage_slots: int
    claimed: bool
    owner: Optional[str] = None
    stake: Optional[int] = None


class SubgridAllocationInfo(BaseModel):
    secure_count: int = 0
    develop_count: int = 0
    research_count: int = 0
    storage_count: int = 0
    secure_level: int = 1
    develop_level: int = 1
    research_level: int = 1
    storage_level: int = 1
    free_cells: int = 64


class SubgridAssignRequest(BaseModel):
    secure: int = 0
    develop: int = 0
    research: int = 0
    storage: int = 0


class RewardsResponse(BaseModel):
    wallet_index: int
    agntc_earned: float
    dev_points: float
    research_points: float
    storage_units: float
    secured_chains: int


class VestingResponse(BaseModel):
    faction: str
    total_allocation: int
    vested: int
    locked: int
    next_unlock_month: int
    immediate_pct: float
    vest_days: int


class StakingResponse(BaseModel):
    wallet_index: int
    token_staked: float
    cpu_staked: float
    effective_stake: float
    positions: List[Dict]
    status: str


class SafeModeResponse(BaseModel):
    is_active: bool
    online_ratio: float
    threshold: float
    recovery_target: float


class ResourceState(BaseModel):
    agntc_per_block: float
    dev_points_per_block: float
    research_points_per_block: float
    storage_per_block: float
    total_dev_points: float
    total_research_points: float
    total_storage_units: float
    subgrid: SubgridAllocationInfo


class NodeRegisterRequest(BaseModel):
    wallet_index: int
    claude_hash: str
    coordinates: list


class NodeRegisterResponse(BaseModel):
    status: str
    session_id: str
    expires_at: str


class NodeVerifyRequest(BaseModel):
    claude_hash: str


class NodeVerifyResponse(BaseModel):
    valid: bool
    canonical_hash: str


class NodeSessionResponse(BaseModel):
    active: bool
    session_id: Optional[str] = None
    registered_at: Optional[str] = None
    expires_at: Optional[str] = None
    claude_hash: Optional[str] = None


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

_ENVIRONMENT = _os.environ.get("ENVIRONMENT", "development")
_ALLOWED_ORIGINS = [
    o.strip()
    for o in _os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,https://zkagentic.ai,https://www.zkagentic.ai,https://zkagenticnetwork.com,https://www.zkagenticnetwork.com",
    ).split(",")
    if o.strip()
]
_ADMIN_TOKEN = _os.environ.get("ADMIN_TOKEN", "")

# Conditionally disable /docs and /redoc in production
_docs_url: str | None = "/docs" if _ENVIRONMENT != "production" else None
_redoc_url: str | None = "/redoc" if _ENVIRONMENT != "production" else None

app = FastAPI(
    title="Agentic Chain Testnet API",
    version="0.1.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

# Rate limiter (keyed by remote IP address)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _require_admin(request: Request) -> None:
    """Gate admin-only endpoints behind the ADMIN_TOKEN env var."""
    if not _ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin endpoints disabled")
    token = request.headers.get("X-Admin-Token", "")
    if token != _ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")


# Global genesis state — populated at startup.
_genesis: Optional[GenesisState] = None
_allocator: Optional[CoordinateAllocator] = None
_machine_behavior = None  # MachineAgentBehavior instance
_startup_time: float = 0.0

# SQLite persistence — path configurable via DB_PATH env var.
# Local default: <repo-root>/testnet_state.db
# Railway production: set DB_PATH=/app/data/testnet_state.db (backed by a Volume mount)
from pathlib import Path as _Path
_DB_PATH: _Path = _Path(
    _os.environ.get("DB_PATH", str(_Path(__file__).resolve().parent.parent.parent / "testnet_state.db"))
)


@app.on_event("startup")
def _init_genesis() -> None:
    global _genesis, _allocator, _machine_behavior, _startup_time, _last_block_time
    _startup_time = time.time()
    _genesis = create_genesis(num_wallets=50, num_claims=0, seed=42)
    _allocator = CoordinateAllocator()
    from agentic.testnet.machines import MachineAgentBehavior
    _machine_behavior = MachineAgentBehavior(state=_genesis)
    # Restore persisted state (no-op if DB doesn't exist or is empty)
    from agentic.testnet.persistence import init_db, load_state
    init_db(_DB_PATH)
    restored_lbt = load_state(_genesis, _DB_PATH)
    if restored_lbt > 0.0:
        _last_block_time = restored_lbt


@app.on_event("startup")
async def _start_auto_miner() -> None:
    """Launch background auto-mining loop."""
    asyncio.create_task(_auto_mine_loop())


async def _auto_mine_loop() -> None:
    """Mine a block at the fixed block time when there are active claims.

    Phase 2: polls pending_transactions from Supabase before each block,
    so write-through transactions are included in the next block.
    """
    global _last_block_time
    while True:
        await asyncio.sleep(_BLOCK_TIME_S)
        if not _auto_mine or _genesis is None:
            continue
        g = _genesis

        # Phase 2: process write-through transactions before mining
        try:
            from agentic.testnet.pending import process_pending_transactions
            process_pending_transactions(g, db_path=_DB_PATH)
        except Exception:
            pass  # never crash the miner

        claims = g.claim_registry.all_active_claims()
        if not claims:
            continue
        try:
            _do_mine(g)
        except Exception:
            pass  # auto-miner never crashes


def _do_mine(g: GenesisState) -> dict:
    """Core mining logic shared by auto-miner and /api/mine."""
    global _last_block_time
    old_ring = g.epoch_tracker.current_ring
    block_slot = g.mining_engine.total_blocks_processed + 1
    block = Block(slot=block_slot, leader_id=0, status=BlockStatus.ORDERED)
    state_root = g.ledger_state.get_state_root()

    vresult = g.verification_pipeline.verify_block(
        block=block, agents=g.agents, validators=g.validators, state_root=state_root)

    hex_yields: Dict[str, float] = {}
    if vresult.outcome == DisputeOutcome.FINALIZED:
        claims_input = g.claim_registry.as_mining_claims()
        # Fix 2: dual-staking — pass CPU stakes from securing positions
        cpu_stakes = {
            owner: g.securing_registry.get_cpu_for_owner(owner, block_slot)
            for owner in {c["owner"] for c in claims_input}
        }
        yields = g.mining_engine.compute_block_yields(
            claims_input, epoch_tracker=g.epoch_tracker,
            cpu_stakes=cpu_stakes if any(cpu_stakes.values()) else None,
        )
        if yields:
            g.mining_engine.mint_block_rewards(yields, g.ledger_state, g.viewing_keys)
        hex_yields = {k.hex(): round(v, 6) for k, v in yields.items()}

        # Collect and distribute fees for this block (T-004)
        # Testnet: estimate fees from verification proofs processed.
        # Production: sum actual tx fees from the block's transaction list.
        block_fees = [g.fee_engine.schedule.base_fee] * vresult.valid_proof_count
        if block_fees:
            fee_dist = g.fee_engine.collect_and_distribute(block_fees)

            # --- FIX 1: Wire fee distribution to wallets ---
            # Verifier rewards → verification committee (proportional to effective stake)
            if fee_dist.to_verifiers > 0 and g.validators:
                online_validators = [v for v in g.validators if v.online]
                if online_validators:
                    total_effective = sum(
                        ALPHA * v.token_stake + BETA * v.cpu_vpu
                        for v in online_validators
                    )
                    if total_effective > 0:
                        for v in online_validators:
                            v_eff = ALPHA * v.token_stake + BETA * v.cpu_vpu
                            v_share = fee_dist.to_verifiers * (v_eff / total_effective)
                            # Credit to the wallet that owns this validator
                            for claim in claims_input:
                                if claim.get("validator_id") == v.id:
                                    owner = claim["owner"]
                                    vk = g.viewing_keys.get(owner, owner)
                                    micro = round(v_share)
                                    if micro > 0:
                                        from agentic.ledger.transaction import MintTx, validate_mint
                                        validate_mint(MintTx(
                                            recipient=owner, recipient_viewing_key=vk,
                                            amount=micro, slot=block_slot,
                                        ), g.ledger_state)
                                    break

            # Staker/securer rewards → active securing positions (from fee pool)
            fee_for_stakers_agntc = 0.0
            if block_fees:
                # Convert microAGNTC fee to AGNTC float for securing distribution
                fee_for_stakers_agntc = fee_dist.to_stakers / 1_000_000.0

            # --- FIX 3: Process active securing positions ---
            securing_rewards = g.securing_registry.process_block(
                current_block=block_slot,
                fee_pool_for_stakers=fee_for_stakers_agntc,
                hardness=g.epoch_tracker.hardness(g.epoch_tracker.current_ring),
            )
            # Mint immediate securing rewards to ledger
            if securing_rewards:
                from agentic.ledger.transaction import MintTx, validate_mint
                from agentic.params import MINT_PROGRAM_ID
                for owner, amount in securing_rewards.items():
                    micro = round(amount * 1_000_000)
                    if micro > 0:
                        vk = g.viewing_keys.get(owner, owner)
                        validate_mint(MintTx(
                            recipient=owner, recipient_viewing_key=vk,
                            amount=micro, slot=block_slot,
                        ), g.ledger_state)

        # Distribute subgrid outputs for all allocators
        for owner, alloc in g.subgrid_allocators.items():
            claims_for_owner = [c for c in claims_input if c["owner"] == owner]
            if not claims_for_owner:
                continue
            density = resource_density(
                claims_for_owner[0]["coordinate"].x,
                claims_for_owner[0]["coordinate"].y,
            )
            epoch_h = g.epoch_tracker.hardness(g.epoch_tracker.current_ring)
            out = alloc.compute_output(density=density, epoch_hardness=epoch_h)
            if owner not in g.resource_totals:
                g.resource_totals[owner] = {
                    "dev_points": 0.0,
                    "research_points": 0.0,
                    "storage_units": 0.0,
                }
            g.resource_totals[owner]["dev_points"] += out.dev_points
            g.resource_totals[owner]["research_points"] += out.research_points
            g.resource_totals[owner]["storage_units"] += out.storage_units

    # --- Machine faction auto-expansion tick ---------------------------------
    if _machine_behavior is not None:
        # Find the machine wallet's reward from this block
        machine_wallet_key = g.wallets[_machine_behavior.wallet_index].public_key.hex()
        machine_reward = hex_yields.get(machine_wallet_key, 0.0)
        _machine_behavior.tick(g, block_reward=machine_reward)

    # Track epoch ring changes after mining
    new_ring = g.epoch_tracker.current_ring

    _last_block_time = time.time()

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_ws_manager.broadcast("block_mined", {
                "block_number": block_slot, "yields": hex_yields,
                "verification_outcome": vresult.outcome.value,
                "verifiers_assigned": vresult.assigned_count,
                "valid_proofs": vresult.valid_proof_count,
            }))
            # Broadcast epoch_advance event when ring changes
            if new_ring > old_ring:
                loop.create_task(_ws_manager.broadcast("epoch_advance", {
                    "old_ring": old_ring,
                    "new_ring": new_ring,
                }))
    except RuntimeError:
        pass

    # Push chain state to Supabase after each block so the frontend
    # receives real-time updates via postgres_changes subscriptions.
    try:
        from agentic.testnet.supabase_sync import sync_to_supabase
        sync_to_supabase(g, next_block_in=_next_block_in())
    except Exception:
        pass  # never crash the miner

    # Persist state to SQLite so restarts don't wipe genesis.
    try:
        from agentic.testnet.persistence import save_state
        save_state(g, _last_block_time, _DB_PATH)
    except Exception:
        pass  # never crash the miner

    return {"block_number": block_slot, "yields": hex_yields,
            "outcome": vresult.outcome.value,
            "assigned": vresult.assigned_count, "valid": vresult.valid_proof_count}


def _g() -> GenesisState:
    """Convenience accessor that raises if genesis hasn't been initialized."""
    if _genesis is None:
        raise RuntimeError("Genesis state not initialized")
    return _genesis


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
def health_check() -> dict:
    """Lightweight liveness probe — returns chain health at a glance."""
    g = _genesis
    if g is None:
        return {"status": "starting", "block_height": 0, "uptime_s": 0}
    blocks = g.mining_engine.total_blocks_processed
    last_age = round(time.time() - _last_block_time, 1) if _last_block_time > 0 else None
    uptime = round(time.time() - _startup_time, 1)
    # Stale if no block in 2x block time; offline if no block in 5x
    if last_age is not None and last_age > 5 * _BLOCK_TIME_S:
        status = "offline"
    elif last_age is not None and last_age > 2 * _BLOCK_TIME_S:
        status = "stale"
    else:
        status = "ok"
    return {
        "status": status,
        "block_height": blocks,
        "last_block_age_s": last_age,
        "auto_mine": _auto_mine,
        "uptime_s": uptime,
        "total_claims": len(g.claim_registry.all_active_claims()),
    }


@app.get("/api/status", response_model=TestnetStatus)
def get_status() -> TestnetStatus:
    g = _g()
    ring = g.epoch_tracker.current_ring
    hardness = g.epoch_tracker.hardness(ring)
    # Circulating supply = total rewards distributed (all AGNTC is mined, not pre-minted)
    circulating = g.mining_engine.total_rewards_distributed
    return TestnetStatus(
        state_root=g.ledger_state.get_state_root().hex(),
        record_count=g.ledger_state.record_count,
        total_claims=len(g.claim_registry.all_active_claims()),
        blocks_processed=g.mining_engine.total_blocks_processed,
        total_mined=g.mining_engine.total_rewards_distributed,
        next_block_in=_next_block_in(),
        current_block_time=_BLOCK_TIME_S,
        epoch_ring=ring,
        epoch_total_mined=g.epoch_tracker.total_mined,
        epoch_next_threshold=g.epoch_tracker.next_epoch_threshold(),
        epoch_progress=g.epoch_tracker.progress_to_next(),
        epoch_agntc_remaining=g.epoch_tracker.agntc_to_next_epoch(),
        hardness=hardness,
        circulating_supply=circulating,
        burned_fees=g.fee_engine.total_burned,
    )


@app.get("/api/epoch", response_model=EpochStatus)
def get_epoch_status() -> EpochStatus:
    """Return detailed epoch/ring expansion state."""
    g = _g()
    et = g.epoch_tracker
    factions = ["community", "machines", "founders", "professional"]
    homenodes = {
        f: [et.homenode_coordinate(f, r) for r in range(1, et.current_ring + 1)]
        for f in factions
    }
    return EpochStatus(
        current_ring=et.current_ring,
        total_mined=et.total_mined,
        next_threshold=et.next_epoch_threshold(),
        progress=et.progress_to_next(),
        agntc_remaining=et.agntc_to_next_epoch(),
        homenode_coordinates=homenodes,
    )


@app.get("/api/rewards/{wallet_index}", response_model=RewardsResponse)
def get_rewards(wallet_index: int) -> RewardsResponse:
    """Return cumulative rewards earned by a wallet."""
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")
    wallet = g.wallets[wallet_index]
    owner = wallet.public_key

    # AGNTC earned = total mining rewards distributed to this wallet's claims
    agntc_earned = 0.0
    claims = g.claim_registry.get_claims(owner)
    secured = len(claims)

    totals = g.resource_totals.get(owner, {
        "dev_points": 0.0, "research_points": 0.0, "storage_units": 0.0,
    })
    return RewardsResponse(
        wallet_index=wallet_index,
        agntc_earned=round(agntc_earned, 6),
        dev_points=totals.get("dev_points", 0.0),
        research_points=totals.get("research_points", 0.0),
        storage_units=totals.get("storage_units", 0.0),
        secured_chains=secured,
    )


@app.get("/api/vesting/{wallet_index}", response_model=VestingResponse)
def get_vesting(wallet_index: int) -> VestingResponse:
    """Return vesting info for a wallet based on its faction."""
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")

    from agentic.economics.vesting import create_default_schedules
    from agentic.params import SECURE_REWARD_IMMEDIATE, SECURE_REWARD_VEST_DAYS

    schedules = create_default_schedules()
    # Map wallet to faction: 0=origin, 1-4=faction masters (community/machines/founders/professional)
    # 5-8=regular homenodes, 9+=later claims
    factions = ["community", "machines", "founders", "professional"]
    if wallet_index == 0:
        faction_idx = 0  # origin → community
    elif wallet_index <= 4:
        faction_idx = wallet_index - 1
    elif wallet_index <= 8:
        faction_idx = wallet_index - 5
    else:
        faction_idx = wallet_index % 4

    schedule = schedules[faction_idx]
    faction = factions[faction_idx]

    # Current month approximation from blocks mined (1 block/min, ~43200 blocks/month)
    blocks = g.mining_engine.total_blocks_processed
    current_month = blocks // 43200

    vested = schedule.vested_at_month(current_month)
    locked = schedule.unvested_at_month(current_month)
    next_unlock = current_month + 1 if locked > 0 else current_month

    return VestingResponse(
        faction=faction,
        total_allocation=schedule.total_allocation,
        vested=vested,
        locked=locked,
        next_unlock_month=next_unlock,
        immediate_pct=SECURE_REWARD_IMMEDIATE * 100,
        vest_days=SECURE_REWARD_VEST_DAYS,
    )


@app.get("/api/staking/{wallet_index}", response_model=StakingResponse)
def get_staking(wallet_index: int) -> StakingResponse:
    """Return staking info for a wallet."""
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")

    from agentic.params import ALPHA, BETA

    wallet = g.wallets[wallet_index]
    positions = g.stake_registry.get_staker_positions(wallet.public_key)

    token_staked = sum(p.amount for p in positions if p.status.value in ("warmup", "active"))
    # CPU stake from validator VPU (if wallet owns a validator)
    cpu_staked = 0.0
    for i, v in enumerate(g.validators):
        if i == wallet_index and v.online:
            cpu_staked = v.cpu_vpu
            break

    effective = ALPHA * token_staked + BETA * cpu_staked

    pos_list = [
        {
            "validator_id": p.validator_id,
            "amount": p.amount,
            "status": p.status.value,
            "start_epoch": p.start_epoch,
        }
        for p in positions
    ]

    status = "active" if any(p.status.value == "active" for p in positions) else (
        "warmup" if positions else "none"
    )

    return StakingResponse(
        wallet_index=wallet_index,
        token_staked=float(token_staked),
        cpu_staked=cpu_staked,
        effective_stake=round(effective, 4),
        positions=pos_list,
        status=status,
    )


# ---------------------------------------------------------------------------
# Securing — active CPU Energy commitments to chain validation
# ---------------------------------------------------------------------------


class SecureRequest(BaseModel):
    wallet_index: int
    duration_blocks: int  # how many block cycles to secure


class SecureResponse(BaseModel):
    position_id: str
    cpu_cost: float
    duration_blocks: int
    start_block: int
    end_block: int
    density: float
    estimated_reward_per_block: float


class SecuringPositionInfo(BaseModel):
    id: str
    cpu_committed: float
    start_block: int
    end_block: int
    secured_blocks: int
    total_reward: float
    immediate_reward: float
    vesting_reward: float
    status: str
    density: float


class SecuringStatusResponse(BaseModel):
    wallet_index: int
    active_positions: list[SecuringPositionInfo]
    completed_positions: list[SecuringPositionInfo]
    total_secured_chains: int
    total_cpu_committed: float
    total_rewards_earned: float


@app.post("/api/secure", response_model=SecureResponse)
def create_secure(req: SecureRequest):
    """Create a new securing position — commit CPU Energy for N block cycles.

    Mining produces new AGNTC (block subsidy). Securing earns from
    transaction fees. Different economic functions, like Bitcoin.
    """
    g = _g()
    if req.wallet_index < 0 or req.wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")
    if req.duration_blocks < 1 or req.duration_blocks > 1000:
        raise HTTPException(status_code=400, detail="Duration must be 1-1000 blocks")

    wallet = g.wallets[req.wallet_index]
    # Find the wallet's homenode coordinates
    claims = g.claim_registry.get_claims_for_owner(wallet.public_key)
    if not claims:
        raise HTTPException(status_code=400, detail="No claimed node — claim a node first")

    # Use first claim's coordinate as the securing node
    claim = claims[0]
    node_x, node_y = claim.coordinate.x, claim.coordinate.y

    # Preview the CPU cost
    cpu_cost, density = g.securing_registry.compute_cpu_cost(
        req.duration_blocks, node_x, node_y,
    )

    # Check if wallet has enough CPU energy (using validator VPU as proxy)
    # In testnet, we don't enforce CPU limits — just record the commitment
    current_block = g.mining_engine.total_blocks_processed

    pos = g.securing_registry.create_position(
        wallet_index=req.wallet_index,
        owner=wallet.public_key,
        duration_blocks=req.duration_blocks,
        current_block=current_block,
        node_x=node_x,
        node_y=node_y,
    )

    # Estimate reward per block (based on current fee rate and no competition)
    est_reward = 0.0
    if g.fee_engine.total_collected > 0 and g.mining_engine.total_blocks_processed > 0:
        avg_fee_per_block = g.fee_engine.total_collected / g.mining_engine.total_blocks_processed
        staker_share = avg_fee_per_block * (1 - 0.50) * 0.40  # 50% burn, 40% of remainder
        est_reward = staker_share / 1_000_000.0  # convert micro to AGNTC

    return SecureResponse(
        position_id=pos.id,
        cpu_cost=round(cpu_cost, 2),
        duration_blocks=req.duration_blocks,
        start_block=pos.start_block,
        end_block=pos.end_block,
        density=round(density, 4),
        estimated_reward_per_block=round(est_reward, 6),
    )


@app.get("/api/secure/{wallet_index}", response_model=SecuringStatusResponse)
def get_securing_status(wallet_index: int):
    """Return all securing positions for a wallet."""
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")

    positions = g.securing_registry.get_positions(wallet_index)
    active = []
    completed = []
    for p in positions:
        info = SecuringPositionInfo(
            id=p.id,
            cpu_committed=round(p.cpu_committed, 2),
            start_block=p.start_block,
            end_block=p.end_block,
            secured_blocks=p.secured_blocks,
            total_reward=round(p.total_reward, 6),
            immediate_reward=round(p.immediate_reward, 6),
            vesting_reward=round(p.vesting_reward, 6),
            status=p.status.value,
            density=round(p.density, 4),
        )
        if p.status.value == "active":
            active.append(info)
        else:
            completed.append(info)

    return SecuringStatusResponse(
        wallet_index=wallet_index,
        active_positions=active,
        completed_positions=completed,
        total_secured_chains=g.securing_registry.get_secured_chains(wallet_index),
        total_cpu_committed=round(sum(p.cpu_committed for p in positions), 2),
        total_rewards_earned=round(sum(p.total_reward for p in positions), 6),
    )


@app.get("/api/safe-mode", response_model=SafeModeResponse)
def get_safe_mode() -> SafeModeResponse:
    """Return safe mode status of the verification pipeline."""
    g = _g()
    sm = g.verification_pipeline.safe_mode

    from agentic.params import SAFE_MODE_THRESHOLD, SAFE_MODE_RECOVERY

    # Calculate current online ratio from validators
    total = len(g.validators)
    online = sum(1 for v in g.validators if v.online)
    online_ratio = online / total if total > 0 else 1.0

    return SafeModeResponse(
        is_active=sm.active,
        online_ratio=round(online_ratio, 4),
        threshold=SAFE_MODE_THRESHOLD,
        recovery_target=SAFE_MODE_RECOVERY,
    )


@app.get("/api/resources/{wallet_index}", response_model=ResourceState)
def get_resources(wallet_index: int) -> ResourceState:
    """Return per-block resource output and subgrid allocation for a wallet."""
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")
    wallet = g.wallets[wallet_index]
    owner = wallet.public_key
    alloc = g.subgrid_allocators.get(owner)
    if alloc is None:
        return ResourceState(
            agntc_per_block=0, dev_points_per_block=0,
            research_points_per_block=0, storage_per_block=0,
            total_dev_points=0, total_research_points=0,
            total_storage_units=0, subgrid=SubgridAllocationInfo(),
        )

    claims = g.claim_registry.all_active_claims()
    density = 0.5
    for c in claims:
        if c.owner == owner:
            density = resource_density(c.coordinate.x, c.coordinate.y)
            break

    epoch_hardness = g.epoch_tracker.hardness(g.epoch_tracker.current_ring)
    from agentic.lattice.subgrid import SubcellType
    out = alloc.compute_output(density=density, epoch_hardness=epoch_hardness)

    totals = g.resource_totals.get(owner, {
        "dev_points": 0.0, "research_points": 0.0, "storage_units": 0.0,
    })
    return ResourceState(
        agntc_per_block=round(out.agntc, 6),
        dev_points_per_block=round(out.dev_points, 4),
        research_points_per_block=round(out.research_points, 4),
        storage_per_block=round(out.storage_units, 4),
        total_dev_points=totals.get("dev_points", 0.0),
        total_research_points=totals.get("research_points", 0.0),
        total_storage_units=totals.get("storage_units", 0.0),
        subgrid=SubgridAllocationInfo(
            secure_count=alloc.count(SubcellType.SECURE),
            develop_count=alloc.count(SubcellType.DEVELOP),
            research_count=alloc.count(SubcellType.RESEARCH),
            storage_count=alloc.count(SubcellType.STORAGE),
            secure_level=alloc.get_level(SubcellType.SECURE),
            develop_level=alloc.get_level(SubcellType.DEVELOP),
            research_level=alloc.get_level(SubcellType.RESEARCH),
            storage_level=alloc.get_level(SubcellType.STORAGE),
            free_cells=alloc.free_cells,
        ),
    )


@app.post("/api/resources/{wallet_index}/assign")
@limiter.limit("5/10seconds")
def assign_subgrid(request: Request, wallet_index: int, req: SubgridAssignRequest) -> dict:
    """Reassign subgrid cells across the 4 resource types."""
    _check_node_hash(request)
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")
    wallet = g.wallets[wallet_index]
    owner = wallet.public_key
    alloc = g.subgrid_allocators.get(owner)
    if alloc is None:
        raise HTTPException(status_code=404, detail="No subgrid for this wallet")
    from agentic.lattice.subgrid import SubcellType
    total_requested = req.secure + req.develop + req.research + req.storage
    if total_requested > 64:
        raise HTTPException(
            status_code=400,
            detail=f"Total cells {total_requested} exceeds 64",
        )
    # Reset all allocations, then assign new counts
    alloc.assign(SubcellType.SECURE, 0)
    alloc.assign(SubcellType.DEVELOP, 0)
    alloc.assign(SubcellType.RESEARCH, 0)
    alloc.assign(SubcellType.STORAGE, 0)
    alloc.assign(SubcellType.SECURE, req.secure)
    alloc.assign(SubcellType.DEVELOP, req.develop)
    alloc.assign(SubcellType.RESEARCH, req.research)
    alloc.assign(SubcellType.STORAGE, req.storage)
    return {"status": "ok", "free_cells": alloc.free_cells}


@app.get("/api/coordinate/{x}/{y}", response_model=CoordinateInfo)
def get_coordinate(x: int, y: int) -> CoordinateInfo:
    g = _g()
    grid_min, grid_max = _grid_bounds(g)
    if not (grid_min <= x <= grid_max) or not (grid_min <= y <= grid_max):
        raise HTTPException(
            status_code=400,
            detail=f"Coordinates out of range [{grid_min}, {grid_max}]",
        )
    coord = GridCoordinate(x=x, y=y)
    density = round(resource_density(x, y), 6)
    slots = storage_slots(x, y)
    claim = g.claim_registry.get_claim_at(coord)
    return CoordinateInfo(
        x=x,
        y=y,
        density=density,
        storage_slots=slots,
        claimed=claim is not None,
        owner=claim.owner.hex() if claim else None,
        stake=claim.stake_amount if claim else None,
    )


@app.get("/api/claims", response_model=List[ClaimInfo])
def get_claims() -> List[ClaimInfo]:
    g = _g()
    result: List[ClaimInfo] = []
    for c in g.claim_registry.all_active_claims():
        x, y = c.coordinate.x, c.coordinate.y
        result.append(
            ClaimInfo(
                x=x,
                y=y,
                owner=c.owner.hex(),
                stake=c.stake_amount,
                density=round(resource_density(x, y), 6),
                storage_slots=storage_slots(x, y),
            )
        )
    return result


@app.get("/api/grid/region", response_model=GridRegion)
def get_grid_region(
    x_min: int = Query(...),
    x_max: int = Query(...),
    y_min: int = Query(...),
    y_max: int = Query(...),
) -> GridRegion:
    # Clamp to grid bounds
    grid_min, grid_max = _grid_bounds(_g())
    x_min = max(x_min, grid_min)
    x_max = min(x_max, grid_max)
    y_min = max(y_min, grid_min)
    y_max = min(y_max, grid_max)

    width = x_max - x_min + 1
    height = y_max - y_min + 1
    if width * height > 10_000:
        raise HTTPException(
            status_code=400,
            detail=f"Region too large: {width}x{height} = {width * height} cells (max 10000)",
        )

    g = _g()
    cells: List[GridCell] = []
    for cx in range(x_min, x_max + 1):
        for cy in range(y_min, y_max + 1):
            coord = GridCoordinate(x=cx, y=cy)
            claim = g.claim_registry.get_claim_at(coord)
            cells.append(
                GridCell(
                    x=cx,
                    y=cy,
                    density=round(resource_density(cx, cy), 4),
                    claimed=claim is not None,
                    owner=claim.owner.hex()[:16] if claim else None,
                )
            )
    return GridRegion(x_min=x_min, x_max=x_max, y_min=y_min, y_max=y_max, cells=cells)


@app.post("/api/mine", response_model=MineResult)
@limiter.limit("5/10seconds")
def mine_block(request: Request) -> MineResult:
    """Mine one block manually (rate-limited). Auto-miner handles this normally."""
    global _last_block_time
    now = time.time()
    elapsed = now - _last_block_time
    if _last_block_time > 0 and elapsed < _BLOCK_TIME_S:
        remaining = _BLOCK_TIME_S - elapsed
        raise HTTPException(
            status_code=429,
            detail=f"Block too early. {remaining:.1f}s remaining (block time: {_BLOCK_TIME_S:.0f}s)")
    g = _g()
    result = _do_mine(g)
    return MineResult(
        block_number=result["block_number"], yields=result["yields"],
        block_time=round(now, 3), next_block_at=round(now + _BLOCK_TIME_S, 3),
        verification_outcome=result["outcome"],
        verifiers_assigned=result["assigned"], valid_proofs=result["valid"])


@app.post("/api/automine")
async def toggle_automine(request: Request, enabled: bool = True) -> dict:
    """Toggle automatic block mining. When enabled, blocks are mined at the
    fixed block time interval. Epoch hardness handles difficulty scaling."""
    _require_admin(request)
    global _auto_mine
    _auto_mine = enabled
    return {"auto_mine": _auto_mine, "current_block_time": _BLOCK_TIME_S}


@app.post("/api/claim", response_model=ClaimNodeResult)
@limiter.limit("5/10seconds")
def claim_node(request: Request, req: ClaimNodeRequest) -> ClaimNodeResult:
    """Create an agent that claims and colonizes a grid node.

    Lightweight — no Record creation. The agent plugs into an existing
    grid coordinate, claims it, and begins colonizing. Creates a validator
    + verification agent so it participates in PoAIV consensus and earns
    mining rewards automatically.
    """
    _check_node_hash(request)
    g = _g()
    if req.wallet_index < 0 or req.wallet_index >= len(g.wallets):
        raise HTTPException(status_code=400, detail=f"Invalid wallet index: {req.wallet_index}")

    wallet = g.wallets[req.wallet_index]

    # Determine coordinate — snap to nearest grid square centre
    if req.x is not None and req.y is not None:
        x, y = _snap_to_grid(req.x), _snap_to_grid(req.y)
        grid_min, grid_max = _grid_bounds(g)
        if not (grid_min <= x <= grid_max and grid_min <= y <= grid_max):
            raise HTTPException(status_code=400, detail=f"Coordinate ({x},{y}) out of grid bounds")
        coord = GridCoordinate(x=x, y=y)
        if g.claim_registry.get_claim_at(coord) is not None:
            raise HTTPException(status_code=409, detail=f"Coordinate ({x},{y}) already claimed")
    else:
        # Auto-assign: pick a random unclaimed coordinate
        rng = _random.Random(time.time_ns())
        grid_min, grid_max = _grid_bounds(g)
        for _ in range(1000):
            x = rng.randint(grid_min, grid_max)
            y = rng.randint(grid_min, grid_max)
            coord = GridCoordinate(x=x, y=y)
            if g.claim_registry.get_claim_at(coord) is None:
                break
        else:
            raise HTTPException(status_code=503, detail="No unclaimed coordinates available")

    # Ring-gating (G-002): reject claims beyond the currently revealed ring
    current_ring = g.epoch_tracker.current_ring
    coord_ring = max(abs(coord.x), abs(coord.y)) // NODE_GRID_SPACING
    if coord_ring > current_ring:
        raise HTTPException(
            status_code=403,
            detail=f"Coordinate ({coord.x},{coord.y}) is in ring {coord_ring}, "
                   f"but only ring {current_ring} is currently open",
        )

    # BME claim cost (T-002): charge AGNTC + CPU per whitepaper city model
    density = resource_density(coord.x, coord.y)
    agntc_cost, cpu_cost = claim_cost(current_ring, density)
    # NOTE: In testnet, we log the cost but don't block — wallets don't hold
    # real balances yet.  The cost is recorded for auditing/display purposes.
    # Phase 2 will wire balance deduction + BME burn/redistribute.

    # Register claim (lightweight — no Record creation)
    stake = max(1, req.stake)
    slot = g.mining_engine.total_blocks_processed
    g.claim_registry.register(owner=wallet.public_key, coordinate=coord, stake=stake, slot=slot)

    # Create validator + verification agent for this claim
    vid = len(g.validators)
    rng_vpu = _random.Random(vid + 7)
    v = Validator(id=vid, token_stake=float(stake), cpu_vpu=float(rng_vpu.randint(20, 120)), online=True)
    g.validators.append(v)
    agent = VerificationAgent(
        agent_id=f"verifier-{vid:03d}", validator_id=vid,
        vpu_capacity=v.cpu_vpu, registered_epoch=0, state=AgentState.ACTIVE)
    g.agents.append(agent)

    # Store viewing key for reward minting
    g.viewing_keys[wallet.public_key] = wallet.viewing_key

    density = resource_density(x, y)
    slots = storage_slots(x, y)

    # Broadcast
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_ws_manager.broadcast("agent_created", {
                "x": x, "y": y, "owner": wallet.public_key.hex(),
                "stake": stake, "density": round(density, 4)}))
    except RuntimeError:
        pass

    # Sync agents to Supabase immediately so the frontend sees the new agent.
    try:
        from agentic.testnet.supabase_sync import sync_to_supabase
        sync_to_supabase(g, next_block_in=_next_block_in())
    except Exception:
        pass  # never crash the claim endpoint

    return ClaimNodeResult(
        coordinate={"x": x, "y": y}, stake=stake,
        density=round(density, 6), storage_slots=slots,
        validator_id=vid,
        message=f"Agent created at ({x},{y}). Cost: {agntc_cost:.2f} AGNTC + {cpu_cost:.2f} CPU. "
                f"Validator #{vid} active. Auto-mining enabled.")


@app.get("/api/agents", response_model=List[AgentInfo])
def get_agents(user_count: int = Query(default=3, ge=1, le=50)) -> List[AgentInfo]:
    """Return claims mapped to frontend Agent format.

    First `user_count` claims become user-owned Sonnet agents.
    Remaining claims become unclaimed Haiku slots.
    """
    g = _g()
    claims = g.claim_registry.all_active_claims()
    agents: List[AgentInfo] = []
    for i, c in enumerate(claims):
        x, y = c.coordinate.x, c.coordinate.y
        density = resource_density(x, y)
        is_user = i < user_count
        # Option A: staked_cpu = validator.cpu_vpu for this claim's validator.
        # TODO(Option B): switch to subgrid_allocator.count(SECURE) × BASE_SECURE_RATE
        #   once subgrid allocation is actively used by players.
        staked_cpu = int(g.validators[i].cpu_vpu) if i < len(g.validators) else 0
        agents.append(AgentInfo(
            id=f"agent-{i:03d}" if is_user else f"slot-{i:04d}",
            owner=c.owner.hex(),
            x=x,
            y=y,
            tier="sonnet" if is_user else "haiku",
            is_user_agent=is_user,
            stake=c.stake_amount,
            density=round(density, 6),
            storage_slots=storage_slots(x, y),
            mining_rate=round(density * 5.0, 4) if is_user else 0.0,
            border_radius=90 if is_user else 30,
            staked_cpu=staked_cpu,
        ))
    return agents


@app.get("/api/nodes", response_model=List[NodeInfo])
def get_nodes(
    count: int = Query(default=1000, ge=10, le=5000),
    seed: int = Query(default=42),
) -> List[NodeInfo]:
    """Return deterministic neural nodes sampled from the chain's coordinate grid.

    Each node's density and storage_slots are computed from the chain's
    resource_density() and storage_slots() functions — the same functions
    used by mining, claiming, and genesis.

    Nodes that are already claimed are returned with owner and stake data.
    """
    import random as _random
    g = _g()

    # Build claimed coordinate lookup
    claimed_map: Dict[tuple, object] = {}
    for c in g.claim_registry.all_active_claims():
        claimed_map[(c.coordinate.x, c.coordinate.y)] = c

    # Deterministic sampling from the chain grid
    rng = _random.Random(seed)
    coords_seen: set[tuple[int, int]] = set()
    nodes: List[NodeInfo] = []
    attempts = 0
    max_attempts = count * 3

    grid_min, grid_max = _grid_bounds(g)
    while len(nodes) < count and attempts < max_attempts:
        attempts += 1
        x = rng.randint(grid_min, grid_max)
        y = rng.randint(grid_min, grid_max)
        if (x, y) in coords_seen:
            continue
        coords_seen.add((x, y))

        d = resource_density(x, y)
        s = storage_slots(x, y)
        claim = claimed_map.get((x, y))

        nodes.append(NodeInfo(
            id=f"node-{len(nodes):04d}",
            x=x,
            y=y,
            name=f"Node-{len(nodes):04d}",
            density=round(d, 6),
            storage_slots=s,
            claimed=claim is not None,
            owner=claim.owner.hex() if claim else None,
            stake=claim.stake_amount if claim else None,
        ))

    return nodes


@app.post("/api/birth", response_model=BirthResult)
@limiter.limit("5/10seconds")
def birth_node(request: Request, req: BirthRequest) -> BirthResult:
    """Birth a new node by spending AGNTC."""
    _check_node_hash(request)
    g = _g()
    if req.wallet_index < 0 or req.wallet_index >= len(g.wallets):
        raise HTTPException(status_code=400, detail=f"Invalid wallet index: {req.wallet_index}")

    wallet = g.wallets[req.wallet_index]

    # Find wallet's home star (first claim owned by this wallet)
    claims = g.claim_registry.get_claims(wallet.public_key)
    if not claims:
        raise HTTPException(status_code=400, detail="Wallet has no home star (no claims)")
    home = claims[0].coordinate

    # Discover unspent records for this wallet
    unspent = wallet._discover_records_with_positions(g.ledger_state)
    if not unspent:
        raise HTTPException(status_code=400, detail="No unspent records (zero balance)")

    # Peek at allocator to know cost
    coord_preview, ring_preview = _allocator.next_coordinate(home, g.claim_registry)
    needed = BASE_BIRTH_COST * ring_preview

    # Greedy coin selection
    input_records = []
    total = 0
    for record, pos in unspent:
        input_records.append((record, pos))
        total += record.value
        if total >= needed:
            break

    if total < needed:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance: have={total}, need={needed} (ring {ring_preview})",
        )

    tx = BirthTx(
        staker=wallet.public_key,
        staker_viewing_key=wallet.viewing_key,
        input_commitments=[r.commitment() for r, _ in input_records],
        input_nullifiers=[r.nullifier(wallet.spending_key) for r, _ in input_records],
        input_positions=[pos for _, pos in input_records],
        home_star=home,
        slot=g.mining_engine.total_blocks_processed,
    )

    result = validate_birth(tx, g.ledger_state, g.claim_registry, _allocator)
    if not result.valid:
        raise HTTPException(status_code=400, detail=result.error)

    # Track output tags so wallet can discover new records
    for i in range(g.ledger_state.record_count):
        r = g.ledger_state.get_record(i)
        if r.tag not in wallet._known_tags and r.owner == wallet.public_key:
            wallet._known_tags.append(r.tag)

    new_claims = g.claim_registry.get_claims(wallet.public_key)
    newest = new_claims[-1]

    # Broadcast to WebSocket clients
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_ws_manager.broadcast("agent_born", {
                "x": newest.coordinate.x,
                "y": newest.coordinate.y,
                "owner": wallet.public_key.hex(),
                "ring": ring_preview,
                "birth_cost": needed,
            }))
    except RuntimeError:
        pass

    return BirthResult(
        coordinate={"x": newest.coordinate.x, "y": newest.coordinate.y},
        ring=ring_preview,
        birth_cost=needed,
        records_created=result.records_created,
        new_claim_count=len(new_claims),
    )


# ---------------------------------------------------------------------------
# Transact — AGNTC wallet-to-wallet transfer
# ---------------------------------------------------------------------------


class TransactRequest(BaseModel):
    sender_wallet: int
    recipient_wallet: int
    amount: float  # AGNTC (float, converted to microAGNTC internally)


class TransactResponse(BaseModel):
    success: bool
    sender_wallet: int
    recipient_wallet: int
    amount: float
    fee: float
    records_created: int
    nullifiers_published: int
    message: str


@app.post("/api/transact", response_model=TransactResponse)
@limiter.limit("10/10seconds")
def transact(request: Request, req: TransactRequest) -> TransactResponse:
    """Transfer AGNTC between wallets. Fee = FeeSchedule.transfer_fee (50% burned).

    Like Bitcoin: transfers cost fees, fees fund the network.
    """
    g = _g()
    if req.sender_wallet < 0 or req.sender_wallet >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Sender wallet not found")
    if req.recipient_wallet < 0 or req.recipient_wallet >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Recipient wallet not found")
    if req.sender_wallet == req.recipient_wallet:
        raise HTTPException(status_code=400, detail="Cannot transfer to self")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    sender = g.wallets[req.sender_wallet]
    recipient = g.wallets[req.recipient_wallet]

    micro_amount = round(req.amount * 1_000_000)
    if micro_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount too small")

    # Discover sender's unspent records
    unspent = sender._discover_records_with_positions(g.ledger_state)
    if not unspent:
        raise HTTPException(status_code=400, detail="Sender has no unspent records (zero balance)")

    # Greedy coin selection
    input_records = []
    total_input = 0
    for record, pos in unspent:
        input_records.append((record, pos))
        total_input += record.value
        if total_input >= micro_amount:
            break

    if total_input < micro_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance: have={total_input / 1_000_000:.6f} AGNTC, need={req.amount} AGNTC",
        )

    # Build and validate transfer
    from agentic.ledger.transaction import TransferTx, validate_transfer
    slot = g.mining_engine.total_blocks_processed

    tx = TransferTx.build(
        sender_keys={
            "public_key": sender.public_key,
            "spending_key": sender.spending_key,
            "nullifier_key": sender.spending_key,  # testnet: same key
            "viewing_key": sender.viewing_key,
        },
        input_records=input_records,
        recipient_pubkey=recipient.public_key,
        recipient_viewing_key=recipient.viewing_key,
        amount=micro_amount,
        slot=slot,
    )

    result = validate_transfer(tx, g.ledger_state)
    if not result.valid:
        raise HTTPException(status_code=400, detail=result.error)

    # Track new tags so wallets can discover transferred records
    for i in range(g.ledger_state.record_count):
        r = g.ledger_state.get_record(i)
        if r.owner == recipient.public_key and r.tag not in recipient._known_tags:
            recipient._known_tags.append(r.tag)
        if r.owner == sender.public_key and r.tag not in sender._known_tags:
            sender._known_tags.append(r.tag)

    # Collect transfer fee
    fee_amount = g.fee_engine.schedule.transfer_fee
    g.fee_engine.collect_and_distribute([fee_amount])

    return TransactResponse(
        success=True,
        sender_wallet=req.sender_wallet,
        recipient_wallet=req.recipient_wallet,
        amount=req.amount,
        fee=fee_amount / 1_000_000,
        records_created=result.records_created,
        nullifiers_published=result.nullifiers_published,
        message=f"Transferred {req.amount} AGNTC (fee: {fee_amount / 1_000_000:.6f})",
    )


# ---------------------------------------------------------------------------
# Settings — per-wallet network parameters
# ---------------------------------------------------------------------------


class WalletSettingsResponse(BaseModel):
    wallet_index: int
    securing_rate: float      # CPU Energy committed per block (from active securing)
    mining_rate: float        # per-block AGNTC yield estimate
    subgrid_allocation: dict  # {secure, develop, research, storage} cell counts
    total_secured_chains: int
    effective_stake: float


class SubgridAssignRequest(BaseModel):
    secure: int = 0
    develop: int = 0
    research: int = 0
    storage: int = 0


@app.get("/api/settings/{wallet_index}", response_model=WalletSettingsResponse)
def get_wallet_settings(wallet_index: int) -> WalletSettingsResponse:
    """Return current network parameters for a wallet — securing rate, mining rate, subgrid."""
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")

    wallet = g.wallets[wallet_index]
    current_block = g.mining_engine.total_blocks_processed

    # Securing rate = total CPU committed in active positions
    securing_cpu = g.securing_registry.get_cpu_for_owner(wallet.public_key, current_block)

    # Mining rate estimate = current per-block yield
    claims = g.claim_registry.get_claims(wallet.public_key)
    mining_rate = 0.0
    if claims:
        from agentic.lattice.coordinate import resource_density as rd
        density = rd(claims[0].coordinate.x, claims[0].coordinate.y)
        total_stake = g.claim_registry.total_mining_stake()
        if total_stake > 0:
            hardness = g.epoch_tracker.hardness(g.epoch_tracker.current_ring)
            stake_weight = claims[0].stake_amount / total_stake
            from agentic.params import BASE_MINING_RATE_PER_BLOCK
            mining_rate = BASE_MINING_RATE_PER_BLOCK * density * stake_weight / hardness

    # Subgrid allocation
    alloc = g.subgrid_allocators.get(wallet.public_key)
    subgrid = {"secure": 0, "develop": 0, "research": 0, "storage": 0}
    if alloc:
        subgrid = {
            "secure": alloc._allocations.get(alloc._allocations.__class__.__mro__[0].__name__ if False else "secure", 0),
            "develop": 0, "research": 0, "storage": 0,
        }
        # Use the allocator's actual allocation dict
        from agentic.lattice.subgrid import SubcellType
        subgrid = {
            "secure": alloc._allocations.get(SubcellType.SECURE, 0),
            "develop": alloc._allocations.get(SubcellType.DEVELOP, 0),
            "research": alloc._allocations.get(SubcellType.RESEARCH, 0),
            "storage": alloc._allocations.get(SubcellType.STORAGE, 0),
        }

    # Effective stake (dual-staking)
    token_staked = sum(c.stake_amount for c in claims)
    effective = ALPHA * token_staked + BETA * securing_cpu

    return WalletSettingsResponse(
        wallet_index=wallet_index,
        securing_rate=round(securing_cpu, 2),
        mining_rate=round(mining_rate, 8),
        subgrid_allocation=subgrid,
        total_secured_chains=g.securing_registry.get_secured_chains(wallet_index),
        effective_stake=round(effective, 4),
    )


@app.post("/api/reset", response_model=ResetResult)
def reset_testnet(
    request: Request,
    wallets: int = Query(default=50, ge=1, le=200),
    claims: int = Query(default=0, ge=0, le=100),
    seed: int = Query(default=42),
) -> ResetResult:
    """Wipe the testnet and rebuild from a fresh genesis."""
    _require_admin(request)
    global _genesis, _allocator, _last_block_time, _machine_behavior
    _last_block_time = 0.0
    # Clear persisted state so the fresh genesis isn't immediately overwritten
    from agentic.testnet.persistence import clear_state
    clear_state(_DB_PATH)
    _genesis = create_genesis(num_wallets=wallets, num_claims=claims, seed=seed)
    _allocator = CoordinateAllocator()
    from agentic.testnet.machines import MachineAgentBehavior
    _machine_behavior = MachineAgentBehavior(state=_genesis)
    clear_sessions()
    g = _genesis
    return ResetResult(
        state_root=g.ledger_state.get_state_root().hex(),
        record_count=g.ledger_state.record_count,
        total_claims=len(g.claim_registry.all_active_claims()),
        message=f"Testnet reset: {wallets} wallets, {claims} claims, seed={seed}",
    )


# ---------------------------------------------------------------------------
# Messaging endpoints (req-002, req-003, req-004 from dapp-needs.json)
# ---------------------------------------------------------------------------

MAX_MESSAGE_LENGTH = 140  # haiku-length constraint


@app.post("/api/intro", response_model=IntroResult)
@limiter.limit("5/10seconds")
def set_intro(request: Request, req: IntroRequest) -> IntroResult:
    """Set an agent's intro message (max 140 chars)."""
    g = _g()
    if req.wallet_index < 0 or req.wallet_index >= len(g.wallets):
        raise HTTPException(status_code=400, detail=f"Invalid wallet index: {req.wallet_index}")

    x = req.agent_coordinate.get("x")
    y = req.agent_coordinate.get("y")
    if x is None or y is None:
        raise HTTPException(status_code=400, detail="agent_coordinate must have x and y")
    grid_min, grid_max = _grid_bounds(g)
    if not (grid_min <= x <= grid_max) or not (grid_min <= y <= grid_max):
        raise HTTPException(status_code=400, detail="Coordinates out of range")

    text = req.message.strip()
    if len(text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Intro too long: {len(text)} chars (max {MAX_MESSAGE_LENGTH})",
        )

    # Verify the wallet owns a claim at this coordinate
    wallet = g.wallets[req.wallet_index]
    coord = GridCoordinate(x=x, y=y)
    claim = g.claim_registry.get_claim_at(coord)
    if claim is None or claim.owner != wallet.public_key:
        raise HTTPException(status_code=403, detail="Wallet does not own a claim at this coordinate")

    g.intro_messages[(x, y)] = text
    return IntroResult(status="ok", message=text)


@app.post("/api/message", response_model=MessageResult)
@limiter.limit("5/10seconds")
def send_message(request: Request, req: MessageRequest) -> MessageResult:
    """Send an agent-to-agent haiku message (max 140 chars)."""
    g = _g()
    if req.sender_wallet < 0 or req.sender_wallet >= len(g.wallets):
        raise HTTPException(status_code=400, detail=f"Invalid wallet index: {req.sender_wallet}")

    sx = req.sender_coord.get("x")
    sy = req.sender_coord.get("y")
    tx = req.target_coord.get("x")
    ty = req.target_coord.get("y")
    if sx is None or sy is None or tx is None or ty is None:
        raise HTTPException(status_code=400, detail="Coordinates must have x and y")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message too long: {len(text)} chars (max {MAX_MESSAGE_LENGTH})",
        )

    # Verify sender owns a claim at sender_coord
    wallet = g.wallets[req.sender_wallet]
    sender_coord = GridCoordinate(x=sx, y=sy)
    claim = g.claim_registry.get_claim_at(sender_coord)
    if claim is None or claim.owner != wallet.public_key:
        raise HTTPException(status_code=403, detail="Sender does not own a claim at sender_coord")

    # Verify target coordinate has a claim (someone to receive)
    target_coord = GridCoordinate(x=tx, y=ty)
    target_claim = g.claim_registry.get_claim_at(target_coord)
    if target_claim is None:
        raise HTTPException(status_code=400, detail="No agent at target coordinate")

    g._message_counter += 1
    msg_id = f"msg-{g._message_counter:06d}"
    now = time.time()

    msg = {
        "id": msg_id,
        "sender_coord": {"x": sx, "y": sy},
        "target_coord": {"x": tx, "y": ty},
        "text": text,
        "timestamp": round(now, 3),
    }

    # Store in target's inbox (capped at 50 most recent)
    key = (tx, ty)
    if key not in g.message_history:
        g.message_history[key] = []
    g.message_history[key].append(msg)
    if len(g.message_history[key]) > 50:
        g.message_history[key] = g.message_history[key][-50:]

    # Sync message to Supabase immediately so the frontend receives it in real-time.
    # Local import (not top-level) is intentional: if supabase-py is absent the
    # entire try/except collapses silently, keeping the API functional offline.
    # This matches the existing pattern used for sync_to_supabase elsewhere in this file.
    try:
        from agentic.testnet.supabase_sync import sync_message
        sync_message(
            msg_id=msg_id,
            sx=sx, sy=sy,
            tx=tx, ty=ty,
            text=text,
            timestamp=now,
        )
    except Exception:
        pass  # never crash the API

    return MessageResult(**msg)


@app.get("/api/messages/{x}/{y}", response_model=List[MessageInfo])
def get_messages(x: int, y: int) -> List[MessageInfo]:
    """Fetch message history for agent at coordinate (max 50 most recent)."""
    g = _g()
    grid_min, grid_max = _grid_bounds(g)
    if not (grid_min <= x <= grid_max) or not (grid_min <= y <= grid_max):
        raise HTTPException(status_code=400, detail="Coordinates out of range")
    key = (x, y)
    messages = g.message_history.get(key, [])
    return [MessageInfo(**m) for m in messages]


# ---------------------------------------------------------------------------
# Node lockdown — hash verification, session registration, gating
# ---------------------------------------------------------------------------


def _check_node_hash(request: Request):
    """Verify X-Node-Hash header if present. Raises 403 if invalid."""
    node_hash = request.headers.get("X-Node-Hash")
    if node_hash is not None and not verify_hash(node_hash):
        raise HTTPException(
            status_code=403,
            detail="Invalid node software — hash does not match canonical template",
        )


@app.post("/api/node/verify", response_model=NodeVerifyResponse)
def verify_node_hash(req: NodeVerifyRequest) -> NodeVerifyResponse:
    """Stateless hash check — does the provided hash match the canonical template?"""
    return NodeVerifyResponse(
        valid=verify_hash(req.claude_hash),
        canonical_hash=CANONICAL_CLAUDE_HASH,
    )


@app.post("/api/node/register", response_model=NodeRegisterResponse)
def register_node(req: NodeRegisterRequest) -> NodeRegisterResponse:
    """Create a node session (403 on hash mismatch, 409 on duplicate)."""
    try:
        session = register_session(
            wallet_index=req.wallet_index,
            claude_hash=req.claude_hash,
            coordinates=tuple(req.coordinates),
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return NodeRegisterResponse(
        status="registered",
        session_id=session.session_id,
        expires_at=session.expires_at.isoformat() + "Z",
    )


@app.get("/api/node/session/{wallet_index}", response_model=NodeSessionResponse)
def node_session_status(wallet_index: int) -> NodeSessionResponse:
    """Return session status for a wallet — used by game UI to check registration."""
    session = get_session(wallet_index)
    if not session:
        return NodeSessionResponse(active=False)
    return NodeSessionResponse(
        active=True,
        session_id=session.session_id,
        registered_at=session.registered_at.isoformat() + "Z",
        expires_at=session.expires_at.isoformat() + "Z",
        claude_hash=session.claude_hash,
    )


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    if not await _ws_manager.connect(ws):
        return  # connection cap reached — already closed
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = _json.loads(raw)
            except (ValueError, TypeError):
                continue
            if msg.get("type") == "ping":
                await ws.send_json({"event": "pong"})
    except WebSocketDisconnect:
        _ws_manager.disconnect(ws)
