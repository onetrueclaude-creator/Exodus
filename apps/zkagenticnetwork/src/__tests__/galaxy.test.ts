import { describe, it, expect } from "vitest";
import {
  buildGenesisBlocknodes,
  buildBlocknodesForBlock,
  buildAllBlocknodes,
  getFrontierBlocknode,
  getBlocknodeAtCell,
  buildGalaxyState,
} from "@/lib/galaxy";

describe("buildGenesisBlocknodes", () => {
  it("returns 4 nodes (one per faction)", () => {
    const nodes = buildGenesisBlocknodes();
    expect(Object.keys(nodes)).toHaveLength(4);
  });

  it("all genesis nodes are at ringIndex 0", () => {
    const nodes = buildGenesisBlocknodes();
    for (const node of Object.values(nodes)) {
      expect(node.ringIndex).toBe(0);
      expect(node.blockIndex).toBe(0);
    }
  });

  it("genesis community node is directly above origin (0,-1)", () => {
    const nodes = buildGenesisBlocknodes();
    const community = nodes["block-0-community"];
    expect(community).toBeDefined();
    expect(community.cx).toBe(0);
    expect(community.cy).toBe(-1);
  });

  it("genesis nodes form a + (cross) touching at origin", () => {
    const nodes = buildGenesisBlocknodes();
    const coords = Object.values(nodes)
      .map((n) => `${n.cx},${n.cy}`)
      .sort();
    expect(coords).toEqual(["0,-1", "1,0", "0,1", "-1,0"].sort());
  });

  it("all genesis nodes start unclaimed", () => {
    const nodes = buildGenesisBlocknodes();
    for (const node of Object.values(nodes)) {
      expect(node.ownerId).toBeNull();
    }
  });

  it("all genesis nodes have secureStrength 100", () => {
    const nodes = buildGenesisBlocknodes();
    for (const node of Object.values(nodes)) {
      expect(node.secureStrength).toBe(100);
    }
  });
});

describe("buildBlocknodesForBlock", () => {
  it("returns 4 nodes for a given block index", () => {
    const nodes = buildBlocknodesForBlock(3);
    expect(Object.keys(nodes)).toHaveLength(4);
  });

  it("all nodes have the correct blockIndex and ringIndex", () => {
    const nodes = buildBlocknodesForBlock(5);
    for (const node of Object.values(nodes)) {
      expect(node.blockIndex).toBe(5);
      expect(node.ringIndex).toBe(5);
    }
  });

  it("secureStrength decreases from genesis", () => {
    const genesis = buildBlocknodesForBlock(0);
    const ring5 = buildBlocknodesForBlock(5);
    const genesisStrength = Object.values(genesis)[0].secureStrength;
    const ring5Strength = Object.values(ring5)[0].secureStrength;
    expect(ring5Strength).toBeLessThan(genesisStrength);
  });
});

describe("buildAllBlocknodes", () => {
  it("returns 4×N nodes for N blocks", () => {
    const nodes = buildAllBlocknodes(3);
    expect(Object.keys(nodes)).toHaveLength(12);
  });

  it("returns empty for 0 blocks", () => {
    expect(Object.keys(buildAllBlocknodes(0))).toHaveLength(0);
  });

  it("ids are unique", () => {
    const nodes = buildAllBlocknodes(5);
    const ids = Object.keys(nodes);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("getFrontierBlocknode", () => {
  it("returns the lowest unclaimed ring for a faction", () => {
    const nodes = buildAllBlocknodes(5);
    const frontier = getFrontierBlocknode("community", nodes);
    expect(frontier).not.toBeNull();
    expect(frontier!.ringIndex).toBe(0);
    expect(frontier!.faction).toBe("community");
  });

  it("skips claimed nodes", () => {
    const nodes = buildAllBlocknodes(5);
    // claim ring 0 and ring 1 for community
    nodes["block-0-community"].ownerId = "user-001";
    nodes["block-1-community"].ownerId = "user-001";
    const frontier = getFrontierBlocknode("community", nodes);
    expect(frontier!.ringIndex).toBe(2);
  });

  it("returns null when all faction nodes are claimed", () => {
    const nodes = buildAllBlocknodes(2);
    nodes["block-0-community"].ownerId = "user-001";
    nodes["block-1-community"].ownerId = "user-001";
    const frontier = getFrontierBlocknode("community", nodes);
    expect(frontier).toBeNull();
  });
});

describe("getBlocknodeAtCell", () => {
  it("finds a node by cell coordinate", () => {
    const nodes = buildGenesisBlocknodes();
    // community genesis is now at (0,-1) — cardinal up from origin
    const found = getBlocknodeAtCell(0, -1, nodes);
    expect(found).not.toBeNull();
    expect(found!.faction).toBe("community");
  });

  it("returns null for an empty cell", () => {
    const nodes = buildGenesisBlocknodes();
    expect(getBlocknodeAtCell(99, 99, nodes)).toBeNull();
  });
});

describe("buildGalaxyState", () => {
  it("contains correct total blocks mined", () => {
    const state = buildGalaxyState(10);
    expect(state.totalBlocksMined).toBe(10);
  });

  it("contains 4×N blocknodes", () => {
    const state = buildGalaxyState(10);
    expect(Object.keys(state.blocknodes)).toHaveLength(40);
  });

  it("starts with no visible factions", () => {
    const state = buildGalaxyState(5);
    expect(state.visibleFactions).toHaveLength(0);
  });
});
