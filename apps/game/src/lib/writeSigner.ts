// apps/game/src/lib/writeSigner.ts
import { canonicalMessage } from "@/lib/canonicalSign";

export interface WriteSigner {
  pubkeyBase58: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

let _signer: WriteSigner | null = null;
/** Registered by WalletSignerBridge (React) so this plain module can sign. */
export function setWriteSigner(s: WriteSigner | null) { _signer = s; }

const BASE_URL = "/api/chain";
const toHex = (u: Uint8Array) =>
  Array.from(u).map((b) => b.toString(16).padStart(2, "0")).join("");

async function fetchSignContext(): Promise<{ nonce: number; owner_hex: string; chain_id: string }> {
  // The gateway rewrites the index to the session wallet (any value works here).
  const res = await fetch(`${BASE_URL}/api/nonce/0`);
  if (!res.ok) throw new Error(`sign-context failed: ${res.status}`);
  return res.json();
}

/**
 * POST a chain write through the gateway, Phantom-signing it when a wallet is
 * connected. With no signer (dev Founder / no Phantom), posts unsigned — the
 * chain's dev bypass accepts it. `action` must match the chain's verify_write
 * action string; `body` is the raw request body (wallet-index keys are stripped
 * from the signed message by canonicalMessage, but stay in the body for the gateway).
 */
export async function signedPost<T>(path: string, action: string, body: Record<string, unknown>): Promise<T> {
  let finalBody = body;
  if (_signer) {
    const { nonce, owner_hex, chain_id } = await fetchSignContext();
    const msg = canonicalMessage(action, body, owner_hex, nonce, chain_id);
    const sig = await _signer.signMessage(msg);
    finalBody = { ...body, signature: toHex(sig), nonce, pubkey: _signer.pubkeyBase58 };
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalBody),
  });
  if (!res.ok) throw new Error(`Testnet API POST ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}
