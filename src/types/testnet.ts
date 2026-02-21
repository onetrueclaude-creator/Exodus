/**
 * Agentic Chain Testnet API — Data Contract
 *
 * Base URL: http://localhost:8080
 * These types match the FastAPI Pydantic models exactly.
 */

/** Grid bounds on the blockchain (6481 × 6481 = ~42M coordinates) */
export const CHAIN_GRID_MIN = -3240;
export const CHAIN_GRID_MAX = 3240;
export const CHAIN_GRID_SPAN = CHAIN_GRID_MAX - CHAIN_GRID_MIN; // 6480

// GET /api/status
export interface TestnetStatus {
  state_root: string;
  record_count: number;
  total_claims: number;
  community_pool_remaining: number;
  blocks_processed: number;
  total_mined: number;
  next_block_in: number;
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

export interface GridCell {
  x: number;
  y: number;
  density: number;
  claimed: boolean;
  owner: string | null;
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
