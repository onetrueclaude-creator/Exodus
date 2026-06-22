import { describe, it, expect } from "vitest";
import { hasOwnedNeighbor } from "@/lib/deploy";

describe("hasOwnedNeighbor", () => {
  it("returns true when a Chebyshev-1 neighbor is in the set", () => {
    const owned = new Set(["0,0"]);
    expect(hasOwnedNeighbor(1, 1, owned)).toBe(true);   // diagonal
    expect(hasOwnedNeighbor(0, 1, owned)).toBe(true);   // edge
    expect(hasOwnedNeighbor(-1, 0, owned)).toBe(true);  // edge
  });

  it("returns false when only ring-2 cells are owned", () => {
    const owned = new Set(["2,2"]);
    expect(hasOwnedNeighbor(0, 0, owned)).toBe(false);
  });

  it("returns false when the cell itself is owned (not its own neighbor)", () => {
    const owned = new Set(["3,4"]);
    expect(hasOwnedNeighbor(3, 4, owned)).toBe(false);
  });

  it("returns false for empty owned set", () => {
    expect(hasOwnedNeighbor(0, 0, new Set())).toBe(false);
  });
});
