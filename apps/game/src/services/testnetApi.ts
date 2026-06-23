/**
 * Testnet API client — thin fetch wrapper over the FastAPI endpoints.
 *
 * Base URL defaults to http://localhost:8080 (the uvicorn dev server).
 * All methods return typed responses matching the Pydantic models.
 */
import type {
  TestnetStatus, CoordinateInfo, ClaimInfo, AgentInfo,
  GridRegion, MineResult, BirthResult, ClaimNodeResult, NodeInfo,
  IntroResult, MessageResult, MessageInfo,
  SecureResponse, SecuringStatusResponse, TransactResponse,
  WalletSettingsResponse, EpochStatus, RewardsResponse, BalanceResponse, VestingResponse,
  VaultRootResponse, VaultAssignmentResponse, VaultShardResponse,
  VaultChallengeResponse, VaultSubmitProofRequest, VaultSubmitProofResponse,
  VaultStatusResponse,
} from '@/types';
import { signedPost } from '@/lib/writeSigner';

// Same-origin gateway (B2): the browser never holds the chain URL. The
// /api/chain/[...path] proxy authenticates and injects the server-resolved wallet.
const BASE_URL = '/api/chain';

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
export function getGridRegion(
  xMin: number, xMax: number,
  yMin: number, yMax: number,
): Promise<GridRegion> {
  return get<GridRegion>(
    `/api/grid/region?x_min=${xMin}&x_max=${xMax}&y_min=${yMin}&y_max=${yMax}`,
  );
}

/** GET /api/agents — frontend-ready agent list (user agents + unclaimed slots) */
export function getAgents(userCount: number = 3, selfWallet?: number): Promise<AgentInfo[]> {
  const self = selfWallet !== undefined && selfWallet >= 0 ? `&self_wallet=${selfWallet}` : '';
  return get<AgentInfo[]>(`/api/agents?user_count=${userCount}${self}`);
}

/** POST /api/name — set a wallet's human owner-name (unique, validated) */
export function setOwnerName(
  walletIndex: number,
  name: string,
): Promise<{ wallet_index: number; name: string; success: boolean }> {
  return signedPost<{ wallet_index: number; name: string; success: boolean }>(
    '/api/name',
    'set_name',
    { wallet_index: walletIndex, name },
  );
}

/** GET /api/name/{wallet_index} — a wallet's current owner-name */
export function getOwnerName(
  walletIndex: number,
): Promise<{ wallet_index: number; name: string }> {
  return get<{ wallet_index: number; name: string }>(`/api/name/${walletIndex}`);
}

/** POST /api/mine — process one mining block (rate-limited to 60s) */
export function mineBlock(): Promise<MineResult> {
  return post<MineResult>('/api/mine');
}

/** POST /api/birth — birth a new star system by spending AGNTC */
export function birthNode(walletIndex: number): Promise<BirthResult> {
  return signedPost<BirthResult>('/api/birth', 'birth', { wallet_index: walletIndex });
}

/** POST /api/claim — lightweight node claiming (no Record creation) */
export function claimNode(
  walletIndex: number,
  x?: number,
  y?: number,
  stake: number = 200,
): Promise<ClaimNodeResult> {
  return signedPost<ClaimNodeResult>('/api/claim', 'claim', {
    wallet_index: walletIndex,
    // Always send x/y (null when absent) so the signed canonical message matches
    // the chain's model_dump (ClaimNodeRequest x/y default None → emits null). (B4b parity)
    x: x ?? null,
    y: y ?? null,
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
  return signedPost<IntroResult>('/api/intro', 'intro', {
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
  return signedPost<MessageResult>('/api/message', 'message', {
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

/** GET /api/balance/{wallet_index} — real spendable AGNTC balance.
 *
 * Returns `spendable_micro_agntc` (microAGNTC, the live ledger sum of unspent
 * record values). Divide by 1e6 for the AGNTC display unit. */
export function getWalletBalance(walletIndex: number): Promise<BalanceResponse> {
  return get<BalanceResponse>(`/api/balance/${walletIndex}`);
}

/** GET /api/staking/{wallet_index} — staking positions and effective stake */
export function getStaking(walletIndex: number): Promise<{
  token_staked: number; cpu_staked: number; effective_stake: number;
}> {
  return get<{
    token_staked: number; cpu_staked: number; effective_stake: number;
  }>(`/api/staking/${walletIndex}`);
}

/** POST /api/resources/{wallet_index}/assign — allocate subgrid cells */
export function assignSubgrid(walletIndex: number, allocation: {
  secure: number; develop: number; research: number; storage: number;
}): Promise<{ status: string; free_cells: number }> {
  return signedPost<{ status: string; free_cells: number }>(
    `/api/resources/${walletIndex}/assign`,
    'subgrid_assign',
    allocation,
  );
}

/** POST /api/secure — commit CPU Energy for N block cycles */
export function postSecure(walletIndex: number, durationBlocks: number): Promise<SecureResponse> {
  return signedPost<SecureResponse>('/api/secure', 'secure', { wallet_index: walletIndex, duration_blocks: durationBlocks });
}

/** GET /api/secure/{wallet_index} — securing positions for a wallet */
export function getSecuringStatus(walletIndex: number): Promise<SecuringStatusResponse> {
  return get<SecuringStatusResponse>(`/api/secure/${walletIndex}`);
}

/** POST /api/transact — AGNTC wallet-to-wallet transfer.
 *
 * The recipient may be given by explicit wallet index OR by owner-name
 * (case-insensitive, resolved server-side). Exactly one should be supplied.
 *
 * The wire body carries `amount` as a float (chain logic uses it directly).
 * The signed canonical form uses integer microAGNTC (parity with the chain's
 * `_transact_signed_params`) and includes `recipient_wallet: null` when absent
 * so the signed bytes match the chain's model_dump output. */
export function postTransact(
  senderWallet: number,
  opts: { recipientWallet?: number; recipientName?: string; amount: number },
): Promise<TransactResponse> {
  const wire = {
    sender_wallet: senderWallet,
    recipient_wallet: opts.recipientWallet,
    recipient_name: opts.recipientName,
    amount: opts.amount,                     // float on the wire (chain logic uses it)
  };
  // Sign over the micro-canonicalized amount (parity with chain _transact_signed_params).
  // recipient_name/_wallet use `?? null` so the by-INDEX path (no name) doesn't leave
  // `undefined` in the signed body (canonicalJSON throws on undefined) and matches the
  // chain's model_dump (which emits null for the absent field). (B4b parity)
  return signedPost<TransactResponse>('/api/transact', 'transact', wire, {
    ...wire, amount: Math.round(opts.amount * 1_000_000),
    recipient_wallet: opts.recipientWallet ?? null,
    recipient_name: opts.recipientName ?? null,
  });
}

/** GET /api/transactions — recent player↔player AGNTC transfers (for tx edges).
 *
 * `from`/`to` are owner pubkey hex; the renderer maps them to on-screen nodes. */
export function getTransactions(): Promise<{
  transactions: Array<{ from: string; to: string; from_name: string; to_name: string; amount: number; block: number }>;
}> {
  return get<{
    transactions: Array<{ from: string; to: string; from_name: string; to_name: string; amount: number; block: number }>;
  }>('/api/transactions');
}

/** GET /api/settings/{wallet_index} — per-wallet network parameters */
export function getSettings(walletIndex: number): Promise<WalletSettingsResponse> {
  return get<WalletSettingsResponse>(`/api/settings/${walletIndex}`);
}

/** GET /api/epoch — epoch ring expansion state */
export function getEpoch(): Promise<EpochStatus> {
  return get<EpochStatus>('/api/epoch');
}

/** GET /api/vesting/{wallet_index} — vesting schedule */
export function getVesting(walletIndex: number): Promise<VestingResponse> {
  return get<VestingResponse>(`/api/vesting/${walletIndex}`);
}

// ── Proof-of-Vault (PoAW gate) endpoints ────────────────────────────────────

/** GET /api/vault/root — vault Merkle-DAG root CID + sizing */
export function getVaultRoot(): Promise<VaultRootResponse> {
  return get<VaultRootResponse>('/api/vault/root');
}

/** GET /api/vault/assignment/{wallet_index} — shards this wallet is responsible for */
export function getVaultAssignment(walletIndex: number): Promise<VaultAssignmentResponse> {
  return get<VaultAssignmentResponse>(`/api/vault/assignment/${walletIndex}`);
}

/** GET /api/vault/shard/{shard_id}?wallet_index=N — canonical sub-units (hex) to prove over */
export function getVaultShard(shardId: number, walletIndex: number): Promise<VaultShardResponse> {
  return get<VaultShardResponse>(`/api/vault/shard/${shardId}?wallet_index=${walletIndex}`);
}

/** POST /api/vault/challenge — fresh per-block sampled-PDP challenge for a shard */
export function getVaultChallenge(walletIndex: number, shardId: number): Promise<VaultChallengeResponse> {
  return signedPost<VaultChallengeResponse>('/api/vault/challenge', 'vault_challenge', {
    wallet_index: walletIndex,
    shard_id: shardId,
  });
}

/** POST /api/vault/submit-proof — submit a possession proof through the Singularity gate */
export function submitVaultProof(req: VaultSubmitProofRequest): Promise<VaultSubmitProofResponse> {
  return signedPost<VaultSubmitProofResponse>('/api/vault/submit-proof', 'vault_submit_proof', req as unknown as Record<string, unknown>);
}

/** GET /api/vault/status/{wallet_index} — securing history for a wallet */
export function getVaultStatus(walletIndex: number): Promise<VaultStatusResponse> {
  return get<VaultStatusResponse>(`/api/vault/status/${walletIndex}`);
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
