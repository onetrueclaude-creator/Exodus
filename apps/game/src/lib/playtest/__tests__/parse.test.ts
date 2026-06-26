import { describe, it, expect } from "vitest";
import { parseAssessment } from "@/lib/playtest/parse";

describe("parseAssessment", () => {
  it("parses clean JSON and attaches the screen", () => {
    const r = parseAssessment('{"tickets":[{"severity":"blocker","issue":"i","suggestion":"s"}]}', "game");
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0]).toEqual({ screen: "game", severity: "blocker", issue: "i", suggestion: "s" });
  });

  it("parses JSON wrapped in ```json fences / prose", () => {
    const text = 'Here is my review:\n```json\n{"tickets":[{"severity":"polish","issue":"a","suggestion":"b"}]}\n```\nDone.';
    const r = parseAssessment(text, "onboard");
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0].severity).toBe("polish");
    expect(r.tickets[0].screen).toBe("onboard");
  });

  it("clamps an unknown severity to 'polish' and drops entries missing issue", () => {
    const text = '{"tickets":[{"severity":"WAT","issue":"x","suggestion":"y"},{"severity":"blocker","suggestion":"no issue"}]}';
    const r = parseAssessment(text, "s");
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0].severity).toBe("polish"); // unknown → polish (least-severe default)
    expect(r.tickets[0].issue).toBe("x");
  });

  it("never throws on malformed / empty / null output → empty tickets", () => {
    expect(parseAssessment("not json at all", "s")).toEqual({ tickets: [] });
    expect(parseAssessment("", "s")).toEqual({ tickets: [] });
    expect(parseAssessment("{tickets: oops}", "s")).toEqual({ tickets: [] });
    // @ts-expect-error — guard against a null body from an HTTP/model wrapper
    expect(parseAssessment(null, "s")).toEqual({ tickets: [] });
  });

  it("does not truncate when a string value contains braces (string-aware scan)", () => {
    const text = '{"tickets":[{"severity":"blocker","issue":"Replace {prop} with [prop]","suggestion":"avoid {} in copy"}]}';
    const r = parseAssessment(text, "game");
    expect(r.tickets).toHaveLength(1);
    expect(r.tickets[0].issue).toBe("Replace {prop} with [prop]");
    expect(r.tickets[0].suggestion).toBe("avoid {} in copy");
  });
});
