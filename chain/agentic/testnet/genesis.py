"""Genesis initialization for the Agentic Chain testnet."""
from __future__ import annotations

import os
import random
from dataclasses import dataclass, field
from unittest.mock import patch

from agentic.actions.pipeline import ActionPipeline
from agentic.consensus.validator import Validator
from agentic.economics.fees import FeeEngine
from agentic.economics.securing import SecuringRegistry
from agentic.economics.staking import StakeRegistry
from agentic.lattice.claims import ClaimRegistry
from agentic.lattice.coordinate import GridCoordinate, resource_density, storage_slots
from agentic.lattice.mining import MiningEngine
from agentic.ledger.crypto import hash_tag
from agentic.ledger.record import Record
from agentic.ledger.state import LedgerState
from agentic.ledger.wallet import Wallet
from agentic.verification.agent import VerificationAgent, AgentState
from agentic.verification.pipeline import VerificationPipeline
from agentic.lattice.epoch import EpochTracker
from agentic.lattice.subgrid import SubgridAllocator
from agentic.lattice.node_subgrid import NodeSubgrid, node_id_from_coord
from agentic.params import (
    GENESIS_BALANCE, BIRTH_PROGRAM_ID,
    GENESIS_ORIGIN, GENESIS_FACTION_MASTERS, GENESIS_HOMENODES,
)

_GENESIS_HOMENODE_COORDS: frozenset[tuple[int, int]] = frozenset(GENESIS_HOMENODES)


@dataclass
class GenesisState:
    ledger_state: LedgerState
    wallets: list[Wallet]
    claim_registry: ClaimRegistry
    mining_engine: MiningEngine
    pipeline: ActionPipeline
    verification_pipeline: VerificationPipeline = None
    validators: list[Validator] = field(default_factory=list)
    agents: list[VerificationAgent] = field(default_factory=list)
    epoch_tracker: EpochTracker = field(default_factory=EpochTracker)
    subgrid_allocators: dict = field(default_factory=dict)
    node_subgrids: dict[str, NodeSubgrid] = field(default_factory=dict)
    resource_totals: dict = field(default_factory=dict)
    viewing_keys: dict = None
    fee_engine: FeeEngine = field(default_factory=FeeEngine)
    stake_registry: StakeRegistry = field(default_factory=StakeRegistry)
    securing_registry: SecuringRegistry = field(default_factory=SecuringRegistry)
    # Agent intro messages: (x, y) -> str
    intro_messages: dict = field(default_factory=dict)
    # Agent-to-agent message history: (x, y) -> list[dict]
    message_history: dict = field(default_factory=dict)
    _message_counter: int = field(default=0, repr=False)

    def __post_init__(self):
        if self.viewing_keys is None:
            self.viewing_keys = {}


def _deterministic_urandom(rng: random.Random):
    """Return a function that produces deterministic bytes using the given RNG."""
    def _urandom(n: int) -> bytes:
        return bytes(rng.getrandbits(8) for _ in range(n))
    return _urandom


def create_genesis(
    num_wallets: int = 50,
    num_claims: int = 0,
    seed: int = 0,
) -> GenesisState:
    """Bootstrap a fresh testnet state.

    Genesis topology (whitepaper v1.2 §10.1 — "only the Singularity is seated"):
      - 1 seated Singularity claim at the origin (0, 0) — the protocol core.
      - 9 bootstrap validators (from the 9 fixed genesis wallets/positions) that
        keep PoAIV consensus running; these are DECOUPLED from claims — only the
        origin holds a claim/seat, the other 8 are validator identities with no
        claim and no star record.
      All competitive inner ranks are OPEN at launch and fill as participants join.

    The 9 fixed positions in placement order:
      - index 0  → origin (the Singularity, seated)
      - index 1–4 → ring-1 cardinal positions  (N E S W) — bootstrap validators only
      - index 5–8 → ring-1 diagonal positions  (NE SE SW NW) — bootstrap validators only

    Wallets start with GENESIS_BALANCE = 0 — all value is earned through mining.
    ``num_claims`` is ignored; genesis seats exactly the Singularity at the origin.
    """
    rng = random.Random(seed)
    det_urandom = _deterministic_urandom(random.Random(seed))

    # All 9 genesis positions in placement order (bootstrap validator committee):
    #   index 0  → origin / Singularity (the only seated claim)
    #   index 1–4 → ring-1 cardinals  (bootstrap validators, no claim)
    #   index 5–8 → ring-1 diagonals  (bootstrap validators, no claim)
    genesis_coords: list[tuple[int, int]] = (
        [GENESIS_ORIGIN]
        + GENESIS_FACTION_MASTERS
        + GENESIS_HOMENODES
    )

    with patch.object(os, "urandom", det_urandom):
        state = LedgerState()

        # -- Wallets (no minting — GENESIS_BALANCE = 0) -----------------------
        wallets: list[Wallet] = []
        for i in range(max(num_wallets, len(genesis_coords))):
            w = Wallet(name=f"genesis-{i}", seed=seed * 1000 + i)
            wallets.append(w)
            if GENESIS_BALANCE > 0:
                w.receive_mint(state, amount=GENESIS_BALANCE, slot=0)

        # -- Seated claim: ONLY the Singularity at the origin (v1.2 §10.1) -----
        # Indices 1–8 become bootstrap-validator identities below with no claim
        # and no star record — the inner ranks stay open for arriving players.
        claim_registry = ClaimRegistry()
        x, y = GENESIS_ORIGIN
        origin_wallet = wallets[0]
        coord = GridCoordinate(x=x, y=y)
        claim_registry.register(
            owner=origin_wallet.public_key, coordinate=coord,
            stake=500, slot=0,
        )
        density = resource_density(x, y)
        slots = storage_slots(x, y)
        density_scaled = int(density * 1_000_000)
        star_tag = hash_tag(origin_wallet.viewing_key, BIRTH_PROGRAM_ID, state.record_count.to_bytes(32, 'big'))
        star_record = Record(
            owner=origin_wallet.public_key,
            data=[0, coord.x_offset, coord.y_offset, density_scaled, slots],
            nonce=det_urandom(32),
            tag=star_tag,
            program_id=BIRTH_PROGRAM_ID,
            birth_slot=0,
        )
        state.insert_record(star_record)

    # Expand global bounds to cover genesis coordinates
    from agentic.lattice.coordinate import GLOBAL_BOUNDS
    for x, y in genesis_coords:
        GLOBAL_BOUNDS.expand_to_contain(x, y)

    # -- Viewing keys ---------------------------------------------------------
    viewing_keys = {w.public_key: w.viewing_key for w in wallets}

    # -- Mining & pipeline (no randomness needed) -----------------------------
    engine = MiningEngine()
    pipeline = ActionPipeline(ledger_state=state, claim_registry=claim_registry)

    # -- Verification agents & validators (bootstrap committee) --------------
    # DECOUPLED from claims (v1.2 §10.1): only the Singularity is seated, but
    # consensus still needs a committee, so we build 9 bootstrap validators from
    # the 9 fixed genesis wallets. Stake schedule and vpu_rng order are preserved
    # byte-for-byte from the pre-v1.2 per-claim path so block production is
    # unchanged: 500 for the origin, 400 for the cardinals, 200 for the diagonals.
    validators: list[Validator] = []
    agents: list[VerificationAgent] = []
    vpu_rng = random.Random(seed + 7)
    for i in range(len(genesis_coords)):
        token_stake = 500 if i == 0 else (400 if i <= 4 else 200)
        v = Validator(
            id=i,
            token_stake=float(token_stake),
            cpu_vpu=float(vpu_rng.randint(20, 120)),
            online=True,
        )
        validators.append(v)
        agent = VerificationAgent(
            agent_id=f"verifier-{i:03d}",
            validator_id=i,
            vpu_capacity=v.cpu_vpu,
            registered_epoch=0,
            state=AgentState.ACTIVE,
        )
        agents.append(agent)

    verification_pipeline = VerificationPipeline(seed=seed, adversarial_rate=0.0)

    epoch_tracker = EpochTracker()

    # -- Subgrid allocators (one per unique claim owner) ----------------------
    subgrid_allocators = {}
    for claim in claim_registry.all_active_claims():
        if claim.owner not in subgrid_allocators:
            subgrid_allocators[claim.owner] = SubgridAllocator(owner=claim.owner)

    # -- NodeSubgrid (one per homenode claim, keyed by "x,y" string) ----------
    node_subgrids = {}
    for claim in claim_registry.all_active_claims():
        coord_tuple = (claim.coordinate.x, claim.coordinate.y)
        if coord_tuple not in _GENESIS_HOMENODE_COORDS:
            continue
        node_id = node_id_from_coord(claim.coordinate.x, claim.coordinate.y)
        node_subgrids[node_id] = NodeSubgrid.new(
            node_id=node_id, owner=claim.owner, created_at_block=0,
        )

    # -- Resource totals (one per wallet, all zeroed at genesis) --------------
    resource_totals = {
        w.public_key: {
            "dev_points": 0.0,
            "research_points": 0.0,
            "storage_units": 0.0,
        }
        for w in wallets
    }

    return GenesisState(
        ledger_state=state,
        wallets=wallets,
        claim_registry=claim_registry,
        mining_engine=engine,
        pipeline=pipeline,
        verification_pipeline=verification_pipeline,
        validators=validators,
        agents=agents,
        viewing_keys=viewing_keys,
        epoch_tracker=epoch_tracker,
        subgrid_allocators=subgrid_allocators,
        node_subgrids=node_subgrids,
        resource_totals=resource_totals,
    )
