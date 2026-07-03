import { describe, it, expect } from "vitest";
import { sciFormat, sciRate, formatDelta, formatMiB } from "@/lib/format";

describe("sciFormat (HUD number formatting)", () => {
  it("renders integers bare and zero as '0'", () => {
    expect(sciFormat(0)).toBe("0");
    expect(sciFormat(3090)).toBe("3090");
    expect(sciFormat(-500)).toBe("-500");
  });
  it("trims fractional values to <=2 decimals (no trailing-zero noise)", () => {
    expect(sciFormat(42.7)).toBe("42.7");
    expect(sciFormat(42.75)).toBe("42.75");
    expect(sciFormat(0.068)).toBe("0.07");
  });
  it("uses scientific notation for very large / very small magnitudes", () => {
    expect(sciFormat(1234567)).toBe("1.23e6");
    expect(sciFormat(0.00034)).toBe("3.40e-4");
  });
});

describe("sciRate (rate displays, always signed)", () => {
  it("is signed and 2-dp", () => {
    expect(sciRate(0)).toBe("0.00");
    expect(sciRate(5)).toBe("+5.00");
    expect(sciRate(-5)).toBe("-5.00");
  });
});

describe("formatDelta (resource +/- flash indicator)", () => {
  it("prepends '+' for gains, keeps the '-' for losses, '0' for zero", () => {
    expect(formatDelta(500)).toBe("+500");
    expect(formatDelta(-500)).toBe("-500");
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(12.5)).toBe("+12.5");
  });
  it("uses the same sci/precision rules as the rest of the HUD (consistency)", () => {
    expect(formatDelta(1234567)).toBe("+1.23e6"); // was "1234567" raw before
    expect(formatDelta(-1234567)).toBe("-1.23e6");
  });
});

describe("formatMiB (Disk HUD byte formatting)", () => {
  it("formats bytes as MiB with one decimal", () => {
    expect(formatMiB(4_194_304)).toBe("4.0 MiB");
    expect(formatMiB(33_554_432)).toBe("32.0 MiB");
    expect(formatMiB(1_572_864)).toBe("1.5 MiB");
  });

  it("keeps the .0 on zero for a steady-width HUD", () => {
    expect(formatMiB(0)).toBe("0.0 MiB");
  });
});
