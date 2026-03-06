/**
 * Testnet API client — thin fetch wrapper over the FastAPI endpoints.
 *
 * Base URL defaults to http://localhost:8080 (the uvicorn dev server).
 * All methods return typed responses matching the Pydantic models.
 */
import type {
  TestnetStatus, CoordinateInfo, ClaimInfo,
  GridRegion, MappedGridCell, MineResult, BirthResult, ClaimNodeResult, NodeInfo,
  IntroResult, MessageResult, MessageInfo,
  RewardsResponse, VestingResponse, StakingResponse, SafeModeResponse,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_TESTNET_API ?? 'http://localhost:8080';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Testnet API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: 'POST' };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`Testnet API POST ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** GET /api/status — ledger state root, record count, mining stats */
export function getStatus(): Promise<TestnetStatus> {
  return get<TestnetStatus>('/api/status');
}

/** GET /api/coordinate/{x}/{y} — density, storage slots, claim status */
export function getCoordinate(x: number, y: number): Promise<CoordinateInfo> {
  return get<CoordinateInfo>(`/api/coordinate/${x}/${y}`);
}

/** GET /api/claims — all active claims with coordinates */
export function getClaims(): Promise<ClaimInfo[]> {
  return get<ClaimInfo[]>('/api/claims');
}

/** GET /api/grid/region — bulk region data (max 10,000 cells) */
export async function getGridRegion(
  xMin: number, xMax: number,
  yMin: number, yMax: number,
): Promise<MappedGridCell[]> {
  const region = await get<GridRegion>(
    `/api/grid/region?x_min=${xMin}&x_max=${xMax}&y_min=${yMin}&y_max=${yMax}`,
  );
  // Map snake_case wire fields to camelCase for React/Zustand consumers
  return region.cells.map(cell => ({
    x: cell.x,
    y: cell.y,
    density: cell.density,
    claimed: cell.claimed,
    owner: cell.owner,
    slotFill: cell.slot_fill,
    hasData: cell.has_data,
    maxCapacity: cell.max_capacity,
  }));
}

/** GET /api/agents — frontend-ready agent list (user agents + unclaimed slots) */
export function getAgents(userCount: number = 3): Promise<unknown[]> {
  return get<unknown[]>(`/api/agents?user_count=${userCount}`);
}

/** POST /api/mine — process one mining block (rate-limited to 60s) */
export function mineBlock(): Promise<MineResult> {
  return post<MineResult>('/api/mine');
}

/** POST /api/birth — birth a new star system by spending AGNTC */
export function birthStarSystem(walletIndex: number): Promise<BirthResult> {
  return post<BirthResult>('/api/birth', { wallet_index: walletIndex });
}

/** POST /api/claim — lightweight node claiming (no Record creation) */
export function claimNode(
  walletIndex: number,
  x?: number,
  y?: number,
  stake: number = 200,
): Promise<ClaimNodeResult> {
  return post<ClaimNodeResult>('/api/claim', {
    wallet_index: walletIndex,
    ...(x !== undefined && y !== undefined ? { x, y } : {}),
    stake,
  });
}

/** POST /api/reset — wipe ledger and rebuild from fresh genesis */
export function resetTestnet(): Promise<{ status: string }> {
  return post<{ status: string }>('/api/reset');
}

/** POST /api/intro — set agent intro message (max 140 chars) */
export function setIntro(
  walletIndex: number,
  coord: { x: number; y: number },
  message: string,
): Promise<IntroResult> {
  return post<IntroResult>('/api/intro', {
    wallet_index: walletIndex,
    agent_coordinate: coord,
    message,
  });
}

/** POST /api/message — send agent-to-agent message (max 140 chars) */
export function sendMessage(
  senderWallet: number,
  senderCoord: { x: number; y: number },
  targetCoord: { x: number; y: number },
  text: string,
): Promise<MessageResult> {
  return post<MessageResult>('/api/message', {
    sender_wallet: senderWallet,
    sender_coord: senderCoord,
    target_coord: targetCoord,
    text,
  });
}

/** GET /api/messages/{x}/{y} — fetch message history (max 50 most recent) */
export function getMessages(x: number, y: number): Promise<MessageInfo[]> {
  return get<MessageInfo[]>(`/api/messages/${x}/${y}`);
}

/** GET /api/nodes — deterministic neural nodes from chain coordinate grid */
export function getNodes(count: number = 1000, seed: number = 42): Promise<NodeInfo[]> {
  return get<NodeInfo[]>(`/api/nodes?count=${count}&seed=${seed}`);
}

/** GET /api/rewards/{wallet_index} — cumulative rewards for a wallet */
export function getRewards(walletIndex: number): Promise<RewardsResponse> {
  return get<RewardsResponse>(`/api/rewards/${walletIndex}`);
}

/** GET /api/vesting/{wallet_index} — vesting schedule info */
export function getVesting(walletIndex: number): Promise<VestingResponse> {
  return get<VestingResponse>(`/api/vesting/${walletIndex}`);
}

/** GET /api/staking/{wallet_index} — staking positions and effective stake */
export function getStaking(walletIndex: number): Promise<StakingResponse> {
  return get<StakingResponse>(`/api/staking/${walletIndex}`);
}

/** GET /api/safe-mode — verification pipeline safe mode status */
export function getSafeMode(): Promise<SafeModeResponse> {
  return get<SafeModeResponse>('/api/safe-mode');
}

/** Check if the testnet API is reachable */
export async function isTestnetOnline(): Promise<boolean> {
  try {
    await getStatus();
    return true;
  } catch {
    return false;
  }
}
