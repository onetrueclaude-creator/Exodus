import type { FactionId, CellCoord } from "@/types";

export const CELL_SIZE = 64; // pixels per cell square
export const TWIST_PER_RING = 10; // degrees CCW per ring
export const ARM_RADIUS_GROWTH = 1.5; // cells per ring
export const BASE_SECURE_STRENGTH = 100;
export const SECURE_DECAY_RATE = 0.225;

/**
 * Base angles for each faction arm (screen-space degrees, Y-down convention).
 * Genesis nodes (ring 0) land on the 4 cardinal neighbors of (0,0), all touching at origin.
 * Each arm starts in a cardinal direction then twists CCW by TWIST_PER_RING per ring:
 *   community  270° → starts up,    curves upper-left
 *   treasury     0° → starts right, curves upper-right
 *   founder     90° → starts down,  curves lower-right
 *   pro-max    180° → starts left,  curves lower-left
 */
export const ARM_BASE_ANGLES: Record<FactionId, number> = {
  community: 270, // up → upper-left
  treasury: 0, // right → upper-right
  founder: 90, // down → lower-right
  "pro-max": 180, // left → lower-left
};

/**
 * Returns the cell coordinate for a faction's node at a given ring index.
 * Ring 0 is the genesis ring (the 2×2 center block).
 * Each ring step twists the arm counterclockwise by TWIST_PER_RING degrees.
 */
export function getArmCell(faction: FactionId, ringIndex: number): CellCoord {
  const angleDeg = ARM_BASE_ANGLES[faction] - ringIndex * TWIST_PER_RING;
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = Math.SQRT2 + ringIndex * ARM_RADIUS_GROWTH;
  return {
    cx: Math.round(radius * Math.cos(angleRad)) || 0,
    cy: Math.round(radius * Math.sin(angleRad)) || 0,
  };
}

/**
 * Secure Strength decays outward from the center.
 * Ring 0: 100 strength. Ring 10: ~40 strength. Ring 40: ~1 strength.
 * Formula: BASE / (1 + ringIndex * DECAY_RATE), rounded to 1 decimal, min 1.
 */
export function getSecureStrength(ringIndex: number): number {
  const raw = BASE_SECURE_STRENGTH / (1 + ringIndex * SECURE_DECAY_RATE);
  return Math.max(1, Math.round(raw * 10) / 10);
}

/**
 * Generates the ordered array of cell coordinates for a faction arm.
 * count = number of nodes to generate (one per ring, starting at ring 0).
 */
export function generateArmPath(faction: FactionId, count: number): CellCoord[] {
  const path: CellCoord[] = [];
  for (let i = 0; i < count; i++) {
    path.push(getArmCell(faction, i));
  }
  return path;
}

/**
 * Converts a cell coordinate to pixel space.
 * The pixel origin (0,0) maps to the canvas center.
 */
export function cellToPixel(cx: number, cy: number): { px: number; py: number } {
  return {
    px: cx * CELL_SIZE,
    py: cy * CELL_SIZE,
  };
}

/**
 * Returns the exact floating-point pixel position of a blocknode.
 * Uses the same spiral formula as createBlockNode so that camera centering
 * targets the rendered position rather than the rounded cell coordinate.
 */
export function getBlocknodePixelPos(node: { faction: FactionId; ringIndex: number }): {
  px: number;
  py: number;
} {
  const angleDeg = ARM_BASE_ANGLES[node.faction] - node.ringIndex * TWIST_PER_RING;
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = Math.SQRT2 + node.ringIndex * ARM_RADIUS_GROWTH;
  return {
    px: radius * Math.cos(angleRad) * CELL_SIZE,
    py: radius * Math.sin(angleRad) * CELL_SIZE,
  };
}
