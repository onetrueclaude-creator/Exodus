"""Genesis initialization for the Agentic Chain testnet."""
from __future__ import annotations

import os
import random
from dataclasses import dataclass, field
from unittest.mock import patch

from agentic.actions.pipeline import ActionPipeline
from agentic.consensus.validator import Validator
from agentic.galaxy.claims import ClaimRegistry
from agentic.galaxy.coordinate import GridCoordinate, resource_density, storage_slots
from agentic.galaxy.mining import MiningEngine
from agentic.ledger.crypto import hash_tag
from agentic.ledger.record import Record
from agentic.ledger.state import LedgerState
from agentic.ledger.wallet import Wallet
from agentic.verification.agent import VerificationAgent, AgentState
from agentic.verification.pipeline import VerificationPipeline
from agentic.galaxy.epoch import EpochTracker
from agentic.galaxy.subgrid import SubgridAllocator
from agentic.params import (
    GENESIS_BALANCE, BIRTH_PROGRAM_ID,
    GENESIS_ORIGIN, GENESIS_FACTION_MASTERS, GENESIS_HOMENODES,
)


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
    resource_totals: dict = field(default_factory=dict)
    viewing_keys: dict = None
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

    Genesis topology (fixed, centre-out):
      - 1 origin node at (0, 0)
      - 4 Faction Master homenodes at cardinal positions  (N E S W)
      - 4 regular homenodes at diagonal positions         (NE SE SW NW)
      Total: 9 predetermined nodes.

    Wallets start with GENESIS_BALANCE = 0 — all value is earned through mining.
    ``num_claims`` is ignored; genesis nodes are always placed at the 9 fixed positions.
    """
    rng = random.Random(seed)
    det_urandom = _deterministic_urandom(random.Random(seed))

    # All 9 genesis positions in placement order:
    #   index 0  → origin (system node)
    #   index 1–4 → Faction Masters (cardinal, 'opus' tier)
    #   index 5–8 → regular homenodes (diagonal, 'sonnet' tier)
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

        # -- Fixed genesis nodes ----------------------------------------------
        claim_registry = ClaimRegistry()
        for i, (x, y) in enumerate(genesis_coords):
            wallet = wallets[i]
            coord = GridCoordinate(x=x, y=y)
            stake = 500 if i == 0 else (400 if i <= 4 else 200)
            claim_registry.register(
                owner=wallet.public_key, coordinate=coord,
                stake=stake, slot=0,
            )
            density = resource_density(x, y)
            slots = storage_slots(x, y)
            density_scaled = int(density * 1_000_000)
            star_tag = hash_tag(wallet.viewing_key, BIRTH_PROGRAM_ID, state.record_count)
            star_record = Record(
                owner=wallet.public_key,
                data=[0, coord.x_offset, coord.y_offset, density_scaled, slots],
                nonce=det_urandom(32),
                tag=star_tag,
                program_id=BIRTH_PROGRAM_ID,
                birth_slot=0,
            )
            state.insert_record(star_record)

    # Expand global bounds to cover genesis coordinates
    from agentic.galaxy.coordinate import GLOBAL_BOUNDS
    for x, y in genesis_coords:
        GLOBAL_BOUNDS.expand_to_contain(x, y)

    # -- Viewing keys ---------------------------------------------------------
    viewing_keys = {w.public_key: w.viewing_key for w in wallets}

    # -- Mining & pipeline (no randomness needed) -----------------------------
    engine = MiningEngine()
    pipeline = ActionPipeline(ledger_state=state, claim_registry=claim_registry)

    # -- Verification agents & validators (one per claim) -------------------
    validators: list[Validator] = []
    agents: list[VerificationAgent] = []
    claims = claim_registry.all_active_claims()
    vpu_rng = random.Random(seed + 7)
    for i, claim in enumerate(claims):
        v = Validator(
            id=i,
            token_stake=float(claim.stake_amount),
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
        resource_totals=resource_totals,
    )
