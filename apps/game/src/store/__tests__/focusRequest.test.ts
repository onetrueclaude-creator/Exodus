import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../gameStore";

// Coverage for the focusRequest store actions (W6, task #23) — the CLAUDE.md
// invariant ("focusRequest must be consumed after the camera moves") previously
// had zero tests.
describe("focusRequest store actions", () => {
  beforeEach(() => useGameStore.getState().clearFocusRequest());

  it("requestFocus sets a request with the node id + a timestamp", () => {
    useGameStore.getState().requestFocus("node-1");
    const fr = useGameStore.getState().focusRequest;
    expect(fr?.nodeId).toBe("node-1");
    expect(typeof fr?.ts).toBe("number");
  });

  it("clearFocusRequest nulls it", () => {
    useGameStore.getState().requestFocus("n");
    useGameStore.getState().clearFocusRequest();
    expect(useGameStore.getState().focusRequest).toBeNull();
  });

  it("a second requestFocus overwrites the first (one-shot, no queue)", () => {
    useGameStore.getState().requestFocus("a");
    useGameStore.getState().requestFocus("b");
    expect(useGameStore.getState().focusRequest?.nodeId).toBe("b");
  });
});
