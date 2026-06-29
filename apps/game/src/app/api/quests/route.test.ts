import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth + prisma before importing the route.
// db is declared via vi.hoisted so it is available inside the vi.mock factory
// (vi.mock calls are hoisted to the top of the file by vitest).
const { db } = vi.hoisted(() => {
  const db = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    questCompletion: { findMany: vi.fn(), create: vi.fn() },
    scoreLedgerEntry: { create: vi.fn() },
    // interactive transaction: run the callback with the same delegate mocks as tx
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
  };
  return { db };
});

const session = { user: { id: "u1", email: "a@b.com" } };
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => session) }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET, POST } from "./route";

const post = (key: string) =>
  POST(new Request("http://x/api/quests", { method: "POST", body: JSON.stringify({ key }) }));

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ currentStreak: 0, lastCheckInAt: null, longestStreak: 0 });
  db.questCompletion.findMany.mockResolvedValue([]);
  db.questCompletion.create.mockResolvedValue({ id: "qc1" });
  db.scoreLedgerEntry.create.mockResolvedValue({ id: "sl1" });
  db.user.update.mockResolvedValue({ currentStreak: 1 });
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(db));
});

describe("GET /api/quests", () => {
  it("returns the catalog with per-window completion flags + streak", async () => {
    const res = await GET();
    const body = await res.json();
    expect(Array.isArray(body.quests)).toBe(true);
    expect(body.quests.length).toBeGreaterThan(0);
    expect(body.quests[0]).toHaveProperty("completedThisWindow");
    expect(body).toHaveProperty("currentStreak", 0);
  });

  it("marks a quest completed when a matching window completion exists", async () => {
    // MILESTONE windowKey is always "" → deterministic match, no time dependence
    db.questCompletion.findMany.mockResolvedValueOnce([
      { questId: "milestone_node_uptime", windowKey: "" },
    ]);
    const res = await GET();
    const body = await res.json();
    const milestone = body.quests.find((q: { key: string }) => q.key === "milestone_node_uptime");
    expect(milestone.completedThisWindow).toBe(true);
    // a quest with no completion stays false
    const other = body.quests.find((q: { key: string }) => q.key === "daily_check_in");
    expect(other.completedThisWindow).toBe(false);
  });
});

describe("POST /api/quests", () => {
  it("400 on unknown quest key", async () => {
    const res = await post("nope");
    expect(res.status).toBe(400);
  });

  it("403 on a protocol-valuable quest — never self-attestable (anti-farming)", async () => {
    const res = await post("weekly_secure");
    expect(res.status).toBe(403);
    // the gate returns BEFORE any write — no score is awarded
    expect(db.questCompletion.create).not.toHaveBeenCalled();
    expect(db.scoreLedgerEntry.create).not.toHaveBeenCalled();
  });

  it("completes a self-attestable engagement quest and writes a score-ledger entry", async () => {
    const res = await post("daily_read_chain");
    expect(res.status).toBe(200);
    expect(db.questCompletion.create).toHaveBeenCalledOnce();
    expect(db.scoreLedgerEntry.create).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.awardedScore).toBe(1); // baseScore 1 * ENGAGEMENT_WEIGHT 1
    expect(body.currentStreak).toBe(0); // not the check-in → no streak
  });

  it("daily check-in advances the streak and adds a streak bonus atomically", async () => {
    const res = await post("daily_check_in");
    expect(res.status).toBe(200);
    expect(db.$transaction).toHaveBeenCalledOnce(); // all writes in one transaction
    expect(db.user.update).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.currentStreak).toBe(1);
    expect(body.awardedScore).toBe(3); // base 1 + streakBonus(1)=2
  });

  it("409 when already completed this window", async () => {
    db.questCompletion.create.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }));
    const res = await post("daily_read_chain");
    expect(res.status).toBe(409);
  });
});
