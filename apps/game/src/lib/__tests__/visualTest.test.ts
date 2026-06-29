import { describe, it, expect } from "vitest";
import {
  isVisualTestMode,
  isVisualRouteBlocked,
  buildVisualFixture,
  VISUAL_SETTLE_STEPS,
  VISUAL_FRAME_MS,
} from "@/lib/visualTest";

describe("visualTest", () => {
  it("isVisualTestMode is true ONLY for visualTest=1", () => {
    expect(isVisualTestMode("?visualTest=1")).toBe(true);
    expect(isVisualTestMode(new URLSearchParams("visualTest=1"))).toBe(true);
    expect(isVisualTestMode("?visualTest=0")).toBe(false);
    expect(isVisualTestMode("?foo=bar")).toBe(false);
    expect(isVisualTestMode("")).toBe(false);
    expect(isVisualTestMode(null)).toBe(false);
    expect(isVisualTestMode(undefined)).toBe(false);
  });

  it("isVisualRouteBlocked reflects NODE_ENV==='production'", () => {
    const prev = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(isVisualRouteBlocked()).toBe(true);
      (process.env as Record<string, string>).NODE_ENV = "test";
      expect(isVisualRouteBlocked()).toBe(false);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev as string;
    }
  });

  it("buildVisualFixture is deterministic, non-empty, exactly one self", () => {
    const a = buildVisualFixture();
    const b = buildVisualFixture();
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b); // deterministic — the whole point of a visual fixture
    expect(a.filter((x) => x.isSelf).length).toBe(1);
    expect(a[0].userId).toBeTruthy();
  });

  it("freeze constants are fixed and frame-stable", () => {
    expect(VISUAL_SETTLE_STEPS).toBe(180);
    expect(VISUAL_FRAME_MS).toBeCloseTo(16.6667, 3);
  });
});
