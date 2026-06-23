import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = vi.fn();
const update = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: (a: unknown) => update(a) } } }));

import { POST } from "./route";

const makeReq = (body: unknown) =>
  new Request("http://localhost/api/wallet/challenge", {
    method: "POST", body: JSON.stringify(body),
  });

beforeEach(() => { auth.mockReset(); update.mockReset(); update.mockResolvedValue({}); });

describe("POST /api/wallet/challenge", () => {
  it("401s when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await POST(makeReq({ pubkey: "P" }));
    expect(res.status).toBe(401);
  });

  it("issues a message containing a fresh nonce + persists nonce/expiry", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(makeReq({ pubkey: "PUBKEY" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("PUBKEY");
    expect(json.message).toContain(json.nonce);

    const arg = update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "u1" });
    expect(arg.data.walletBindingNonce).toBe(json.nonce);
    expect(arg.data.walletBindingExpires).toBeInstanceOf(Date);
    expect(arg.data.walletBindingPubkey).toBe("PUBKEY");
  });

  it("400s when pubkey missing", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });
});
