// apps/game/src/lib/siws.ts
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

/**
 * The exact off-chain message a user signs with Phantom to prove wallet
 * ownership during binding (design spec §16.4). Deterministic in (pubkey,
 * nonce) so the gateway reconstructs identical bytes server-side — never
 * trusting a client-sent message.
 */
export function buildBindingMessage(pubkeyBase58: string, nonce: string): string {
  return (
    "zkagentic.network — bind wallet\n" +
    `Wallet: ${pubkeyBase58}\n` +
    `Nonce: ${nonce}\n` +
    "(off-chain signature; no gas, no transaction)"
  );
}

/** Verify an ed25519 signature (hex) over `message` for `pubkeyBase58`. */
export function verifyBindingSignature(
  pubkeyBase58: string,
  message: string,
  signatureHex: string,
): boolean {
  try {
    const pub = new PublicKey(pubkeyBase58).toBytes();
    const sig = Uint8Array.from(Buffer.from(signatureHex, "hex"));
    if (sig.length !== 64) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pub);
  } catch {
    return false; // malformed pubkey/sig → not a valid signature
  }
}
