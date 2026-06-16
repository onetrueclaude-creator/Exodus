import { describe, it, expect } from "vitest";
import { assignRanks, type RankInput } from "./rankMapping";

const a = (id: string, activity: number, isSingularity = false): RankInput => ({ id, activity, isSingularity });

describe("assignRanks", () => {
  it("ranks by descending activity, k starts at 1", () => {
    const m = assignRanks([a("low", 10), a("hi", 99), a("mid", 50)]);
    expect(m.get("hi")).toBe(1);
    expect(m.get("mid")).toBe(2);
    expect(m.get("low")).toBe(3);
  });
  it("Singularity is k=0 and excluded from ranking", () => {
    const m = assignRanks([a("core", 0, true), a("p", 5)]);
    expect(m.get("core")).toBe(0);
    expect(m.get("p")).toBe(1);
  });
  it("breaks ties stably by id (ascending)", () => {
    const m = assignRanks([a("b", 5), a("a", 5)]);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(2);
  });
});
