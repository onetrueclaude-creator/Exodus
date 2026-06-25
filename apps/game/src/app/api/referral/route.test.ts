import { describe, it, expect, vi, beforeEach } from "vitest";

const session = { user: { id: "referee1", email: "r@b.com" } };
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => session) }));

const { db } = vi.hoisted(() => {
  const db = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    referral: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
  };
  return { db };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ id: "referee1", referralCode: null, kycVerifiedAt: null });
  db.user.update.mockResolvedValue({ referralCode: "abc123" });
  db.referral.count.mockResolvedValue(0);
  db.referral.findUnique.mockResolvedValue(null);
  db.referral.create.mockResolvedValue({ id: "ref1" });
});

describe("GET /api/referral", () => {
  it("lazily mints a code and reports kyc status", async () => {
    const res = await GET();
    const body = await res.json();
    expect(typeof body.code).toBe("string");
    expect(body.kycVerified).toBe(false);
    // the mint path actually persisted a code (not a stale null)
    expect(db.user.update).toHaveBeenCalledOnce();
  });
});

describe("POST /api/referral", () => {
  it("rejects a self-referral", async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: "referee1" }); // owner of the code is the same user
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ code: "selfcode" }) }));
    expect(res.status).toBe(400);
  });

  it("rejects when the referee already has a referral edge", async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: "referrerX" }); // code owner
    db.referral.findUnique.mockResolvedValueOnce({ id: "existing" }); // referee already referred
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ code: "abc123" }) }));
    expect(res.status).toBe(409);
  });

  it("records a single-level referral edge", async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: "referrerX" }); // code owner
    db.referral.findUnique.mockResolvedValueOnce(null);
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ code: "abc123" }) }));
    expect(res.status).toBe(200);
    expect(db.referral.create).toHaveBeenCalledOnce();
    const arg = db.referral.create.mock.calls[0][0].data;
    expect(arg.referrerId).toBe("referrerX");
    expect(arg.refereeId).toBe("referee1");
  });

  it("maps a P2002 race (pre-check passed, unique constraint fired) to 409, never 500", async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: "referrerX" }); // code owner
    db.referral.findUnique.mockResolvedValueOnce(null); // pre-check sees no edge
    db.referral.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ code: "abc123" }) }));
    expect(res.status).toBe(409);
  });
});
