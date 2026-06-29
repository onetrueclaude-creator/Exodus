import { describe, it, expect } from "vitest";
import {
  QUEST_CATALOG,
  scoreForQuest,
  streakBonus,
  windowKeyFor,
  PROTOCOL_WEIGHT,
  ENGAGEMENT_WEIGHT,
  type QuestDef,
} from "@/lib/scoring";

describe("scoring", () => {
  it("weights protocol-valuable behavior 5-10x over engagement theater", () => {
    expect(PROTOCOL_WEIGHT / ENGAGEMENT_WEIGHT).toBeGreaterThanOrEqual(5);
    expect(PROTOCOL_WEIGHT / ENGAGEMENT_WEIGHT).toBeLessThanOrEqual(10);
  });

  it("a protocol-valuable quest outscores an equal-base engagement quest by the weight ratio", () => {
    const base = 10;
    const protocolQ: QuestDef = { key: "p", cadence: "WEEKLY", title: "", description: "", baseScore: base, protocolValuable: true };
    const themeQ: QuestDef = { key: "t", cadence: "DAILY", title: "", description: "", baseScore: base, protocolValuable: false };
    expect(scoreForQuest(protocolQ)).toBe(base * PROTOCOL_WEIGHT);
    expect(scoreForQuest(themeQ)).toBe(base * ENGAGEMENT_WEIGHT);
    expect(scoreForQuest(protocolQ)).toBeGreaterThanOrEqual(scoreForQuest(themeQ) * 5);
  });

  it("catalog has all three cadences and the daily check-in is a small floor", () => {
    const cadences = new Set(QUEST_CATALOG.map((q) => q.cadence));
    expect(cadences.has("DAILY")).toBe(true);
    expect(cadences.has("WEEKLY")).toBe(true);
    expect(cadences.has("MILESTONE")).toBe(true);
    const checkIn = QUEST_CATALOG.find((q) => q.key === "daily_check_in")!;
    expect(checkIn.protocolValuable).toBe(false);
    // floor: a bare check-in scores less than any protocol-valuable weekly quest
    const weeklyProtocol = QUEST_CATALOG.find((q) => q.cadence === "WEEKLY" && q.protocolValuable)!;
    expect(scoreForQuest(checkIn)).toBeLessThan(scoreForQuest(weeklyProtocol));
  });

  it("catalog keys are unique (consumers index by key — a dup would clobber)", () => {
    const keys = QUEST_CATALOG.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("streak bonus is light and capped so busy days don't break the chain", () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(1)).toBeGreaterThan(0);
    // monotonic non-decreasing — step pair catches an accidental inversion
    expect(streakBonus(2)).toBeGreaterThanOrEqual(streakBonus(1));
    expect(streakBonus(30)).toBeGreaterThanOrEqual(streakBonus(7));
    // the bonus stays light: the EFFECTIVE ceiling is ~28, well under a single
    // weekly_secure (40), so a streak can never dwarf real protocol work. (The
    // Math.min(50,…) backstop is unreachable below ~2^24 days — don't treat 50
    // as the design ceiling; assert the tight effective bound instead.)
    expect(streakBonus(10000)).toBeLessThanOrEqual(30);
  });

  it("windowKeyFor isolates accrual windows per cadence", () => {
    const d = new Date("2026-06-25T12:00:00Z");
    expect(windowKeyFor("DAILY", d)).toBe("2026-06-25");
    expect(windowKeyFor("WEEKLY", d)).toMatch(/^2026-W\d{2}$/);
    expect(windowKeyFor("MILESTONE", d)).toBe("");
  });
});
