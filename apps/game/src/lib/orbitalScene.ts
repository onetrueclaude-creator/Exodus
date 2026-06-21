import { phylloPos, bandOf } from "./orbitalGeometry";
import { assignRanks, type RankInput } from "./rankMapping";
import { TIER_TINT, SUBAGENT_TINT, type SeatInput, type SceneModel, type SceneNode, type SceneEdge } from "../types/orbital";

export interface SceneOpts {
  radialScale: number; // c in radius=c·√k
  corePadding?: number; // free space around the Singularity (default 0)
  subagentOrbitFraction?: number; // multiple of radialScale for the subagent orbit (default SUBAGENT_ORBIT_FRACTION)
}

const PLAYER_R = 7;
const SUBAGENT_R = 4;
const SINGULARITY_R = 13;

/**
 * Default subagent orbit radius as a multiple of `radialScale`. Subagents sit on
 * a ring this far from their parent. Bumped from 0.4 → 1.1 so spawned subagents
 * appear clearly away from the homenode (they were spawning visually on top of it).
 */
export const SUBAGENT_ORBIT_FRACTION = 1.1;

export function buildScene(seats: readonly SeatInput[], opts: SceneOpts): SceneModel {
  const c = opts.radialScale;
  const orbit = (opts.subagentOrbitFraction ?? SUBAGENT_ORBIT_FRACTION) * c;

  const rankInput: RankInput[] = seats
    .filter((s) => !s.parentId)
    .map((s) => ({ id: s.id, activity: s.activity, isSingularity: s.isSingularity }));
  const ranks = assignRanks(rankInput);

  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const posById = new Map<string, { x: number; y: number }>();

  // players + singularity (seated by rank)
  for (const s of seats) {
    if (s.parentId) continue;
    const k = ranks.get(s.id) ?? 0;
    const p = phylloPos(k, c, opts.corePadding ?? 0);
    posById.set(s.id, p);
    const isUnclaimed = s.tier === "unclaimed";
    const playerR = Math.max(4, PLAYER_R - (bandOf(k) - 1) * 0.6);
    nodes.push({
      id: s.id,
      x: p.x,
      y: p.y,
      tint: TIER_TINT[s.tier],
      kind: s.isSingularity ? "singularity" : isUnclaimed ? "unclaimed" : "player",
      // Empty seats render a touch smaller so claimed players read as primary.
      radius: s.isSingularity ? SINGULARITY_R : isUnclaimed ? playerR * 0.8 : playerR,
      isSelf: s.isSelf,
      tier: s.tier,
      lastActiveBlock: s.lastActiveBlock,
    });
  }

  // subagents orbit their parent on a small ring; emit permanent family edges
  const childrenByParent = new Map<string, SeatInput[]>();
  for (const s of seats) {
    if (!s.parentId) continue;
    const arr = childrenByParent.get(s.parentId) ?? [];
    arr.push(s);
    childrenByParent.set(s.parentId, arr);
  }
  for (const [parentId, kids] of childrenByParent) {
    const base = posById.get(parentId);
    if (!base) continue;
    kids.forEach((kid, i) => {
      const a = (2 * Math.PI * i) / kids.length;
      const x = base.x + orbit * Math.cos(a);
      const y = base.y + orbit * Math.sin(a);
      posById.set(kid.id, { x, y });
      // Subagents are tier-less: render a neutral marker (SUBAGENT_TINT) and carry
      // NO tier on the scene node, so nothing downstream colours/labels them as a
      // player Tier. Identity is conveyed via the family edge to the parent.
      nodes.push({ id: kid.id, x, y, radius: SUBAGENT_R, tint: SUBAGENT_TINT, kind: "subagent", isSelf: kid.isSelf });
      edges.push({ x1: base.x, y1: base.y, x2: x, y2: y, alpha: 0.85, kind: "family" });
    });
  }

  return { nodes, edges };
}
