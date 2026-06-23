// @vitest-environment node
// apps/game/src/lib/siws.test.ts
import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { buildBindingMessage, verifyBindingSignature } from "./siws";

const toHex = (u: Uint8Array) => Buffer.from(u).toString("hex");

describe("siws binding", () => {
  it("builds a deterministic message containing the nonce + pubkey", () => {
    const m = buildBindingMessage("PUBKEY123", "nonceABC");
    expect(m).toContain("PUBKEY123");
    expect(m).toContain("nonceABC");
    expect(buildBindingMessage("PUBKEY123", "nonceABC")).toBe(m); // deterministic
  });

  it("verifies a genuine signature", () => {
    const kp = Keypair.generate();
    const pubkey = kp.publicKey.toBase58();
    const msg = buildBindingMessage(pubkey, "n1");
    const sig = nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey);
    expect(verifyBindingSignature(pubkey, msg, toHex(sig))).toBe(true);
  });

  it("rejects a tampered message, wrong key, and malformed hex", () => {
    const kp = Keypair.generate();
    const pubkey = kp.publicKey.toBase58();
    const msg = buildBindingMessage(pubkey, "n1");
    const sig = nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey);
    const sigHex = toHex(sig);

    expect(verifyBindingSignature(pubkey, msg + "x", sigHex)).toBe(false);
    expect(verifyBindingSignature(Keypair.generate().publicKey.toBase58(), msg, sigHex)).toBe(false);
    expect(verifyBindingSignature(pubkey, msg, "zz")).toBe(false);
    expect(verifyBindingSignature("not-base58!!", msg, sigHex)).toBe(false);
  });
});
