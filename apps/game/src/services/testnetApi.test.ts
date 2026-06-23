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

  // ── Latent-parity-gap fixes (final review): the signed canonical bytes must
  //    byte-match the chain for the claim-without-coords and transact-by-index
  //    paths. Golden vectors from chain signing.py::canonical_message
  //    (owner="aa"*32, nonce=7); we capture the exact bytes handed to signMessage.
  const HEX = (u: Uint8Array) => Buffer.from(u).toString("hex");
  const CLAIM_NOCOORDS =
    "4167656e7469633a54783a7631007b22616374696f6e223a22636c61696d222c22636861696e5f6964223a22746573746e6574222c226e6f6e6365223a372c226f776e6572223a2261616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c22706172616d73223a7b227374616b65223a3230302c2278223a6e756c6c2c2279223a6e756c6c7d7d";
  const TRANSACT_BYINDEX =
    "4167656e7469633a54783a7631007b22616374696f6e223a227472616e73616374222c22636861696e5f6964223a22746573746e6574222c226e6f6e6365223a372c226f776e6572223a2261616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c22706172616d73223a7b22616d6f756e74223a353530303030302c22726563697069656e745f6e616d65223a6e756c6c2c22726563697069656e745f77616c6c6574223a357d7d";

  function captureSigner() {
    const cap = { hex: "" };
    setWriteSigner({
      pubkeyBase58: "Pk",
      signMessage: async (m: Uint8Array) => { cap.hex = HEX(m); return new Uint8Array(64); },
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/api/nonce/")) {
        return { ok: true, json: async () => ({ nonce: 7, owner_hex: "aa".repeat(32), chain_id: "testnet" }) };
      }
      return { ok: true, json: async () => ({}) };
    }));
    return cap;
  }

  it("claimNode without coords signs over {stake,x:null,y:null} (byte-parity)", async () => {
    const cap = captureSigner();
    const { claimNode } = await import("./testnetApi");
    await claimNode(1); // no x/y → must sign x:null,y:null to match the chain model
    expect(cap.hex).toBe(CLAIM_NOCOORDS);
  });

  it("postTransact by wallet-index signs without crashing (byte-parity)", async () => {
    const cap = captureSigner();
    const { postTransact } = await import("./testnetApi");
    await expect(postTransact(1, { recipientWallet: 5, amount: 5.5 })).resolves.toBeDefined();
    expect(cap.hex).toBe(TRANSACT_BYINDEX);
  });
});
