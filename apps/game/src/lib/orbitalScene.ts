import { phylloPos, bandOf } from "./orbitalGeometry";
import { assignRanks, type RankInput } from "./rankMapping";
import { FACTION_TINT, type SeatInput, type SceneModel, type SceneNode, type SceneEdge } from "../types/orbital";

export interface SceneOpts {
  radialScale: number; // c in radius=c·√k
  subagentOrbitFraction?: number; // default 0.4 of radialScale
}

const PLAYER_R = 7;
const SUBAGENT_R = 4;
const SINGULARITY_R = 13;

export function buildScene(seats: readonly SeatInput[], opts: SceneOpts): SceneModel {
  const c = opts.radialScale;
  const orbit = (opts.subagentOrbitFraction ?? 0.4) * c;

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
    const p = phylloPos(k, c);
    posById.set(s.id, p);
    nodes.push({
      id: s.id,
      x: p.x,
      y: p.y,
      tint: FACTION_TINT[s.faction],
      kind: s.isSingularity ? "singularity" : "player",
      radius: s.isSingularity ? SINGULARITY_R : Math.max(4, PLAYER_R - (bandOf(k) - 1) * 0.6),
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
      nodes.push({ id: kid.id, x, y, radius: SUBAGENT_R, tint: FACTION_TINT[kid.faction], kind: "subagent" });
      edges.push({ x1: base.x, y1: base.y, x2: x, y2: y, alpha: 0.85, kind: "family" });
    });
  }

  return { nodes, edges };
}
