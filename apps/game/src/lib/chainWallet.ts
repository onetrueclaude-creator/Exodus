/**
 * Server-side wallet identity override for the chain gateway. The gateway calls
 * this to replace any client-supplied wallet identity with the session-resolved
 * one — in the JSON body, the query string, and known user-scoped path segments.
 * This is what closes the ?wallet=N / wallet_index spoof. See B2 plan.
 */
export const WALLET_KEYS = ['wallet_index', 'sender_wallet', 'self_wallet'] as const;

// User-scoped path shapes where a segment IS the wallet index.
const WALLET_PATH_PATTERNS: Array<{ re: RegExp; build: (wi: number, m: RegExpMatchArray) => string }> = [
  { re: /^api\/resources\/\d+\/assign$/, build: (wi) => `api/resources/${wi}/assign` },
  { re: /^api\/(balance|rewards|staking|settings|vesting|secure|name|nonce)\/\d+$/, build: (wi, m) => `api/${m[1]}/${wi}` },
  { re: /^api\/vault\/(assignment|status)\/\d+$/, build: (wi, m) => `api/vault/${m[1]}/${wi}` },
];

export interface OverrideResult {
  path: string;
  search: string;
  body: unknown;
}

export function overrideWalletIdentity(
  path: string,
  search: string,
  body: unknown,
  walletIndex: number,
): OverrideResult {
  // 1. body
  let newBody = body;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const b = { ...(body as Record<string, unknown>) };
    for (const k of WALLET_KEYS) if (k in b) b[k] = walletIndex;
    newBody = b;
  }
  // 2. query
  let newSearch = search;
  if (search) {
    const qs = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    let touched = false;
    for (const k of WALLET_KEYS) if (qs.has(k)) { qs.set(k, String(walletIndex)); touched = true; }
    if (touched) newSearch = '?' + qs.toString();
  }
  // 3. path
  let newPath = path;
  for (const { re, build } of WALLET_PATH_PATTERNS) {
    const m = path.match(re);
    if (m) { newPath = build(walletIndex, m); break; }
  }
  return { path: newPath, search: newSearch, body: newBody };
}
