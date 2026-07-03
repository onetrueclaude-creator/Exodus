/**
 * DePIN S2 surface: /api/vault/pins + /api/beacon reach the game through
 * testnetApi (same-origin gateway URLs) and both ChainService implementations.
 * The pins list never contains the chain's internal shard_id=-1 miss bucket
 * (filtered server-side); pass_rate is the server's windowed rate.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getVaultPins, getBeacon } from "@/services/testnetApi";
import { MockChainService } from "@/services/chainService";
import { TestnetChainService } from "@/services/testnetChainService";

describe("testnetApi — vault pins + beacon", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("getVaultPins GETs the gateway pins path and returns the typed shape", async () => {
    const body = {
      wallet_index: 1,
      owner: "ab".repeat(32),
      pins: [{ shard_id: 4, passes: 6, misses: 2, size_bytes: 4_194_304, active: true }],
      pinned_bytes: 4_194_304,
      pass_rate: 0.75,
    };
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => body });
    vi.stubGlobal("fetch", fetchMock);

    const res = await getVaultPins(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/chain/api/vault/pins/1");
    expect(res).toEqual(body);
  });

  it("getBeacon GETs the gateway beacon path and returns the typed shape", async () => {
    const body = { source: "drand", round_id: 4711, stale: false, value_prefix: "00112233aabbccdd" };
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => body });
    vi.stubGlobal("fetch", fetchMock);

    const res = await getBeacon();
    expect(fetchMock).toHaveBeenCalledWith("/api/chain/api/beacon");
    expect(res).toEqual(body);
  });
});

describe("TestnetChainService — pins + beacon pass-throughs", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes getVaultPins and getBeacon through the gateway client", async () => {
    const pinsBody = { wallet_index: 2, owner: "cd".repeat(32), pins: [], pinned_bytes: 0, pass_rate: 1.0 };
    const beaconBody = { source: "stale", round_id: null, stale: true, value_prefix: "ff".repeat(8) };
    // Two sequential fetches — each covered by its own mockResolvedValueOnce
    // (project convention in apps/game/CLAUDE.md).
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => pinsBody })
      .mockResolvedValueOnce({ ok: true, json: async () => beaconBody });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new TestnetChainService();
    expect(await svc.getVaultPins(2)).toEqual(pinsBody);
    expect(await svc.getBeacon()).toEqual(beaconBody);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/chain/api/vault/pins/2");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/chain/api/beacon");
  });
});

describe("MockChainService — offline pins + beacon", () => {
  it("returns an internally-consistent pins shape (no -1 bucket, bytes = active sum)", async () => {
    const svc = new MockChainService();
    const pins = await svc.getVaultPins(3);
    expect(pins.wallet_index).toBe(3);
    expect(pins.pins.length).toBeGreaterThan(0);
    for (const p of pins.pins) {
      // The -1 miss bucket never surfaces in a pins list — mirror the chain contract.
      expect(p.shard_id).toBeGreaterThanOrEqual(0);
    }
    expect(pins.pinned_bytes).toBe(
      pins.pins.filter((p) => p.active).reduce((s, p) => s + p.size_bytes, 0),
    );
    expect(pins.pass_rate).toBeGreaterThanOrEqual(0);
    expect(pins.pass_rate).toBeLessThanOrEqual(1);
    // Consistent with the mock assignment (shards: [walletIndex % 16]).
    expect(pins.pins[0].shard_id).toBe(3 % 16);
  });

  it("returns a non-stale mock beacon with a 16-hex-char prefix", async () => {
    const svc = new MockChainService();
    const b = await svc.getBeacon();
    expect(b.source).toBe("mock");
    expect(b.stale).toBe(false);
    expect(b.round_id).toBeNull();
    expect(b.value_prefix).toMatch(/^[0-9a-f]{16}$/);
  });
});
