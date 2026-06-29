import { describe, it, expect } from "vitest";
import { buildAssessmentPrompt } from "@/lib/playtest/prompt";

describe("buildAssessmentPrompt", () => {
  it("names the screen and pins the strict JSON schema + severity vocabulary", () => {
    const p = buildAssessmentPrompt("game-canvas");
    expect(p).toContain("game-canvas");
    expect(p).toMatch(/json/i);
    expect(p).toContain("blocker");
    expect(p).toContain("confusing");
    expect(p).toContain("polish");
    expect(p).toContain("tickets");
  });

  it("includes the UX heuristics (clarity / dead-end / confusing / broken-empty)", () => {
    const p = buildAssessmentPrompt("x").toLowerCase();
    expect(p).toContain("dead-end");
    expect(p).toContain("confusing");
    expect(p).toMatch(/empty|blank|broken/);
  });
});
