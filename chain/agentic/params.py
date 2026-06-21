"""Protocol parameters for the Agentic Chain."""

# Consensus
BLOCK_TIME_MS = 60_000
VERIFIERS_PER_BLOCK = 13
VERIFICATION_THRESHOLD = 9
ZK_FINALITY_TARGET_S = 20
SLOTS_PER_EPOCH = 100

# Staking — CPU-weighted dual staking (ZK-CPU model)
ALPHA = 0.40  # token weight in effective stake
BETA = 0.60   # CPU weight — rewards computational contribution over capital

# Rewards
REWARD_SPLIT_ORDERER = 0.00
REWARD_SPLIT_VERIFIER = 0.60
REWARD_SPLIT_STAKER = 0.40

# Tokenomics — organic growth model (v2)
# No scheduled inflation. Supply grows only when coordinates are claimed (1 AGNTC each).
# Total potential supply = 1,000,000,000 AGNTC
# See docs/plans/2026-02-25-tokenomics-v2-design.md
GRID_SIDE = 31_623                # ~31,623 × 31,623 coordinate grid (~1B cells)
MAX_SUPPLY = 1_000_000_000       # 1 billion AGNTC
GENESIS_SUPPLY = 900              # 9 genesis nodes × 100 coords × 1 AGNTC
FEE_BURN_RATE = 0.50              # 50% of fees burned, 50% to verifiers/stakers
ANNUAL_INFLATION_CEILING = 0.05   # 5% max annualized supply growth (soft cap, governance-adjustable)
SIGNUP_BONUS = 1.0                # 1 AGNTC fresh-minted per new user registration

# Faction distribution — DEPRECATED in whitepaper v1.1 (Open-Grid Revision).
# Under v1.1 there is no per-faction-arm AGNTC allocation; distribution is
# emergent from mining (each claimed coordinate mints AGNTC directly to the
# claimant regardless of faction). These constants are retained only for
# backward compatibility with legacy visualization scripts that still render
# the v1.0 four-segment supply chart (chain/run_*.py, agentic/visualization/).
# Do NOT add new consumers. New code should treat distribution as emergent.
DIST_COMMUNITY    = 0.25   # [DEPRECATED v1.1]
DIST_MACHINES     = 0.25   # [DEPRECATED v1.1]
DIST_FOUNDERS     = 0.25   # [DEPRECATED v1.1]
DIST_PROFESSIONAL = 0.25   # [DEPRECATED v1.1]

# Machines Faction constraint — agents cannot sell below acquisition cost
MACHINES_MIN_SELL_RATIO = 1.0

# Whitepaper v1.1: Machines Faction is permanently bound to the origin
# coordinate. The protocol-operated agent at MACHINES_ORIGIN_COORD does not
# expand to other coordinates; it auto-levels its single node and accumulates
# AGNTC from origin's mining yield only. See whitepaper §4.5, §10.3.
#
# NOTE: the live testnet currently has Machines at GENESIS_FACTION_MASTERS[1]
# == (10, 0) (the v1.0 East-arm master). Migration of the live testnet state
# from (10, 0) to (0, 0) is tracked as Sub-project D (testnet state migration).
# The Python code at agentic/testnet/machines.py is v1.1-aligned in behaviour
# (no expansion) but the coordinate constant still reads from the legacy
# wallet-2 home until the migration runs.
MACHINES_ORIGIN_COORD = (0, 0)

# Solana Mainnet
AGNTC_MINT_ADDRESS = "3EzQqdoEEbtfdf8eecePxD6gDd1FeJJ8czdt8k27eEdd"
AGNTC_MINT_TX = "mD3RT38puitUxCcPMF5RBf6VUAF9WXTA6JEEy2zMCe5KgoNFU6d2iLE9mu3qaqUZEBBfKSniWvMKZCpahrs5PYH"

# Ledger
MERKLE_TREE_DEPTH = 26
MAX_TXS_PER_BLOCK = 50
MINT_PROGRAM_ID = b"agentic_mint"
TRANSFER_PROGRAM_ID = b"agentic_transfer"
STAKE_PROGRAM_ID = b"agentic_stake"
GENESIS_BALANCE = 0         # No pre-minted coins — all value earned through mining

# Simulation
SIM_NUM_WALLETS = 50
SIM_NUM_EPOCHS = 20
SIM_ADVERSARIAL_RATE = 0.10
SIM_TXS_PER_USER_MIN = 0
SIM_TXS_PER_USER_MAX = 3

# Verification Pipeline
VERIFICATION_COMMIT_WINDOW_S = 10.0    # commit phase duration (simulated seconds)
VERIFICATION_REVEAL_WINDOW_S = 20.0    # reveal phase duration
VERIFICATION_HARD_DEADLINE_S = 60.0    # maximum finalization deadline

# Agent Lifecycle
AGENT_WARMUP_EPOCHS = 1               # epochs before agent becomes ACTIVE
AGENT_PROBATION_EPOCHS = 3            # epochs on probation before re-activation

# Safe Mode
SAFE_MODE_THRESHOLD = 0.20            # 20% offline triggers safe mode
SAFE_MODE_RECOVERY = 0.80             # 80% online exits safe mode

# Dispute Resolution
DISPUTE_REVERIFY_MULTIPLIER = 2       # 2x verifiers for re-verification

# Galaxy Grid — dynamic bounds derived from current epoch ring
# No fixed GRID_MIN/GRID_MAX — grid expands as epochs advance
MAX_PLANETS_PER_NODE = 10
CLAIM_PROGRAM_ID = b"agentic_claim"
STORAGE_PROGRAM_ID = b"agentic_storage"

# Node placement — agents occupy 10×10 coordinate blocks; valid positions are
# multiples of NODE_GRID_SPACING.  claim_node() snaps submitted coordinates to
# the nearest multiple so homenodes always land on a grid square centre.
NODE_GRID_SPACING = 10

# Genesis topology — 9 nodes: origin + 8-node ring at distance NODE_GRID_SPACING.
# Under whitepaper v1.1 (Open-Grid Revision):
#   - The origin (0, 0) is permanently bound to the Machines Faction agent.
#   - Ring-1 cardinal and diagonal positions are unclaimed at launch and
#     available to any participant regardless of faction.
# The legacy v1.0 names GENESIS_FACTION_MASTERS / GENESIS_HOMENODES are
# retained as the canonical constants because they are referenced from many
# call sites (genesis.py, persistence.py, supabase_sync.py, machines.py,
# tests). The v1.1 aliases below are the preferred names for new code.
GENESIS_ORIGIN = (0, 0)
GENESIS_FACTION_MASTERS = [(0, 10), (10, 0), (0, -10), (-10, 0)]   # N E S W
GENESIS_HOMENODES      = [(10, 10), (10, -10), (-10, -10), (-10, 10)]  # NE SE SW NW

# v1.1 aliases — same lists, more accurate names. Prefer these in new code.
GENESIS_RING1_CARDINALS = GENESIS_FACTION_MASTERS
GENESIS_RING1_DIAGONALS = GENESIS_HOMENODES

# Birth / Claims — city model (inner rings expensive, outer cheap)
# cost = BASE_CLAIM_COST × density / ring, floored at CLAIM_COST_FLOOR
BIRTH_PROGRAM_ID = b"agentic_birth"
BASE_CLAIM_COST = 100             # AGNTC cost at ring 1, density 1.0
BASE_BIRTH_COST = BASE_CLAIM_COST # Legacy alias — use BASE_CLAIM_COST in new code
BASE_CPU_CLAIM_COST = 50          # CPU Energy cost at ring 1, density 1.0
CLAIM_COST_FLOOR = 0.01           # Minimum claim cost at extreme outer rings
CLAIM_REQUIRES_ACTIVE_STAKE = True  # Must have active stake to claim nodes

# Mining (per-block = per-turn = ~1 minute)
BASE_MINING_RATE_PER_BLOCK = 0.5     # AGNTC/block at hardness=1, full density (tune in testing)
ENERGY_PER_CLAIM = 1.0               # VPU cost per active claim

# RETIRED: replaced by epoch-based hardness system (see EpochTracker)
# INITIAL_BLOCK_TIME_S — superseded by epoch hardness
# BLOCK_TIME_GROWTH_S  — superseded by epoch hardness
# MAX_BLOCK_TIME_S     — superseded by epoch hardness
# HALVING_INTERVAL     — superseded by epoch hardness

# Epoch system — mining-driven grid expansion
GENESIS_EPOCH_RING = 1            # rings pre-revealed at genesis (ring 0 + ring 1)
HARDNESS_MULTIPLIER = 16          # hardness(ring) = 16 × ring (no cap)
HOMENODE_BASE_ANGLE = 137.5       # golden-prime twist base angle (degrees)

# Securing — active CPU Energy commitment to chain validation
SECURE_REWARD_IMMEDIATE = 0.50    # 50% liquid on block confirmation
SECURE_REWARD_VEST_DAYS = 30      # remaining 50% vests linearly over 30 days
BASE_CPU_PER_SECURE_BLOCK = 50    # CPU Energy cost per block cycle at density 1.0

# Subgrid allocation — 4 autonomous sub-cell agent types (base output at level 1, full density)
SUBGRID_SIZE = 64                   # 8x8 sub-cells per homenode inner grid
BASE_SECURE_RATE = 0.5              # AGNTC/block at level 1, hardness 1, full density
BASE_DEVELOP_RATE = 1.0             # Dev Points/block at level 1
BASE_RESEARCH_RATE = 0.5            # Research Points/block at level 1
BASE_STORAGE_RATE = 1.0             # Storage units/block at level 1
LEVEL_EXPONENT = 0.8                # output = base * level^LEVEL_EXPONENT

# ── Agent Lockdown — Node Hash Verification ─────────────────
CANONICAL_CLAUDE_HASH = "823c3f76b2b13ae2a9d50c84c51c2610146279e2eacf424d3c08e1eccaf39488"
NODE_HASH_LENGTH = 64
NODE_SESSION_TIMEOUT_S = 3600
MAX_SESSIONS_PER_WALLET = 1

# ── Empire Panel rollout (remove in PR C) ──
# While ON, yield computation still reads per-wallet SubgridAllocator.
# When OFF, reads per-node NodeSubgrid and ignores the legacy field.
LEGACY_PER_WALLET_SUBGRID: bool = True

# ── Phyllotaxis seating (v1.2) ──────────────────────────────────────────────
# Seat = rank k; angle(k)=k·GOLDEN_ANGLE_DEG, radius=c·√k (radial scale is a
# client-side visual constant). Hardness tiers via equal-width radial bands:
# band(k)=ceil(√(k/SEATS_INNER_BAND)), hardness=HARDNESS_MULTIPLIER·band.
GOLDEN_ANGLE_DEG = 137.5077640500378   # 360·(2−φ), φ=(1+√5)/2 — most-irrational divergence angle
SEATS_INNER_BAND = 8                    # K1: innermost band capacity; outer band b holds (2b−1)·K1

# ── Activity score (v1.2) ───────────────────────────────────────────────────
ACTIVITY_HALF_LIFE_BLOCKS = 240   # EMA half-life (~4h) — standing is stable, slower than edge fade
ACTIVITY_CHEAP_ACTION_CAP = 0.05  # max share of a block's score from cheap actions (anti-farm)
PROMOTION_COOLDOWN_BLOCKS = 10    # anti-flicker on per-block re-ranking
EDGE_FADE_BLOCKS = 30             # interaction-edge decay window (~30 min)

# ── Singularity (renamed from Machines; aliases kept one release) ───────────
SINGULARITY_ORIGIN_COORD = MACHINES_ORIGIN_COORD
SINGULARITY_MIN_SELL_RATIO = MACHINES_MIN_SELL_RATIO
SINGULARITY_WALLET_INDEX = 0   # origin wallet (matches machines.MACHINE_WALLET_INDEX)

# ── Proof-of-Vault securing (feasibility report 2026-06-18) ─────────────────
# Securing = real CPU+disk spent storing/serving a shard of the Singularity's
# content-addressed knowledge vault, proven via freshness-bound sampled-PDP.
# Each passing proof is a reward/stake INPUT (not consensus, not an API-key
# spend) and refreshes the decaying Singularity link edge. The Singularity is
# the trusted coordinator/verifier on TESTNET ONLY — mainnet unique-encoding /
# anti-sybil (PoRep, timed/keyed challenges, Merkle-CRDT) is a DEFERRED
# research milestone and is intentionally NOT implemented here. See report §6/§8.
VAULT_SHARD_COUNT = 16              # vault CID space partitioned into 16 shards
VAULT_REPLICATION_FACTOR = 3       # each shard stored by 3 distinct owners
VAULT_CHALLENGE_INTERVAL_BLOCKS = 30   # issue a fresh challenge every 30 blocks
VAULT_CHALLENGE_WINDOW_BLOCKS = 30     # proof must arrive within 30 blocks
VAULT_PROOF_SAMPLE_SIZE = 8        # sub-units spot-checked per sampled-PDP challenge
VAULT_MIN_STAKE_CAPACITY = 100.0   # dual-stake committed-capacity floor to be assigned a shard
VAULT_PROOF_CPU_CREDIT = 50.0      # CPU-equivalent credited to activity/reward per passing proof
VAULT_SLASH_RATE = 0.10            # fraction of committed capacity slashed on missed/failed proof
SECURE_AGNTC_REWARD = 1.0  # AGNTC minted to the prover's wallet on an accepted possession proof (testnet earn-source; mainnet routes from fees per whitepaper)
