import { describe, it, expect, vi, beforeEach } from "vitest";
const auth = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: {
  findUnique: (a: unknown) => findUnique(a), update: (a: unknown) => update(a),
} } }));
import { POST } from "./route";
const req = (b: unknown) => new Request("http://localhost/api/tier", { method: "POST", body: JSON.stringify(b) });

beforeEach(() => {
  [auth, findUnique, update].forEach((m) => m.mockReset());
  auth.mockResolvedValue({ user: { id: "u1" } });
  findUnique.mockResolvedValue({ id: "u1", subscription: "COMMUNITY" });
  update.mockResolvedValue({});
});

describe("POST /api/tier", () => {
  it("401 unauth", async () => { auth.mockResolvedValue(null); expect((await POST(req({ tier: "PROFESSIONAL" }))).status).toBe(401); });
  it("400 invalid tier", async () => { expect((await POST(req({ tier: "MAX" }))).status).toBe(400); });
  it("409 when not yet subscribed", async () => {
    findUnique.mockResolvedValue({ id: "u1", subscription: null });
    expect((await POST(req({ tier: "PROFESSIONAL" }))).status).toBe(409);
  });
  it("changes COMMUNITY → PROFESSIONAL; persists subscription; no coord change", async () => {
    const res = await POST(req({ tier: "PROFESSIONAL" }));
    expect(res.status).toBe(200);
    expect((await res.json()).subscription).toBe("PROFESSIONAL");
    const data = update.mock.calls.at(-1)![0].data;
    expect(data.subscription).toBe("PROFESSIONAL");
    expect(data).not.toHaveProperty("blockchainTokenX");
  });
});
