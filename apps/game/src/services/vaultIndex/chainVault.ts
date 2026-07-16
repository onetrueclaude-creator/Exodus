// Server-only client for the chain's S4 vault surfaces. Same trust boundary
// as the /api/chain/[...path] gateway (design §5.4): identity is resolved
// server-side and the service token NEVER reaches a browser. Do not import
// from client components.
export interface ChainEntryResult { cid: string; block: number; shard_id: number; vault_root: string }

export interface ChainEntryListItem {
  cid: string; vault_root: string; block: number; shard_id: number;
  entry: {
    v: number; kind: string; text: string; visibility: string;
    owner_hex: string; author: string; origin: string;
    meta: Record<string, unknown>; created_block: number;
  };
}

export class ChainWriteError extends Error {
  constructor(public status: number, msg: string) { super(msg); this.name = 'ChainWriteError'; }
}

const apiBase = () => process.env.TESTNET_API ?? 'http://localhost:8080';
const svcHeaders = () => {
  const t = process.env.VAULT_SERVICE_TOKEN;
  if (!t) throw new Error('VAULT_SERVICE_TOKEN not set');
  return { 'X-Service-Token': t, 'Content-Type': 'application/json' };
};

export async function postVaultEntry(e: {
  kind: string; text: string; visibility: string; owner_hex: string;
  author: string; origin: string; meta: Record<string, unknown>;
}): Promise<ChainEntryResult> {
  const res = await fetch(`${apiBase()}/api/vault/entry`, {
    method: 'POST', headers: svcHeaders(), body: JSON.stringify(e),
  });
  if (!res.ok) {
    let detail = `chain /api/vault/entry → ${res.status}`;
    try { detail = String((await res.json()).detail ?? detail); } catch { /* keep default */ }
    throw new ChainWriteError(res.status, detail);
  }
  return res.json() as Promise<ChainEntryResult>;
}

export async function listVaultEntries(offset: number, limit: number):
    Promise<{ total: number; offset: number; entries: ChainEntryListItem[] }> {
  const res = await fetch(
    `${apiBase()}/api/vault/entries?offset=${offset}&limit=${limit}`,
    { headers: svcHeaders() });
  if (!res.ok) throw new ChainWriteError(res.status, `chain /api/vault/entries → ${res.status}`);
  return res.json();
}

export async function getAuditSummary():
    Promise<{ block: number; beacon_stale: boolean; shards: Record<string, number | null> }> {
  const res = await fetch(`${apiBase()}/api/vault/audit-summary`);
  if (!res.ok) throw new ChainWriteError(res.status, `chain /api/vault/audit-summary → ${res.status}`);
  return res.json();
}
