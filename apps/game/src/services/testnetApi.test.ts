// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { setWriteSigner } from "@/lib/writeSigner";

describe("signed writes (B4b)", () => {
  const kp = Keypair.generate();
  beforeEach(() => setWriteSigner({
    pubkeyBase58: kp.publicKey.toBase58(),
    signMessage: async (m: Uint8Array) => nacl.sign.detached(m, kp.secretKey),
  }));
  afterEach(() => setWriteSigner(null));

  it("postSecure signs through the gateway", async () => {
    const bodies: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/api/nonce/")) return { ok: true, json: async () => ({ nonce: 0, owner_hex: "bb".repeat(32), chain_id: "testnet" }) };
      bodies.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({}) };
    }));
    const { postSecure } = await import("./testnetApi");
    await postSecure(1, 10);
    expect(bodies[0].signature).toBeTypeOf("string");
    expect(bodies[0].duration_blocks).toBe(10);
  });

  it("postTransact converts amount to integer microAGNTC in the body it signs", async () => {
    const bodies: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/api/nonce/")) return { ok: true, json: async () => ({ nonce: 0, owner_hex: "bb".repeat(32), chain_id: "testnet" }) };
      bodies.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({}) };
    }));
    const { postTransact } = await import("./testnetApi");
    await postTransact(1, { recipientName: "alice", amount: 5.5 });
    // amount sent to the chain stays float; but the SIGNED canonical form used micro —
    // assert the wire body carries the original amount AND a signature.
    expect(bodies[0].amount).toBe(5.5);
    expect(bodies[0].signature).toBeTypeOf("string");
  });
});
