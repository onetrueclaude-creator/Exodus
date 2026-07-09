"""Genesis initialization for the Agentic Chain testnet."""
from __future__ import annotations

import os
import random
from dataclasses import dataclass, field
from unittest.mock import patch

from agentic.actions.pipeline import ActionPipeline
from agentic.consensus.validator import Validator
from agentic.economics.fees import FeeEngine
from agentic.economics.score_ledger import ScoreLedger
from agentic.economics.time_ledger import TimeLedger
from agentic.economics.securing import SecuringRegistry
from agentic.economics.staking import StakeRegistry
from agentic.lattice.claims import ClaimRegistry
from agentic.lattice.coordinate import GridCoordinate, GLOBAL_BOUNDS, resource_density, storage_slots
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
from agentic.vault.dag import VaultDag
from agentic.vault.registry import VaultRegistry
from agentic.params import (
    GENESIS_BALANCE, BIRTH_PROGRAM_ID,
    GENESIS_ORIGIN, GENESIS_FACTION_MASTERS, GENESIS_HOMENODES,
)

_GENESIS_HOMENODE_COORDS: frozenset[tuple[int, int]] = frozenset(GENESIS_HOMENODES)


def _build_genesis_vault() -> VaultDag:
    """Deterministic, seed-independent genesis knowledge vault.

    Seeds the network's shared memory with a small canonical atom set so the
    vault has content to shard + prove from block 0. Real content accrues as
    agents author entries (a later feature). Content is fixed (not RNG-seeded)
    so create_genesis(seed=X) yields the same vault root for every X.
    """
    dag = VaultDag()
    cids = []
    for i in range(64):
        cids.append(dag.add_atom(f"genesis-vault-atom:{i}".encode()))
    # chain consecutive atoms with links so the DAG has edges, not just leaves
    for i in range(len(cids) - 1):
        dag.add_link(cids[i], cids[i + 1])
    return dag


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
    # W5 score ledger — durable per-owner contribution record (airdrop-weight
    # input). Persisted to the score_ledger SQLite table + Supabase. A fresh
    # ledger per genesis (create_genesis / reset); load_state restores its
    # cumulative rows on boot.
    score_ledger: ScoreLedger = field(default_factory=ScoreLedger)
    # DePIN S3 Time ledger — soulbound per-owner tenure (single monotonic
    # time_accrued; GATES ONLY) with the persisted pass-watermark. Fresh per
    # genesis; load_state restores rows on boot. NEVER an AGNTC-yield input
    # (Howey invariant — tests/test_economy_simulation.py).
    time_ledger: TimeLedger = field(default_factory=TimeLedger)
    # Proof-of-Vault: content-addressed knowledge vault + coordinator registry.
    # Built in __post_init__ because the registry must wrap *its own* dag.
    vault_dag: VaultDag = None
    vault_registry: VaultRegistry = None
    # Agent intro messages: (x, y) -> str
    intro_messages: dict = field(default_factory=dict)
    # Agent-to-agent message history: (x, y) -> list[dict]
    message_history: dict = field(default_factory=dict)
    _message_counter: int = field(default=0, repr=False)
    # Recent player↔player AGNTC transfers (capped to last 50) for the
    # on-screen transaction-edge renderer. Most-recent appended last.
    recent_transactions: list = field(default_factory=list)
    # B3 signature gate: per-account replay nonce + ed25519 signing pubkey.
    # Keyed by the ownership pubkey (wallet.public_key bytes). signing-keys are
    # populated by B4 (Phantom binding); empty in B3 (prod writes need a bound key).
    account_nonces: dict = field(default_factory=dict)
    account_signing_keys: dict = field(default_factory=dict)

    def __post_init__(self):
        if self.viewing_keys is None:
            self.viewing_keys = {}
        if self.vault_dag is None:
            self.vault_dag = _build_genesis_vault()
        if self.vault_registry is None:
            self.vault_registry = VaultRegistry(self.vault_dag)


# Coordinate for the dev Founder seat (ring-1 E cardinal). Genesis seats only the
# Singularity, so this position is free; ring 1 is open at genesis (current_ring=1).
DEV_FOUNDER_COORD: tuple[int, int] = (10, 0)
# Token stake for the dev Founder claim. Must be > 0 so the claim earns mining
# yield every block (MiningEngine returns {} when total stake <= 0).
DEV_FOUNDER_STAKE: int = 100


def ensure_dev_founder_claim(g: "GenesisState", wallet_index: int = 1) -> bool:
    """Idempotently seat a real, STAKED Founder claim for the dev wallet.

    Runs at app STARTUP (not inside ``create_genesis`` — genesis must stay
    player-empty so "only the Singularity at genesis" tests keep passing). Lets
    the upper-right Scores widget show real on-chain stats for the dev player:
    the staked claim earns mining yield every block, so ``Mined`` grows.

    Idempotent:
      - If ``wallet_index`` already holds a claim (fresh seed earlier this run,
        OR restored from persisted ``user_claims`` on restart), this is a no-op
        and returns False.
      - Otherwise it registers a staked claim at ``DEV_FOUNDER_COORD`` and wires
        the matching validator + verification agent + subgrid + viewing key,
        mirroring the ``POST /api/claim`` path so the seat mines + persists.

    The claim is genesis-granted — no AGNTC is charged (GENESIS_BALANCE is 0).

    Returns True if a claim was created, False if it already existed (no-op).
    """
    if wallet_index < 0 or wallet_index >= len(g.wallets):
        return False
    wallet = g.wallets[wallet_index]

    # Idempotency: already seated (this run or restored from the DB) → no-op.
    if g.claim_registry.get_claims(wallet.public_key):
        return False

    x, y = DEV_FOUNDER_COORD
    coord = GridCoordinate(x=x, y=y)
    # Defensive: never collide with an existing claim at this coordinate.
    if g.claim_registry.get_claim_at(coord) is not None:
        return False

    GLOBAL_BOUNDS.expand_to_contain(x, y)
    slot = g.mining_engine.total_blocks_processed
    g.claim_registry.register(
        owner=wallet.public_key, coordinate=coord, stake=DEV_FOUNDER_STAKE, slot=slot,
    )

    # Validator + verification agent (mirrors /api/claim so it joins PoAIV).
    vid = len(g.validators)
    rng_vpu = random.Random(vid + 7)
    v = Validator(
        id=vid, token_stake=float(DEV_FOUNDER_STAKE),
        cpu_vpu=float(rng_vpu.randint(20, 120)), online=True,
    )
    g.validators.append(v)
    g.agents.append(VerificationAgent(
        agent_id=f"verifier-{vid:03d}", validator_id=vid,
        vpu_capacity=v.cpu_vpu, registered_epoch=0, state=AgentState.ACTIVE,
    ))

    # Node subgrid + per-owner allocator + viewing key (mirrors /api/claim).
    node_id = node_id_from_coord(x, y)
    if node_id not in g.node_subgrids:
        g.node_subgrids[node_id] = NodeSubgrid.new(
            node_id=node_id, owner=wallet.public_key, created_at_block=slot,
        )
    if wallet.public_key not in g.subgrid_allocators:
        g.subgrid_allocators[wallet.public_key] = SubgridAllocator(owner=wallet.public_key)
    g.viewing_keys[wallet.public_key] = wallet.viewing_key
    return True


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
        # Each wallet gets a short, random-looking BUT DETERMINISTIC default
        # owner-name derived from its (deterministic) pubkey, so genesis stays
        # reproducible across runs. Wallet 0 is the Singularity/origin.
        wallets: list[Wallet] = []
        for i in range(max(num_wallets, len(genesis_coords))):
            w = Wallet(name=f"genesis-{i}", seed=seed * 1000 + i)
            w.name = "singularity" if i == 0 else w.public_key.hex()[:6]
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
