import { describe, it, expect } from "vitest";
import { hasOwnedNeighbor, computeDeployCandidates } from "@/lib/deploy";
import { buildAllCells, setCellOwner } from "@/lib/lattice";
import type { BlockNode } from "@/types";

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

function addOriginCell(map: Record<string, BlockNode>): Record<string, BlockNode> {
  const originCell: BlockNode = {
    id: "cell-0-0",
    blockIndex: 0,
    ringIndex: 0,
    cx: 0,
    cy: 0,
    tier: null,
    secureStrength: 100,
    ownerId: null,
    stakedCpu: 0,
    cumulativeSecures: 0,
  };
  return { [originCell.id]: originCell, ...map };
}

function setOwner(map: Record<string, BlockNode>, cx: number, cy: number, ownerId: string): Record<string, BlockNode> {
  const id = `cell-${cx}-${cy}`;
  return { ...map, [id]: setCellOwner(map[id], ownerId, "community") };
}

describe("computeDeployCandidates", () => {
  it("lone homenode at (0,0) → 8 candidates (ring 1)", () => {
    let cells = addOriginCell(buildAllCells(3));
    cells = setOwner(cells, 0, 0, "u-1");
    const candidates = computeDeployCandidates(cells, "u-1", { cx: 0, cy: 0 });
    expect(candidates).toHaveLength(8);
    const coords = candidates.map(c => `${c.cx},${c.cy}`).sort();
    expect(coords).toEqual([
      "-1,-1", "-1,0", "-1,1",
      "0,-1",          "0,1",
      "1,-1",  "1,0",  "1,1",
    ].sort());
  });

  it("homenode + (1,0) claimed → candidates exclude (1,0); include its 5 new neighbors", () => {
    let cells = addOriginCell(buildAllCells(3));
    cells = setOwner(cells, 0, 0, "u-1");
    cells = setOwner(cells, 1, 0, "u-1");
    const candidates = computeDeployCandidates(cells, "u-1", { cx: 0, cy: 0 });
    const coords = new Set(candidates.map(c => `${c.cx},${c.cy}`));
    expect(coords.has("1,0")).toBe(false);     // claimed, excluded
    expect(coords.has("2,-1")).toBe(true);     // new neighbor of (1,0)
    expect(coords.has("2,0")).toBe(true);
    expect(coords.has("2,1")).toBe(true);
    expect(coords.has("-1,-1")).toBe(true);    // still a candidate (neighbor of (0,0))
  });

  it("ring 1 fully owned → candidates are ring 2 (16 cells)", () => {
    let cells = addOriginCell(buildAllCells(3));
    for (const [cx, cy] of [
      [0, 0], [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
    ]) cells = setOwner(cells, cx, cy, "u-1");
    const candidates = computeDeployCandidates(cells, "u-1", { cx: 0, cy: 0 });
    expect(candidates).toHaveLength(16);
  });

  it("no owned cells (degenerate) → []", () => {
    const cells = buildAllCells(2);
    expect(computeDeployCandidates(cells, "u-1", { cx: 0, cy: 0 })).toEqual([]);
  });

  it("excludes cells claimed by other players", () => {
    let cells = addOriginCell(buildAllCells(3));
    cells = setOwner(cells, 0, 0, "u-1");
    cells = setOwner(cells, 1, 1, "u-2"); // other player's claim, in u-1's adjacency
    const candidates = computeDeployCandidates(cells, "u-1", { cx: 0, cy: 0 });
    const coords = candidates.map(c => `${c.cx},${c.cy}`);
    expect(coords).not.toContain("1,1");
    expect(candidates).toHaveLength(7); // 8 minus (1,1) taken by u-2
  });

  it("sorted by Chebyshev distance from homenode, ties broken by id", () => {
    let cells = addOriginCell(buildAllCells(3));
    cells = setOwner(cells, 0, 0, "u-1");
    const candidates = computeDeployCandidates(cells, "u-1", { cx: 0, cy: 0 });
    // All 8 candidates at Chebyshev distance 1; lex-by-id is stable
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i].chebyshevFromHome).toBeGreaterThanOrEqual(candidates[i - 1].chebyshevFromHome);
      if (candidates[i].chebyshevFromHome === candidates[i - 1].chebyshevFromHome) {
        expect(candidates[i].id > candidates[i - 1].id).toBe(true);
      }
    }
  });

  it("disconnected owned cells → algorithm still considers all neighbors", () => {
    let cells = addOriginCell(buildAllCells(5));
    cells = setOwner(cells, 0, 0, "u-1");
    cells = setOwner(cells, 3, 3, "u-1"); // disconnected
    const candidates = computeDeployCandidates(cells, "u-1", { cx: 0, cy: 0 });
    const coords = new Set(candidates.map(c => `${c.cx},${c.cy}`));
    // Both (0,0)'s neighbors AND (3,3)'s neighbors should be candidates
    expect(coords.has("1,1")).toBe(true);   // (0,0) neighbor
    expect(coords.has("2,2")).toBe(true);   // (3,3) neighbor
  });
});
