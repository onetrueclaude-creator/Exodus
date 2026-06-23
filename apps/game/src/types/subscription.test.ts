import { describe, it, expect, beforeEach } from "vitest";
import { getSubscriptionEconomy } from "@/types/subscription";
import { useParamsStore } from "@/store/paramsStore";
import { ECONOMY_DEFAULTS } from "@/lib/economyDefaults";

beforeEach(() => useParamsStore.setState({ economy: ECONOMY_DEFAULTS, loaded: false }));

describe("getSubscriptionEconomy", () => {
  it("returns COMMUNITY defaults from ECONOMY_DEFAULTS when store is at defaults", () => {
    const eco = getSubscriptionEconomy("COMMUNITY");
    expect(eco.startEnergy).toBe(1000);
    expect(eco.cpuRegen).toBe(100);
    expect(eco.startAgntc).toBe(10);
    expect(eco.startMinerals).toBe(10);
  });

  it("returns PROFESSIONAL defaults from ECONOMY_DEFAULTS when store is at defaults", () => {
    const eco = getSubscriptionEconomy("PROFESSIONAL");
    expect(eco.startEnergy).toBe(5000);
    expect(eco.cpuRegen).toBe(200);
    expect(eco.startAgntc).toBe(100);
    expect(eco.startMinerals).toBe(50);
  });

  it("reflects a server override of COMMUNITY subscription params from the store", () => {
    useParamsStore.setState({
      economy: {
        ...ECONOMY_DEFAULTS,
        subscription: {
          ...ECONOMY_DEFAULTS.subscription,
          COMMUNITY: { startEnergy: 2000, cpuRegen: 150, startAgntc: 20, startMinerals: 20 },
        },
      },
      loaded: true,
    });
    const eco = getSubscriptionEconomy("COMMUNITY");
    expect(eco.startEnergy).toBe(2000);
    expect(eco.cpuRegen).toBe(150);
    expect(eco.startAgntc).toBe(20);
    expect(eco.startMinerals).toBe(20);
  });

  it("reflects a server override of PROFESSIONAL subscription params from the store", () => {
    useParamsStore.setState({
      economy: {
        ...ECONOMY_DEFAULTS,
        subscription: {
          ...ECONOMY_DEFAULTS.subscription,
          PROFESSIONAL: { startEnergy: 9999, cpuRegen: 500, startAgntc: 200, startMinerals: 100 },
        },
      },
      loaded: true,
    });
    const eco = getSubscriptionEconomy("PROFESSIONAL");
    expect(eco.startEnergy).toBe(9999);
    expect(eco.cpuRegen).toBe(500);
  });

  it("falls back to ECONOMY_DEFAULTS when the store entry for an unknown tier is missing", () => {
    // Simulate a tier not in the store (e.g., MAX — dormant enum value)
    useParamsStore.setState({
      economy: {
        ...ECONOMY_DEFAULTS,
        subscription: { COMMUNITY: ECONOMY_DEFAULTS.subscription.COMMUNITY },
      },
      loaded: true,
    });
    // PROFESSIONAL is missing from store — must not throw, must return ECONOMY_DEFAULTS fallback
    const eco = getSubscriptionEconomy("PROFESSIONAL");
    expect(eco.startEnergy).toBe(5000);
    expect(eco.cpuRegen).toBe(200);
  });
});
