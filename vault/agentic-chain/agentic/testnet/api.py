"""FastAPI JSON API for the Agentic Chain testnet.

Exposes testnet state for the frontend dashboard.

Run with:
    uvicorn agentic.testnet.api:app --port 8080 --reload
"""
from __future__ import annotations

import asyncio
import json as _json
import time
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------


class ConnectionManager:
    """Manages active WebSocket connections for broadcasting chain events."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

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
from agentic.galaxy.allocator import CoordinateAllocator
from agentic.galaxy.coordinate import GridCoordinate, resource_density, storage_slots
from agentic.ledger.transaction import BirthTx, validate_birth
from agentic.params import (
    BASE_BIRTH_COST, BLOCK_TIME_MS, NODE_GRID_SPACING,
)
from agentic.testnet.genesis import GenesisState, create_genesis
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
    wallet_index: int
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


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(title="Agentic Chain Testnet API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global genesis state — populated at startup.
_genesis: Optional[GenesisState] = None
_allocator: Optional[CoordinateAllocator] = None
_machine_behavior = None  # MachineAgentBehavior instance


@app.on_event("startup")
def _init_genesis() -> None:
    global _genesis, _allocator, _machine_behavior
    _genesis = create_genesis(num_wallets=50, num_claims=0, seed=42)
    _allocator = CoordinateAllocator()
    from agentic.testnet.machines import MachineAgentBehavior
    _machine_behavior = MachineAgentBehavior(state=_genesis)


@app.on_event("startup")
async def _start_auto_miner() -> None:
    """Launch background auto-mining loop."""
    asyncio.create_task(_auto_mine_loop())


async def _auto_mine_loop() -> None:
    """Mine a block at the fixed block time when there are active claims."""
    global _last_block_time
    while True:
        await asyncio.sleep(_BLOCK_TIME_S)
        if not _auto_mine or _genesis is None:
            continue
        g = _genesis
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
        yields = g.mining_engine.compute_block_yields(
            claims_input, epoch_tracker=g.epoch_tracker)
        if yields:
            g.mining_engine.mint_block_rewards(yields, g.ledger_state, g.viewing_keys)
        hex_yields = {k.hex(): round(v, 6) for k, v in yields.items()}

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
    from agentic.galaxy.subgrid import SubcellType
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
def assign_subgrid(wallet_index: int, req: SubgridAssignRequest) -> dict:
    """Reassign subgrid cells across the 4 resource types."""
    g = _g()
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        raise HTTPException(status_code=404, detail="Wallet not found")
    wallet = g.wallets[wallet_index]
    owner = wallet.public_key
    alloc = g.subgrid_allocators.get(owner)
    if alloc is None:
        raise HTTPException(status_code=404, detail="No subgrid for this wallet")
    from agentic.galaxy.subgrid import SubcellType
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
def mine_block() -> MineResult:
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
async def toggle_automine(enabled: bool = True) -> dict:
    """Toggle automatic block mining. When enabled, blocks are mined at the
    fixed block time interval. Epoch hardness handles difficulty scaling."""
    global _auto_mine
    _auto_mine = enabled
    return {"auto_mine": _auto_mine, "current_block_time": _BLOCK_TIME_S}


@app.post("/api/claim", response_model=ClaimNodeResult)
def claim_node(req: ClaimNodeRequest) -> ClaimNodeResult:
    """Create an agent that claims and colonizes a grid node.

    Lightweight — no Record creation. The agent plugs into an existing
    grid coordinate, claims it, and begins colonizing. Creates a validator
    + verification agent so it participates in PoAIV consensus and earns
    mining rewards automatically.
    """
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
        message=f"Agent created at ({x},{y}). Node colonized. Validator #{vid} active. Auto-mining enabled.")


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
def birth_star_system(req: BirthRequest) -> BirthResult:
    """Birth a new star system by spending AGNTC."""
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


@app.post("/api/reset", response_model=ResetResult)
def reset_testnet(
    wallets: int = Query(default=50, ge=1, le=200),
    claims: int = Query(default=0, ge=0, le=100),
    seed: int = Query(default=42),
) -> ResetResult:
    """Wipe the testnet and rebuild from a fresh genesis."""
    global _genesis, _allocator, _last_block_time, _machine_behavior
    _last_block_time = 0.0
    _genesis = create_genesis(num_wallets=wallets, num_claims=claims, seed=seed)
    _allocator = CoordinateAllocator()
    from agentic.testnet.machines import MachineAgentBehavior
    _machine_behavior = MachineAgentBehavior(state=_genesis)
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
def set_intro(req: IntroRequest) -> IntroResult:
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
def send_message(req: MessageRequest) -> MessageResult:
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
# WebSocket endpoint
# ---------------------------------------------------------------------------


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await _ws_manager.connect(ws)
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
