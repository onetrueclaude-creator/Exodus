/**
 * walletIndex — resolve the player's testnet wallet index.
 *
 * The chain addresses participants by an integer wallet index (it holds a fixed
 * genesis wallet array). Until a real user→wallet mapping ships (later
 * milestone), the game drives a single index, defaulting to 0.
 *
 * A dev override lets a second browser drive a different node during a playtest:
 *   - `?wallet=N` query param (highest priority — per-tab, no reload of env), or
 *   - `NEXT_PUBLIC_WALLET_INDEX` env (build/deploy default).
 *
 * Resolution is defensive: anything non-finite or negative falls back to 0.
 */

const DEFAULT_WALLET_INDEX = 0;

function coerce(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

/**
 * The active wallet index for chain calls.
 *
 * `?wallet=N` (browser only) overrides `NEXT_PUBLIC_WALLET_INDEX`, which
 * overrides the default of 0. SSR-safe: when `window` is absent only the env
 * default is consulted.
 */
export function getWalletIndex(): number {
  if (typeof window !== "undefined") {
    try {
      const fromQuery = coerce(new URLSearchParams(window.location.search).get("wallet"));
      if (fromQuery !== null) return fromQuery;
    } catch {
      // location/search unavailable — fall through to env/default.
    }
  }
  const fromEnv = coerce(process.env.NEXT_PUBLIC_WALLET_INDEX);
  if (fromEnv !== null) return fromEnv;
  return DEFAULT_WALLET_INDEX;
}
