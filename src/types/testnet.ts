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
}
