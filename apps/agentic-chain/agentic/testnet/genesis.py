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
from agentic.galaxy.mining import CommunityPool, MiningEngine
from agentic.ledger.crypto import hash_tag
from agentic.ledger.record import Record
from agentic.ledger.state import LedgerState
from agentic.ledger.wallet import Wallet
from agentic.verification.agent import VerificationAgent, AgentState
from agentic.verification.pipeline import VerificationPipeline
from agentic.params import GENESIS_BALANCE, GRID_MIN, GRID_MAX, BIRTH_PROGRAM_ID


@dataclass
class GenesisState:
    ledger_state: LedgerState
    wallets: list[Wallet]
    claim_registry: ClaimRegistry
    community_pool: CommunityPool
    mining_engine: MiningEngine
    pipeline: ActionPipeline
    verification_pipeline: VerificationPipeline = None
    validators: list[Validator] = field(default_factory=list)
    agents: list[VerificationAgent] = field(default_factory=list)
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
    num_wallets: int = 10,
    num_claims: int = 5,
    seed: int = 0,
) -> GenesisState:
    """Bootstrap a fresh testnet state.

    1. Create fresh LedgerState.
    2. Create N wallets using deterministic seeds.
    3. Mint GENESIS_BALANCE tokens into each wallet.
    4. Register num_claims claims at random-but-deterministic coordinates.
    5. Initialize CommunityPool and MiningEngine.
    6. Wire up ActionPipeline with LedgerState and ClaimRegistry.
    7. Return GenesisState with all components.

    The entire process is deterministic for a given (num_wallets, num_claims, seed)
    triple, so repeated calls produce identical state roots.
    """
    rng = random.Random(seed)

    # Patch os.urandom so that record nonces (used inside validate_mint)
    # are deterministic, making the whole genesis reproducible.
    det_urandom = _deterministic_urandom(random.Random(seed))

    with patch.object(os, "urandom", det_urandom):
        state = LedgerState()

        # -- Wallets & minting ------------------------------------------------
        wallets: list[Wallet] = []
        for i in range(num_wallets):
            w = Wallet(name=f"genesis-{i}", seed=seed * 1000 + i)
            wallets.append(w)
            w.receive_mint(state, amount=GENESIS_BALANCE, slot=0)

        # -- Claims -----------------------------------------------------------
        claim_registry = ClaimRegistry()
        coords_used: set[tuple[int, int]] = set()
        claims_created = 0
        while claims_created < min(num_claims, num_wallets):
            x = rng.randint(GRID_MIN, GRID_MAX)
            y = rng.randint(GRID_MIN, GRID_MAX)
            if (x, y) in coords_used:
                continue
            coords_used.add((x, y))
            wallet = wallets[claims_created % num_wallets]
            coord = GridCoordinate(x=x, y=y)
            stake = rng.randint(100, 500)
            claim_registry.register(
                owner=wallet.public_key, coordinate=coord,
                stake=stake, slot=0,
            )
            # Create home star Record (free at genesis)
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
            claims_created += 1

    # -- Viewing keys ---------------------------------------------------------
    viewing_keys = {w.public_key: w.viewing_key for w in wallets}

    # -- Mining & pipeline (no randomness needed) -----------------------------
    pool = CommunityPool()
    engine = MiningEngine(pool=pool)
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

    return GenesisState(
        ledger_state=state,
        wallets=wallets,
        claim_registry=claim_registry,
        community_pool=pool,
        mining_engine=engine,
        pipeline=pipeline,
        verification_pipeline=verification_pipeline,
        validators=validators,
        agents=agents,
        viewing_keys=viewing_keys,
    )
