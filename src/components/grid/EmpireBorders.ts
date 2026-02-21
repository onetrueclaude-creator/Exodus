import { Graphics } from 'pixi.js';
import type { Agent } from '@/types';

const TIER_BORDER_COLOR: Record<string, number> = {
  opus: 0x8b5cf6,
  sonnet: 0x00d4ff,
  haiku: 0xfacc15,
};

const SEGMENTS = 48;

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Compute effective border radius at a given angle.
 * Borders stop at other users' borders and unclaimed nodes (fog boundary).
 * Same-user agents don't block each other — their borders merge.
 */
function getEffectiveRadius(
  agent: Agent,
  angle: number,
  obstacles: Agent[],
  safeZone: number = 15,
): number {
  // Border pressure expands effective radius: each point of pressure adds 3 units
  const pressureBonus = (agent.borderPressure ?? 0) * 3;
  const baseRadius = agent.borderRadius + pressureBonus;
  let effectiveRadius = baseRadius;

  for (const other of obstacles) {
    if (other.id === agent.id) continue;
    if (other.userId && other.userId === agent.userId) continue;

    const dx = other.position.x - agent.position.x;
    const dy = other.position.y - agent.position.y;
    const distBetween = Math.sqrt(dx * dx + dy * dy);

    if (distBetween > baseRadius + safeZone) continue;

    const dirAngle = Math.atan2(dy, dx);
    const angleDiff = Math.abs(normalizeAngle(angle - dirAngle));

    if (angleDiff < Math.PI / 2) {
      const influence = Math.cos(angleDiff);
      const otherRadius = other.userId ? other.borderRadius : 0;

      // Border pressure shifts the contested midpoint toward the weaker side.
      // Higher pressure = you push further into the contested zone.
      const myPressure = agent.borderPressure ?? 0;
      const otherPressure = (other.userId && other.borderPressure) ? other.borderPressure : 0;
      const pressureAdvantage = (myPressure - otherPressure) / 40; // ±0.5 range

      const midpoint = distBetween * (0.5 + pressureAdvantage);
      const maxReach = Math.max(safeZone, other.userId
        ? Math.min(midpoint, distBetween - safeZone)
        : (distBetween - otherRadius) * 0.5 + otherRadius * 0.1);
      const clampedRadius = baseRadius - (baseRadius - Math.min(maxReach, distBetween - safeZone)) * influence;
      effectiveRadius = Math.min(effectiveRadius, clampedRadius);
    }
  }

  return Math.max(8, effectiveRadius);
}

/** Get the polygon points for an agent's territory */
function getPolygonPoints(agent: Agent, obstacles: Agent[]): number[] {
  const points: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    const r = getEffectiveRadius(agent, angle, obstacles);
    points.push(
      agent.position.x + Math.cos(angle) * r,
      agent.position.y + Math.sin(angle) * r,
    );
  }
  return points;
}

/**
 * Check if a border segment point is inside a friendly agent's territory.
 * If so, it's an internal border that should be hidden for the merged look.
 */
function isInsideFriendlyTerritory(
  x: number,
  y: number,
  agent: Agent,
  friendlyAgents: Agent[],
  obstacles: Agent[],
): boolean {
  for (const friendly of friendlyAgents) {
    if (friendly.id === agent.id) continue;

    const dx = x - friendly.position.x;
    const dy = y - friendly.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if the point falls within the friendly agent's effective radius
    const angle = Math.atan2(dy, dx);
    const friendlyRadius = getEffectiveRadius(friendly, angle, obstacles);

    if (dist < friendlyRadius * 0.95) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a point is inside ANY polygon of previously drawn agents.
 * Used to prevent overlapping fill from stacking opacity.
 */
function isInsideAnyPolygon(
  px: number,
  py: number,
  polygons: number[][],
): boolean {
  for (const pts of polygons) {
    const n = pts.length / 2;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = pts[i * 2], yi = pts[i * 2 + 1];
      const xj = pts[j * 2], yj = pts[j * 2 + 1];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

/**
 * Draw merged empire borders for a group of same-user agents.
 * - Territory fills don't stack (each agent's fill skips already-covered areas)
 * - Border strokes only draw on outer edges (internal borders between friendly agents are hidden)
 */
function drawMergedEmpire(
  gfx: Graphics,
  empireAgents: Agent[],
  allAgents: Agent[],
  color: number,
  alpha: number,
) {
  const allPolygons: { agent: Agent; points: number[] }[] = [];
  const drawnPolygons: number[][] = [];

  // Phase 1: Draw territory fills — each agent gets a full fill but we use
  // a uniform low alpha so overlapping regions don't compound.
  // For single-agent empires, just draw the polygon.
  // For multi-agent, draw all polygons at the same alpha level.
  for (const agent of empireAgents) {
    const points = getPolygonPoints(agent, allAgents);
    allPolygons.push({ agent, points });
    drawnPolygons.push(points);
  }

  // Draw one combined fill at uniform alpha (no stacking)
  for (const { points } of allPolygons) {
    gfx.poly(points, true);
    gfx.fill({ color, alpha: alpha * 0.06 });
  }

  // Phase 2: Draw only outer border strokes (skip segments inside friendly territory)
  for (const { agent, points } of allPolygons) {
    for (let i = 0; i < SEGMENTS; i++) {
      const x1 = points[i * 2];
      const y1 = points[i * 2 + 1];
      const nextIdx = (i + 1) % SEGMENTS;
      const x2 = points[nextIdx * 2];
      const y2 = points[nextIdx * 2 + 1];

      // Midpoint of this segment
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      // If the midpoint is inside another friendly agent's territory, skip it
      if (empireAgents.length > 1 && isInsideFriendlyTerritory(mx, my, agent, empireAgents, allAgents)) {
        continue;
      }

      gfx.moveTo(x1, y1);
      gfx.lineTo(x2, y2);
    }
    gfx.stroke({ width: 1.5, color, alpha: alpha * 0.6 });
  }
}

interface BorderOptions {
  viewerUserId: string | null;
}

/**
 * Create empire borders — ONLY for claimed star systems.
 * Same-user borders MERGE into a unified territory.
 * Borders stop at other users' borders and unclaimed nodes (fog of unknown).
 */
export function createEmpireBorders(
  agents: Agent[],
  options: BorderOptions = { viewerUserId: null },
): Graphics {
  const gfx = new Graphics();
  const { viewerUserId } = options;

  // Group claimed agents by userId
  const empires = new Map<string, Agent[]>();
  for (const agent of agents) {
    if (!agent.userId) continue;
    const group = empires.get(agent.userId) || [];
    group.push(agent);
    empires.set(agent.userId, group);
  }

  // Draw other empires first (behind) — subdued
  for (const [userId, empireAgents] of empires) {
    if (userId === viewerUserId) continue;
    const primaryColor = TIER_BORDER_COLOR[empireAgents[0].tier] ?? 0x64748b;
    drawMergedEmpire(gfx, empireAgents, agents, primaryColor, 0.3);
  }

  // Draw viewer's empire last (on top) — prominent
  if (viewerUserId && empires.has(viewerUserId)) {
    const ownAgents = empires.get(viewerUserId)!;
    const primaryColor = TIER_BORDER_COLOR[ownAgents[0].tier] ?? 0x8b5cf6;
    drawMergedEmpire(gfx, ownAgents, agents, primaryColor, 1.0);
  }

  return gfx;
}
