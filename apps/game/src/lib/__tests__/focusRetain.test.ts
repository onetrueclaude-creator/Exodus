import { describe, it, expect } from "vitest";
import { shouldClearFocusRequest } from "../focusRetain";

describe("shouldClearFocusRequest (W6 focus retention)", () => {
  const fr = { ts: 1000 };

  it("clears once the target was found (camera moved)", () => {
    expect(shouldClearFocusRequest(true, fr, 1000)).toBe(true);
  });

  it("RETAINS when target not found and request is fresh (no silent drop)", () => {
    expect(shouldClearFocusRequest(false, fr, 1500)).toBe(false);
  });

  it("clears a stale request even if target never appears (no infinite retry)", () => {
    expect(shouldClearFocusRequest(false, fr, 1000 + 5001)).toBe(true);
  });

  it("is a no-op when there is no request", () => {
    expect(shouldClearFocusRequest(false, null, 9_999_999)).toBe(false);
  });
});
