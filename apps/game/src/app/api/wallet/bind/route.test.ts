// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import { Keypair, PublicKey } from "@solana/web3.js";
import { buildBindingMessage } from "@/lib/siws";

const auth = vi.fn();
const findUnique = vi.fn();
const findFirst = vi.fn();
const update = vi.fn();
const aggregate = vi.fn();
const registerSigningKey = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (a: unknown) => findUnique(a),
      findFirst: (a: unknown) => findFirst(a),
      update: (a: unknown) => update(a),
      aggregate: (a: unknown) => aggregate(a),
    },
  },
}));
vi.mock("@/lib/chainAdmin", () => ({ registerSigningKey: (...a: unknown[]) => registerSigningKey(...a) }));

import { POST } from "./route";

const kp = Keypair.generate();
const pubkey = kp.publicKey.toBase58();
const nonce = "nonce-xyz";
const goodSigHex = Buffer.from(
  nacl.sign.detached(new TextEncoder().encode(buildBindingMessage(pubkey, nonce)), kp.secretKey),
).toString("hex");

const makeReq = (body: unknown) =>
  new Request("http://localhost/api/wallet/bind", { method: "POST", body: JSON.stringify(body) });

const future = () => new Date(Date.now() + 60_000);

beforeEach(() => {
  [auth, findUnique, findFirst, update, aggregate, registerSigningKey].forEach((m) => m.mockReset());
  auth.mockResolvedValue({ user: { id: "u1" } });
  findUnique.mockResolvedValue({
    id: "u1", walletBindingNonce: nonce, walletBindingExpires: future(),
    phantomWalletPubkey: null, chainWalletIndex: null,
  });
  findFirst.mockResolvedValue(null);     // pubkey not bound elsewhere
  update.mockResolvedValue({});
  aggregate.mockResolvedValue({ _max: { chainWalletIndex: 1 } });
  registerSigningKey.mockResolvedValue(undefined);
});

describe("POST /api/wallet/bind", () => {
  it("binds on a valid signature: assigns index, registers key, sets pubkey, clears nonce", async () => {
    const res = await POST(makeReq({ pubkey, signature: goodSigHex }));
    expect(res.status).toBe(200);
    expect((await res.json()).isOnChain).toBe(true);

    // Corrected assertions (per brief §Step 3 note): two separate checks
    expect(registerSigningKey).toHaveBeenCalledWith(2, expect.any(String));
    const pkHex = Buffer.from(new PublicKey(pubkey).toBytes()).toString("hex");
    expect(registerSigningKey).toHaveBeenCalledWith(2, pkHex);

    const data = update.mock.calls.at(-1)![0].data;
    expect(data.phantomWalletPubkey).toBe(pubkey);
    expect(data.walletBoundAt).toBeInstanceOf(Date);
    expect(data.walletBindingNonce).toBeNull();
  });

  it("401s when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    expect((await POST(makeReq({ pubkey, signature: goodSigHex }))).status).toBe(401);
  });

  it("400s on a missing/expired challenge", async () => {
    findUnique.mockResolvedValue({ id: "u1", walletBindingNonce: null, walletBindingExpires: null });
    expect((await POST(makeReq({ pubkey, signature: goodSigHex }))).status).toBe(400);

    findUnique.mockResolvedValue({ id: "u1", walletBindingNonce: nonce, walletBindingExpires: new Date(Date.now() - 1000) });
    expect((await POST(makeReq({ pubkey, signature: goodSigHex }))).status).toBe(400);
  });

  it("401s on a bad signature", async () => {
    expect((await POST(makeReq({ pubkey, signature: "00".repeat(64) }))).status).toBe(401);
  });

  it("409s when the pubkey is already bound to another account", async () => {
    findFirst.mockResolvedValue({ id: "other" });
    expect((await POST(makeReq({ pubkey, signature: goodSigHex }))).status).toBe(409);
  });

  it("502s and does NOT set pubkey when the chain registration fails", async () => {
    registerSigningKey.mockRejectedValue(new Error("chain down"));
    const res = await POST(makeReq({ pubkey, signature: goodSigHex }));
    expect(res.status).toBe(502);
    // The no-partial-commit invariant: no update call may carry phantomWalletPubkey
    const setPubkeyCall = update.mock.calls.find((c) => c[0].data?.phantomWalletPubkey);
    expect(setPubkeyCall).toBeUndefined();
  });

  it("assigns FIRST_PLAYER_INDEX (2) when no users have a slot yet", async () => {
    // Simulate a fresh chain: aggregate returns null max, user has no index
    aggregate.mockResolvedValue({ _max: { chainWalletIndex: null } });
    findUnique.mockResolvedValue({
      id: "u1", walletBindingNonce: nonce, walletBindingExpires: future(),
      phantomWalletPubkey: null, chainWalletIndex: null,
    });

    const res = await POST(makeReq({ pubkey, signature: goodSigHex }));
    expect(res.status).toBe(200);

    // Slot-assignment update must have used chainWalletIndex: 2
    const slotCall = update.mock.calls.find((c) => c[0].data?.chainWalletIndex != null);
    expect(slotCall).toBeDefined();
    expect(slotCall![0].data.chainWalletIndex).toBe(2);

    // Response must reflect the assigned index
    const body = await res.json();
    expect(body.chainWalletIndex).toBe(2);
  });
});
