/**
 * DePIN S3b surface: /api/time/{i} + /api/time/leaderboard reach the game through
 * testnetApi (same-origin gateway URLs) and both ChainService implementations.
 * Each sequential fetch gets its own mockResolvedValueOnce (house rule).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTimeStatus, getTimeLeaderboard } from "@/services/testnetApi";
import { MockChainService } from "@/services/chainService";
import { TestnetChainService } from "@/services/testnetChainService";

describe("testnetApi — time endpoints", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("getTimeStatus GETs the gateway time path and returns the raw shape", async () => {
    const body = { wallet_index: 1, owner_hex: "ab".repeat(32), time_accrued: 6, influence: Math.sqrt(6), updated_at_block: 90 };
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => body });
    vi.stubGlobal("fetch", fetchMock);
    const res = await getTimeStatus(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/chain/api/time/1");
    expect(res).toEqual(body);
  });

  it("getTimeLeaderboard GETs the leaderboard path and returns the raw list", async () => {
    const body = [{ owner_hex: "cd".repeat(32), time_accrued: 12, influence: Math.sqrt(12) }];
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => body });
    vi.stubGlobal("fetch", fetchMock);
    const res = await getTimeLeaderboard();
    expect(fetchMock).toHaveBeenCalledWith("/api/chain/api/time/leaderboard");
    expect(res).toEqual(body);
  });
});

describe("TestnetChainService — time folds through the gateway", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("getTimeStatus folds raw → camel TimeStatus", async () => {
    const body = { wallet_index: 2, owner_hex: "ef".repeat(32), time_accrued: 3, influence: Math.sqrt(3), updated_at_block: 44 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => body }));
    const res = await new TestnetChainService().getTimeStatus(2);
    expect(res).toEqual({ walletIndex: 2, ownerHex: "ef".repeat(32), timeAccrued: 3, influence: Math.sqrt(3), updatedAtBlock: 44 });
  });

  it("getTimeStatus returns null when the fetch fails (null-honest, keeps no fake row)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" }));
    expect(await new TestnetChainService().getTimeStatus(999)).toBeNull();
  });

  it("getTimeLeaderboard folds each raw entry → camel LeaderboardRow", async () => {
    const body = [{ owner_hex: "11".repeat(32), time_accrued: 5, influence: Math.sqrt(5) }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => body }));
    const res = await new TestnetChainService().getTimeLeaderboard();
    expect(res).toEqual([{ ownerHex: "11".repeat(32), timeAccrued: 5, influence: Math.sqrt(5) }]);
  });
});

describe("MockChainService — internally consistent offline tenure", () => {
  it("own row's ownerHex appears in the leaderboard (own-row highlight demonstrable offline)", async () => {
    const svc = new MockChainService();
    const me = await svc.getTimeStatus(1);
    const board = await svc.getTimeLeaderboard();
    expect(me).not.toBeNull();
    expect(board.some((r) => r.ownerHex === me!.ownerHex)).toBe(true);
    // Leaderboard is descending by tenure (chain pre-sorts by influence).
    expect([...board].map((r) => r.timeAccrued)).toEqual([...board].map((r) => r.timeAccrued).sort((a, b) => b - a));
  });
});
