import type { FactionId, BlockNode, GalaxyState } from "@/types";
import { getArmCell, getSecureStrength } from "@/lib/spiral";

const FACTIONS: FactionId[] = ["community", "treasury", "founder", "pro-max"];

/**
 * Creates a single blocknode for a given faction and block/ring index.
 */
function createBlockNode(faction: FactionId, blockIndex: number): BlockNode {
  const ringIndex = blockIndex; // block N lives at ring N
  const { cx, cy } = getArmCell(faction, ringIndex);
  return {
    id: `block-${blockIndex}-${faction}`,
    blockIndex,
    ringIndex,
    cx,
    cy,
    faction,
    secureStrength: getSecureStrength(ringIndex),
    ownerId: null,
    stakedCpu: 0,
    cumulativeSecures: 0,
  };
}

/**
 * Builds the 4 genesis blocknodes (one per faction arm, ring 0).
 * Returns them keyed by id.
 */
export function buildGenesisBlocknodes(): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (const faction of FACTIONS) {
    const node = createBlockNode(faction, 0);
    result[node.id] = node;
  }
  return result;
}

/**
 * Builds the 4 blocknodes for a specific block index (one per faction arm).
 * Block 0 is genesis (ring 0), block 1 is ring 1, etc.
 */
export function buildBlocknodesForBlock(blockIndex: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (const faction of FACTIONS) {
    const node = createBlockNode(faction, blockIndex);
    result[node.id] = node;
  }
  return result;
}

/**
 * Builds all blocknodes for a chain of totalBlocks blocks (0..totalBlocks-1).
 * Returns the full Record keyed by blocknode id.
 */
export function buildAllBlocknodes(totalBlocks: number): Record<string, BlockNode> {
  const result: Record<string, BlockNode> = {};
  for (let i = 0; i < totalBlocks; i++) {
    Object.assign(result, buildBlocknodesForBlock(i));
  }
  return result;
}

/**
 * Returns the frontier blocknode for a faction — the lowest unclaimed ringIndex.
 * This is where a new user's node will be placed on join.
 * Returns null if no unclaimed nodes exist for this faction.
 */
export function getFrontierBlocknode(
  faction: FactionId,
  blocknodes: Record<string, BlockNode>
): BlockNode | null {
  const arm = Object.values(blocknodes)
    .filter((n) => n.faction === faction && n.ownerId === null)
    .sort((a, b) => a.ringIndex - b.ringIndex);
  return arm[0] ?? null;
}

/**
 * Looks up a blocknode by its cell coordinate.
 * Returns null if no blocknode occupies that cell.
 */
export function getBlocknodeAtCell(
  cx: number,
  cy: number,
  blocknodes: Record<string, BlockNode>
): BlockNode | null {
  return Object.values(blocknodes).find((n) => n.cx === cx && n.cy === cy) ?? null;
}

/**
 * Builds the full GalaxyState from scratch for a given chain height.
 * visibleFactions is initially empty — factions become visible when nodes are claimed.
 */
export function buildGalaxyState(totalBlocks: number): GalaxyState {
  return {
    blocknodes: buildAllBlocknodes(totalBlocks),
    gridNodes: {},
    totalBlocksMined: totalBlocks,
    visibleFactions: [],
  };
}
