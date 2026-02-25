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

# Tokenomics
TOTAL_SUPPLY = 42_000_000         # Genesis supply — inflationary, no fixed cap
INITIAL_CIRCULATING = 42_000_000  # 42M AGNTC at genesis (genesis liquidity only)
INITIAL_INFLATION_RATE = 0.10     # 10% — bootstrap incentive for ZK prover network
DISINFLATION_RATE = 0.10          # 10%/yr — gradual decay rewards early adopters
INFLATION_FLOOR = 0.01            # 1% — permanent minimal staking incentive at maturity
FEE_BURN_RATE = 0.50              # 50% of fees burned, 50% to verifiers/treasury

# Initial distribution (total allocation, vested over time — not all circulating at genesis)
DIST_COMMUNITY = 0.40     # Community staking pool — emitted to free stakers based on compute delegation
DIST_TREASURY = 0.30      # Foundation reserve (6mo cliff, 48mo vest)
DIST_TEAM = 0.20          # Team & advisors (4yr vest, 12mo cliff)
DIST_AGENTS = 0.10        # Governing agents — total cost of AI verification agents

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

# Galaxy Grid — 42M coordinates matching TOTAL_SUPPLY (6481 × 6481 = 42,003,361)
GRID_MIN = -3240
GRID_MAX = 3240
MAX_PLANETS_PER_SYSTEM = 10
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

# Birth (star system creation via minting)
BIRTH_PROGRAM_ID = b"agentic_birth"
BASE_BIRTH_COST = 100  # AGNTC cost for ring-1 star system

# Mining (per-block = per-turn = ~1 minute)
BASE_MINING_RATE_PER_BLOCK = 0.5     # AGNTC/block at hardness=1, full density (tune in testing)
ENERGY_PER_CLAIM = 1.0               # VPU cost per active claim

# RETIRED: replaced by epoch-based hardness system (see EpochTracker)
# INITIAL_BLOCK_TIME_S — superseded by epoch hardness
# BLOCK_TIME_GROWTH_S  — superseded by epoch hardness
# MAX_BLOCK_TIME_S     — superseded by epoch hardness
# HALVING_INTERVAL     — superseded by epoch hardness

# Epoch system — mining-driven grid expansion (replaces dynamic block time + halving)
GENESIS_EPOCH_RING = 1            # rings pre-revealed at genesis (ring 0 + ring 1)
MAX_EPOCH_HARDNESS = 100          # hardness caps here; yield floor = 1% of base
HOMENODE_BASE_ANGLE = 137.5       # golden-prime twist base angle (degrees)

# Subgrid allocation — 4 autonomous sub-cell agent types (base output at level 1, full density)
SUBGRID_SIZE = 64                   # 8x8 sub-cells per homenode inner grid
BASE_SECURE_RATE = 0.5              # AGNTC/block at level 1, hardness 1, full density
BASE_DEVELOP_RATE = 1.0             # Dev Points/block at level 1
BASE_RESEARCH_RATE = 0.5            # Research Points/block at level 1
BASE_STORAGE_RATE = 1.0             # Storage units/block at level 1
LEVEL_EXPONENT = 0.8                # output = base * level^LEVEL_EXPONENT
