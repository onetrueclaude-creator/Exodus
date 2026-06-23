import { describe, it, expect, vi, beforeEach } from "vitest";
import { useParamsStore } from "./paramsStore";
import { ECONOMY_DEFAULTS } from "@/lib/economyDefaults";

beforeEach(() => useParamsStore.setState({ economy: ECONOMY_DEFAULTS, loaded: false }));

describe("paramsStore", () => {
  it("initializes to the baked-in defaults", () => {
    expect(useParamsStore.getState().economy.upgradeCostBase).toBe(200);
    expect(useParamsStore.getState().loaded).toBe(false);
  });
  it("hydrate() overwrites economy from /api/params", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({
      economy: { ...ECONOMY_DEFAULTS, upgradeCostBase: 999 }, chain: {},
    }) })));
    await useParamsStore.getState().hydrate();
    expect(useParamsStore.getState().economy.upgradeCostBase).toBe(999);
    expect(useParamsStore.getState().loaded).toBe(true);
  });
  it("keeps defaults when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502 })));
    await useParamsStore.getState().hydrate();
    expect(useParamsStore.getState().economy.upgradeCostBase).toBe(200);
  });
});
