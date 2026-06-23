// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { setWriteSigner, signedPost, isOnChainRequiredError } from "./writeSigner";

const kp = Keypair.generate();

beforeEach(() => setWriteSigner(null));

describe("signedPost", () => {
  it("attaches signature, nonce, and pubkey when a signer is registered", async () => {
    setWriteSigner({
      pubkeyBase58: kp.publicKey.toBase58(),
      signMessage: async (m: Uint8Array) => nacl.sign.detached(m, kp.secretKey),
    });
    const calls: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/api/nonce/")) {
        return { ok: true, json: async () => ({ nonce: 3, owner_hex: "bb".repeat(32), chain_id: "testnet" }) };
      }
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ ok: true }) };
    }));

    await signedPost("/api/secure", "secure", { wallet_index: 1, duration_blocks: 10 });
    const sent = calls[0].body;
    expect(typeof sent.signature).toBe("string");
    expect(sent.nonce).toBe(3);
    expect(sent.pubkey).toBe(kp.publicKey.toBase58());
    expect(sent.duration_blocks).toBe(10); // original fields preserved
  });

  it("posts WITHOUT a signature when no signer is registered (dev bypass path)", async () => {
    const calls: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
      calls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });
      return { ok: true, json: async () => ({ ok: true }) };
    }));
    await signedPost("/api/secure", "secure", { wallet_index: 1, duration_blocks: 10 });
    // No sign-context fetch, no signature attached.
    expect(calls.every((c) => !String(c.url).includes("/api/nonce/"))).toBe(true);
    expect(calls[0].body.signature).toBeUndefined();
  });
});

describe("isOnChainRequiredError", () => {
  it("returns true for a 401 write-rejection error", () => {
    const err = new Error("Testnet API POST /api/secure: 401 Unauthorized");
    expect(isOnChainRequiredError(err)).toBe(true);
  });

  it("returns true for a 401 from any write path", () => {
    const err = new Error("Testnet API POST /api/vault/submit-proof: 401 Unauthorized");
    expect(isOnChainRequiredError(err)).toBe(true);
  });

  it("returns false for a non-401 error (400 bad request)", () => {
    const err = new Error("Testnet API POST /api/secure: 400 Bad Request");
    expect(isOnChainRequiredError(err)).toBe(false);
  });

  it("returns false for a 502 chain-unreachable error", () => {
    const err = new Error("Testnet API POST /api/secure: 502 Bad Gateway");
    expect(isOnChainRequiredError(err)).toBe(false);
  });

  it("returns false for non-Error values (null, string, object)", () => {
    expect(isOnChainRequiredError(null)).toBe(false);
    expect(isOnChainRequiredError("401")).toBe(false);
    expect(isOnChainRequiredError({ status: 401 })).toBe(false);
  });

  it("returns false for a GET 401 (read, not a write rejection)", () => {
    // The gateway only 401s writes; a GET 401 would be a different auth issue.
    const err = new Error("Testnet API /api/status: 401 Unauthorized");
    expect(isOnChainRequiredError(err)).toBe(false);
  });
});
