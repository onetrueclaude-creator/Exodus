const apiBase = () => process.env.TESTNET_API ?? "http://localhost:8080";

/**
 * Server-side only: register a Phantom pubkey as an account's chain
 * authorization key (decoupled-key model, spec §16.1). Calls the admin-gated
 * chain endpoint directly (bypasses the wallet-injecting /api/chain proxy).
 * Throws on any non-OK response so the caller never commits a partial bind.
 */
export async function registerSigningKey(walletIndex: number, pubkeyHex: string): Promise<void> {
  const token = process.env.CHAIN_ADMIN_TOKEN;
  if (!token) throw new Error("CHAIN_ADMIN_TOKEN not configured");
  const res = await fetch(`${apiBase()}/api/bind-signing-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": token },
    body: JSON.stringify({ wallet_index: walletIndex, signing_pubkey_hex: pubkeyHex }),
  });
  if (!res.ok) throw new Error(`chain bind failed: ${res.status}`);
}
