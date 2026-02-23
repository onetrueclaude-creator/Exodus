/**
 * Agentic Chain Testnet API — Data Contract
 *
 * Base URL: http://localhost:8080
 *
 * This file defines the TypeScript types matching the API responses.
 * Copy these into the frontend's types/ directory and implement
 * ChainService methods using fetch() calls to these endpoints.
 */

// GET /api/status
export interface TestnetStatus {
  state_root: string;
  record_count: number;
  total_claims: number;
  community_pool_remaining: number;
  blocks_processed: number;
  total_mined: number;
  next_block_in: number;  // seconds until next block can be mined
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
export type ClaimList = ClaimInfo[];

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

// POST /api/mine (rate-limited: 1 block per 60s)
// Returns 429 if called too early — check detail for remaining time
export interface MineResult {
  block_number: number;
  yields: Record<string, number>;
  block_time: number;              // epoch timestamp when block was mined
  next_block_at: number;           // epoch timestamp when next block is available
  verification_outcome: string;    // 'finalized' | 'rejected' | 'disputed' | 'insufficient'
  verifiers_assigned: number;      // how many agents were selected for verification
  valid_proofs: number;            // how many proofs passed
}

// GET /api/agents?user_count=3
export interface AgentInfo {
  id: string;              // "agent-000" for user agents, "slot-0003" for unclaimed
  owner: string;           // hex public key
  x: number;
  y: number;
  tier: 'sonnet' | 'haiku';
  is_user_agent: boolean;
  stake: number;
  density: number;
  storage_slots: number;
  mining_rate: number;     // energy produced per turn (0 for unclaimed)
  border_radius: number;   // 90 for sonnet, 30 for haiku
}

// POST /api/birth
export interface BirthRequest {
  wallet_index: number;
}

export interface BirthResult {
  coordinate: { x: number; y: number };
  ring: number;
  birth_cost: number;
  records_created: number;
  new_claim_count: number;
}

// POST /api/reset?wallets=50&claims=25&seed=42
export interface ResetResult {
  state_root: string;
  record_count: number;
  total_claims: number;
  message: string;
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

// POST /api/message — send agent-to-agent haiku (max 140 chars)
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

// GET /api/messages/{x}/{y} — fetch message history (max 50 most recent)
export interface MessageInfo {
  id: string;
  sender_coord: { x: number; y: number };
  text: string;
  timestamp: number;
}

// WebSocket events (ws://localhost:8080/ws)
export interface WsBlockMined {
  event: 'block_mined';
  data: {
    block_number: number;
    yields: Record<string, number>;
    verification_outcome: string;
    verifiers_assigned: number;
    valid_proofs: number;
  };
}

export interface WsAgentBorn {
  event: 'agent_born';
  data: {
    x: number;
    y: number;
    owner: string;
    ring: number;
    birth_cost: number;
  };
}

export interface WsPong {
  event: 'pong';
}

export type WsEvent = WsBlockMined | WsAgentBorn | WsPong;
