/**
 * Testnet API client — thin fetch wrapper over the FastAPI endpoints.
 *
 * Base URL defaults to http://localhost:8080 (the uvicorn dev server).
 * All methods return typed responses matching the Pydantic models.
 */
import type {
  TestnetStatus, CoordinateInfo, ClaimInfo,
  GridRegion, MineResult,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_TESTNET_API ?? 'http://localhost:8080';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Testnet API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST' });
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
export function getGridRegion(
  xMin: number, xMax: number,
  yMin: number, yMax: number,
): Promise<GridRegion> {
  return get<GridRegion>(
    `/api/grid/region?x_min=${xMin}&x_max=${xMax}&y_min=${yMin}&y_max=${yMax}`,
  );
}

/** GET /api/agents — frontend-ready agent list (user agents + unclaimed slots) */
export function getAgents(userCount: number = 3): Promise<unknown[]> {
  return get<unknown[]>(`/api/agents?user_count=${userCount}`);
}

/** POST /api/mine — process one mining block (rate-limited to 60s) */
export function mineBlock(): Promise<MineResult> {
  return post<MineResult>('/api/mine');
}

/** POST /api/reset — wipe ledger and rebuild from fresh genesis */
export function resetTestnet(): Promise<{ status: string }> {
  return post<{ status: string }>('/api/reset');
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
