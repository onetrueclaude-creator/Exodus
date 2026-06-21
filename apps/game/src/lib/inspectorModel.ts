import type { Agent, Tier } from "@/types";
import { TIER_LABELS, TIER_CROWN, TIER_TINT } from "@/types";
import { SUBAGENT_TINT } from "@/types/orbital";
import { SINGULARITY_ID, seatsFromAgents } from "@/lib/orbitalSeats";
import { assignRanks } from "@/lib/rankMapping";
import { bandOf } from "@/lib/orbitalGeometry";

/**
 * View-model for the NodeInspector toast. PURE + testable — the React component
 * only renders this shape, all derivation (rank/band/tier/owner) lives here so it
 * stays in lockstep with the renderer's own seat/rank logic (orbitalSeats + rankMapping).
 */
export type InspectorModel =
  | {
      kind: "singularity";
      title: string;
      subtitle: string;
      tint: number;
    }
  | {
      kind: "player";
      title: string; // short id (or "Your Homenode")
      isSelf: boolean;
      tier: Tier;
      tierLabel: string;
      crown: string; // 👑 for founder, "" otherwise
      tint: number;
      rank: number;
      band: number;
      owner: string; // short owner id
      activity: number;
    }
  | {
      // Subagents are TIER-LESS: they belong to their parent player and carry no
      // Tier of their own, so the model omits tier/tierLabel/crown entirely. The
      // inspector renders "Subagent" + owner/parent, never a Tier row.
      kind: "subagent";
      title: string; // short id
      isSelf: boolean;
      tint: number; // neutral subagent marker
      rank: number; // subagents inherit 0 (not seated by rank)
      band: number;
      owner: string; // short owner id (the parent player's owner)
      parent: string; // short id of the parent player node
      activity: number;
    };

/** Short, stable display id (first 8 chars) for opaque node ids. */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

/**
 * Build the inspector view-model for the focused node.
 *
 * - `SINGULARITY_ID` is synthetic (never in `agents`) → the protocol-core card.
 * - A real player/subagent is read from `agents[id]`; rank/band are recomputed from
 *   the SAME seat → rank pipeline the orbital renderer uses, so the toast and the
 *   canvas always agree on a node's seat.
 * - Returns `null` when the id is absent / unknown (component renders nothing).
 */
export function inspectorModelFor(
  focusedNodeId: string | null,
  agents: Record<string, Agent>
): InspectorModel | null {
  if (!focusedNodeId) return null;

  if (focusedNodeId === SINGULARITY_ID) {
    return {
      kind: "singularity",
      title: "Singularity",
      subtitle: "protocol core (gateway + accumulator)",
      tint: TIER_TINT.singularity,
    };
  }

  const agent = agents[focusedNodeId];
  if (!agent) return null;

  // Recompute rank/band the same way OrbitalCanvas does: seat the agents, rank the
  // top-level (non-subagent) seats, then read this node's rank. Subagents inherit 0.
  const seats = seatsFromAgents(Object.values(agents));
  const ranks = assignRanks(
    seats
      .filter((s) => !s.parentId)
      .map((s) => ({ id: s.id, activity: s.activity, isSingularity: s.isSingularity }))
  );
  const rank = ranks.get(focusedNodeId) ?? 0;
  const isSubagent = !!agent.parentAgentId;
  const isSelf = !!agent.isSelf;
  const activity = agent.activity ?? (agent.stakedCpu ?? 0) + (agent.securingCpu ?? 0);

  // Subagents are TIER-LESS: omit all Tier fields and render a neutral marker.
  // Identity is their owner + the parent player they belong to.
  if (isSubagent) {
    const parentAgent = agents[agent.parentAgentId as string];
    return {
      kind: "subagent",
      // Coordinate-free identity: node ids are cell-keyed in mock mode, so show the
      // role (not the raw id). The parent reads as "Homenode" when it's the player's own.
      title: "Sub-agent",
      isSelf,
      tint: SUBAGENT_TINT,
      rank,
      band: bandOf(rank),
      // Prefer the human owner-name (chain owner_name) when present.
      owner: agent.username || shortId(agent.userId || "unknown"),
      parent: parentAgent?.isPrimary ? "Homenode" : shortId(agent.parentAgentId as string),
      activity,
    };
  }

  const seat = seats.find((s) => s.id === focusedNodeId);
  // Normalize to a valid player Tier — guards against stray values (e.g. a
  // SubscriptionTier or unset field) that would otherwise yield an undefined tint.
  const rawTier = seat?.tier ?? agent.tier;
  const tier: Tier =
    rawTier === "community" || rawTier === "professional" || rawTier === "founder"
      ? rawTier
      : "community";

  return {
    kind: "player",
    // Prefer the human owner-name (chain owner_name) for a non-self node's title.
    title: isSelf ? "Your Homenode" : agent.username || shortId(focusedNodeId),
    isSelf,
    tier,
    tierLabel: TIER_LABELS[tier],
    crown: TIER_CROWN[tier],
    tint: TIER_TINT[tier],
    rank,
    band: bandOf(rank),
    // Prefer the human owner-name (chain owner_name) when present.
    owner: agent.username || shortId(agent.userId || "unknown"),
    activity,
  };
}
