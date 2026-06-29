import { describe, it, expect, vi } from "vitest";
import { isVisualRouteBlocked } from "@/lib/visualTest";

describe("/visual route guard contract", () => {
  it("blocks in production, allows otherwise", () => {
    const prev = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(isVisualRouteBlocked()).toBe(true);
      (process.env as Record<string, string>).NODE_ENV = "development";
      expect(isVisualRouteBlocked()).toBe(false);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev as string;
    }
  });

  it("the visual layout calls notFound() when blocked", async () => {
    // Reset BEFORE doMock so a prior import of ../layout (anywhere in the suite)
    // can't leave a cached module that makes the mock a silent no-op (false pass).
    vi.resetModules();
    const notFound = vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
    vi.doMock("next/navigation", () => ({ notFound }));
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";
    try {
      const mod = await import("../layout");
      expect(() => mod.default({ children: null })).toThrow("NEXT_NOT_FOUND");
      expect(notFound).toHaveBeenCalled();
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev as string;
      vi.doUnmock("next/navigation");
      vi.resetModules();
    }
  });
});
