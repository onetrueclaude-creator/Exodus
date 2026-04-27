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

# Faction distribution — equal 25% per faction (applies to newly minted AGNTC)
DIST_COMMUNITY    = 0.25   # Free Community (N arm, white)
DIST_MACHINES     = 0.25   # Machines Faction (E arm, gold) — AI agent economy
DIST_FOUNDERS     = 0.25   # Founder Pool (S arm, red) — team & advisors (4yr vest, 12mo cliff)
DIST_PROFESSIONAL = 0.25   # Professional (W arm, cyan) — paid-tier users

# Machines Faction constraint — agents cannot sell below acquisition cost
MACHINES_MIN_SELL_RATIO = 1.0

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
# Faction Masters occupy the 4 cardinal positions; regular homenodes fill the diagonals.
GENESIS_ORIGIN = (0, 0)
GENESIS_FACTION_MASTERS = [(0, 10), (10, 0), (0, -10), (-10, 0)]   # N E S W
GENESIS_HOMENODES      = [(10, 10), (10, -10), (-10, -10), (-10, 10)]  # NE SE SW NW

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

# ── Treasury Operator HMAC Hooks (Phase 2 of zkagentic-treasury integration) ──
# The Treasury operator (separate process — see github.com/onetrueclaude-creator/
# zkagentic-treasury TIP-0) authenticates to the chain via HMAC-SHA256 over
# (method + path + timestamp_ms + sha256_hex(body)).  These constants govern
# the verification window and registered operator identity.
#
# TREASURY_OPERATOR_PUBKEY_HASH and TREASURY_OPERATOR_SECRET_ENV are intentionally
# environment-driven; they MUST be set per deployment, not committed to the
# repository.  In testnet, missing config disables Treasury hooks (404 on the
# heartbeat endpoint) — chain operates identically without an operator.
TREASURY_HMAC_HEADER_SIGNATURE = "X-Treasury-Signature"
TREASURY_HMAC_HEADER_TIMESTAMP = "X-Treasury-Timestamp"
TREASURY_HMAC_HEADER_PUBKEY_HASH = "X-Treasury-Pubkey-Hash"
TREASURY_HMAC_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000   # ±5 min window for replay resistance
TREASURY_HEARTBEAT_FRESH_BLOCKS = 2                  # operator considered online if heartbeat ≤ N blocks old

# ── Empire Panel rollout (remove in PR C) ──
# While ON, yield computation still reads per-wallet SubgridAllocator.
# When OFF, reads per-node NodeSubgrid and ignores the legacy field.
LEGACY_PER_WALLET_SUBGRID: bool = True
