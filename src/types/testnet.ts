/**
 * Agentic Chain Testnet API — Data Contract
 *
 * Base URL: http://localhost:8080
 * These types match the FastAPI Pydantic models exactly.
 */

/**
 * Grid bounds — dynamic in v2.
 * These defaults cover the genesis ring. Actual bounds come from
 * the epoch state in /api/status or /api/epoch.
 */
export const CHAIN_GRID_DEFAULT_RADIUS = 20; // genesis ring + fog
export const CHAIN_GRID_MIN = -CHAIN_GRID_DEFAULT_RADIUS;
export const CHAIN_GRID_MAX = CHAIN_GRID_DEFAULT_RADIUS;
export const CHAIN_GRID_SPAN = CHAIN_GRID_MAX - CHAIN_GRID_MIN;

// GET /api/status
export interface TestnetStatus {
  state_root: string;
  record_count: number;
  total_claims: number;
  blocks_processed: number;
  total_mined: number;
  next_block_in: number;
  epoch_ring: number;
  // Economics (v2)
  hardness: number;
  circulating_supply: number;
  burned_fees: number;
}

// GET /api/coordinate/{x}/{y}
export interface CoordinateInfo {
  x: number;
  y: number;
  density: number;
  storage_slots: number;
  claimed: boolean;
  owner: string | null;
  stake: number | null;
}

// GET /api/claims
export interface ClaimInfo {
  x: number;
  y: number;
  owner: string;
  stake: number;
  density: number;
  storage_slots: number;
}

// GET /api/grid/region?x_min=&x_max=&y_min=&y_max=
export interface GridRegion {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  cells: GridCell[];
}

// Wire format from Python API
export interface GridCell {
  x: number;
  y: number;
  density: number;
  claimed: boolean;
  owner: string | null;
  slot_fill: number;
  has_data: boolean;
  max_capacity: number;
}

// Camelcase-converted version used by React/Zustand consumers (output of getGridRegion mapping)
export interface MappedGridCell {
  x: number;
  y: number;
  density: number;
  claimed: boolean;
  owner: string | null;
  slotFill: number;
  hasData: boolean;
  maxCapacity: number;
}

// POST /api/mine
export interface MineResult {
  block_number: number;
  yields: Record<string, number>;
  block_time: number;
  next_block_at: number;
  verification_outcome: string;
  verifiers_assigned: number;
  valid_proofs: number;
}

// POST /api/birth
export interface BirthResult {
  coordinate: { x: number; y: number };
  ring: number;
  birth_cost: number;
  records_created: number;
  new_claim_count: number;
}

// POST /api/intro — set agent intro message (max 140 chars)
export interface IntroRequest {
  wallet_index: number;
  agent_coordinate: { x: number; y: number };
  message: string;
}

export interface IntroResult {
  status: string;
  message: string;
}

// POST /api/message — send agent-to-agent message (max 140 chars)
export interface MessageRequest {
  sender_wallet: number;
  sender_coord: { x: number; y: number };
  target_coord: { x: number; y: number };
  text: string;
}

export interface MessageResult {
  id: string;
  timestamp: number;
  text: string;
  sender_coord: { x: number; y: number };
  target_coord: { x: number; y: number };
}

// POST /api/claim — lightweight node claiming
export interface ClaimNodeRequest {
  wallet_index: number;
  x?: number;
  y?: number;
  stake?: number;
}

export interface ClaimNodeResult {
  coordinate: { x: number; y: number };
  stake: number;
  density: number;
  storage_slots: number;
  validator_id: number;
  message: string;
}

// GET /api/nodes — deterministic neural nodes from chain coordinate grid
export interface NodeInfo {
  id: string;
  x: number;
  y: number;
  name: string;
  density: number;
  storage_slots: number;
  claimed: boolean;
  owner: string | null;
  stake: number | null;
}

// GET /api/messages/{x}/{y} — fetch message history (max 50 most recent)
export interface MessageInfo {
  id: string;
  sender_coord: { x: number; y: number };
  text: string;
  timestamp: number;
}

// GET /api/rewards/{wallet_index}
export interface RewardsResponse {
  wallet_index: number;
  agntc_earned: number;
  dev_points: number;
  research_points: number;
  storage_units: number;
  secured_chains: number;
}

// GET /api/vesting/{wallet_index}
export interface VestingResponse {
  faction: string;
  total_allocation: number;
  vested: number;
  locked: number;
  next_unlock_month: number;
  immediate_pct: number;
  vest_days: number;
}

// GET /api/staking/{wallet_index}
export interface StakingResponse {
  wallet_index: number;
  token_staked: number;
  cpu_staked: number;
  effective_stake: number;
  positions: Array<{
    validator_id: number;
    amount: number;
    status: string;
    start_epoch: number;
  }>;
  status: string;
}

// GET /api/safe-mode
export interface SafeModeResponse {
  is_active: boolean;
  online_ratio: number;
  threshold: number;
  recovery_target: number;
}
