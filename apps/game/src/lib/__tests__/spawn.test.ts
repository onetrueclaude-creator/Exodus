import { describe, it, expect } from "vitest";
import { cellsInChebyshevRing, getNextSpawnCell } from "@/lib/spawn";
import { buildAllCells, setCellOwner, cellId, createCellInternal } from "@/lib/lattice";
import type { BlockNode } from "@/types";

describe("cellsInChebyshevRing", () => {
  it("ring 0 returns [(0,0)]", () => {
    expect(cellsInChebyshevRing(0)).toEqual([{ cx: 0, cy: 0 }]);
  });

  it("ring 1 returns 8 cells sorted lex by (cx, cy)", () => {
    expect(cellsInChebyshevRing(1)).toEqual([
      { cx: -1, cy: -1 },
      { cx: -1, cy: 0 },
      { cx: -1, cy: 1 },
      { cx: 0, cy: -1 },
      { cx: 0, cy: 1 },
      { cx: 1, cy: -1 },
      { cx: 1, cy: 0 },
      { cx: 1, cy: 1 },
    ]);
  });

  it("ring 2 returns 16 cells, all at Chebyshev distance 2", () => {
    const cells = cellsInChebyshevRing(2);
    expect(cells).toHaveLength(16);
    for (const c of cells) {
      expect(Math.max(Math.abs(c.cx), Math.abs(c.cy))).toBe(2);
    }
  });

  it("negative ring returns []", () => {
    expect(cellsInChebyshevRing(-1)).toEqual([]);
  });
});

function setOwner(
  map: Record<string, BlockNode>,
  cx: number,
  cy: number,
  ownerId: string
): Record<string, BlockNode> {
  const id = cellId(cx, cy);
  const cell = map[id] ?? createCellInternal(cx, cy, 0);
  return { ...map, [id]: setCellOwner(cell, ownerId, "community") };
}

describe("getNextSpawnCell", () => {
  it("empty grid returns origin (0,0)", () => {
    const cells = buildAllCells(3);
    const spawn = getNextSpawnCell(cells);
    expect(spawn).toEqual({ cx: 0, cy: 0, chebyshev: 0 });
  });

  it("origin claimed returns (-1,-1) (lex-first in ring 1)", () => {
    let cells = buildAllCells(3);
    cells = setOwner(cells, 0, 0, "u-1");
    expect(getNextSpawnCell(cells)).toEqual({ cx: -1, cy: -1, chebyshev: 1 });
  });

  it("origin + first 3 ring-1 cells claimed returns (-1, 1)", () => {
    let cells = buildAllCells(3);
    cells = setOwner(cells, 0, 0, "u-1");
    cells = setOwner(cells, -1, -1, "u-2");
    cells = setOwner(cells, -1, 0, "u-3");
    expect(getNextSpawnCell(cells)).toEqual({ cx: -1, cy: 1, chebyshev: 1 });
  });

  it("origin + all 8 ring-1 cells claimed returns (-2,-2)", () => {
    let cells = buildAllCells(3);
    const ring1 = [
      [0, 0],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];
    for (const [cx, cy] of ring1) cells = setOwner(cells, cx, cy, "u-1");
    expect(getNextSpawnCell(cells)).toEqual({ cx: -2, cy: -2, chebyshev: 2 });
  });

  it("sparse claims (only origin and (1,1)) — next is still (-1,-1)", () => {
    let cells = buildAllCells(3);
    cells = setOwner(cells, 0, 0, "u-1");
    cells = setOwner(cells, 1, 1, "u-2");
    expect(getNextSpawnCell(cells)).toEqual({ cx: -1, cy: -1, chebyshev: 1 });
  });

  it("works even when blocknodes map is empty (algorithm doesn't depend on cells existing)", () => {
    expect(getNextSpawnCell({})).toEqual({ cx: 0, cy: 0, chebyshev: 0 });
  });
});
