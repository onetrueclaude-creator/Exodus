import { describe, it, expect } from "vitest";
import { computeFitZoom, maxBodyRadius } from "../cameraFit";

describe("computeFitZoom (W6 camera-fit)", () => {
  it("never zooms IN past maxZoom for a sparse near-core field", () => {
    expect(computeFitZoom(50, 600, 400)).toBe(1); // fit would be >1 → clamp to 1
  });

  it("zooms OUT to fit a wide field within the margin", () => {
    const z = computeFitZoom(2000, 600, 400); // min(600,400)*0.85/2000 = 0.17 → floored
    expect(z).toBe(0.2); // hits the minZoom floor
  });

  it("fits maxRadius inside the margin when between the bounds", () => {
    const hw = 600, hh = 400, margin = 0.85, r = 500;
    const z = computeFitZoom(r, hw, hh, margin);
    expect(z).toBeCloseTo((Math.min(hw, hh) * margin) / r); // 340/500 = 0.68
    expect(r * z).toBeLessThanOrEqual(Math.min(hw, hh) * margin + 1e-9);
  });

  it("returns maxZoom for a degenerate scene (no radius / no viewport)", () => {
    expect(computeFitZoom(0, 600, 400)).toBe(1);
    expect(computeFitZoom(500, 0, 400)).toBe(1);
  });

  it("clamps to the minZoom floor for an enormous field", () => {
    expect(computeFitZoom(1_000_000, 600, 400)).toBe(0.2);
  });
});

describe("maxBodyRadius", () => {
  it("returns the largest hypot from the core", () => {
    expect(maxBodyRadius([{ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 6, y: 8 }])).toBe(10);
  });
  it("is 0 for an empty set", () => {
    expect(maxBodyRadius([])).toBe(0);
  });
});
