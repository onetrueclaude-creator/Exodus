/**
 * Smart Empire Placement — Neural Lattice-style starting position selection.
 *
 * Scores unclaimed nodes by density, volume, and neighborhood quality.
 * Returns the best candidates for the user's homenode.
 *
 * Algorithm based on:
 *   - Civ5: composite fertility score per tile (density + volume + connectivity)
 *   - Neural Lattice: avoid edges, prefer nodes with 2-4 connections, guarantee resources nearby
 *   - Both: pick highest-scoring node in a well-distributed region
 */

import type { Agent } from '@/types';
import { getDistance } from './proximity';

interface PlacementCandidate {
  id: string;
  score: number;
  density: number;
  volume: number;
  neighborScore: number;
  position: { x: number; y: number };
}

/** Grid extent — nodes range from -4000 to 4000 */
const GRID_HALF = 4000;
/** Buffer from edge — avoid placing starts in the outer 15% */
const EDGE_BUFFER = GRID_HALF * 0.15; // 600 units

/**
 * Score a node for starting placement.
 *
 * Factors (weighted):
 *   1. Density (0–1) — higher is better (more mining output)
 *   2. Volume (1–8 storage slots) — higher is better
 *   3. Edge penalty — nodes near grid edges are penalized
 *   4. Neighborhood quality — avg density of nearby nodes within 500u
 */
function scoreNode(
  node: Agent,
  allNodes: Agent[],
  neighborhoodRadius: number = 500,
): PlacementCandidate {
  const d = node.density ?? 0;
  const v = node.storageSlots ?? 1;

  // Edge penalty: 0 if in buffer zone, 1 if well inside
  const edgePenalty = (
    Math.abs(node.position.x) > GRID_HALF - EDGE_BUFFER ||
    Math.abs(node.position.y) > GRID_HALF - EDGE_BUFFER
  ) ? 0.3 : 1.0;

  // Neighborhood: count nearby unclaimed nodes and their avg density
  const neighbors = allNodes.filter(
    n => n.id !== node.id && getDistance(node.position, n.position) <= neighborhoodRadius,
  );
  const neighborCount = neighbors.length;
  const avgNeighborDensity = neighborCount > 0
    ? neighbors.reduce((sum, n) => sum + (n.density ?? 0), 0) / neighborCount
    : 0;

  // Connectivity bonus: 2-6 neighbors is ideal for Neural Lattice node connectivity
  const connectBonus = neighborCount >= 2 && neighborCount <= 6 ? 1.0
    : neighborCount > 6 ? 0.8
    : 0.5; // isolated

  // Composite score
  const score = (
    d * 30 +             // density: max 30
    (v / 8) * 20 +       // volume: max 20
    avgNeighborDensity * 15 + // neighborhood: max 15
    connectBonus * 10 +  // connectivity: max 10
    edgePenalty * 10     // edge: max 10
  ); // total max ~85

  return {
    id: node.id,
    score,
    density: d,
    volume: v,
    neighborScore: Math.round(avgNeighborDensity * 100) / 100,
    position: node.position,
  };
}

/**
 * Find the best starting positions from a set of unclaimed nodes.
 *
 * Returns the top `count` candidates sorted by score (highest first).
 * If `existingPlayerPositions` are provided, enforces minimum distance.
 */
export function findBestStartingNodes(
  allAgents: Record<string, Agent>,
  count: number = 5,
  existingPlayerPositions: { x: number; y: number }[] = [],
  minDistFromPlayers: number = 800,
): PlacementCandidate[] {
  const unclaimed = Object.values(allAgents).filter(a => !a.userId);
  if (unclaimed.length === 0) return [];

  // Score all unclaimed nodes
  const scored = unclaimed.map(n => scoreNode(n, unclaimed));

  // Filter out nodes too close to existing players
  const filtered = existingPlayerPositions.length > 0
    ? scored.filter(c => existingPlayerPositions.every(
        p => getDistance(c.position, p) >= minDistFromPlayers,
      ))
    : scored;

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  return filtered.slice(0, count);
}

/**
 * Pick the single best starting node for a new player.
 */
export function pickBestStartingNode(
  allAgents: Record<string, Agent>,
): PlacementCandidate | null {
  const candidates = findBestStartingNodes(allAgents, 1);
  return candidates[0] ?? null;
}
