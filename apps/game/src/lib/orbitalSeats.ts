import type { SeatInput, OrbitalTier } from "@/types/orbital";

/** Synthetic id for the Singularity core node (rendered separately from players). */
export const SINGULARITY_ID = "__singularity__";

/** A fixed ring of empty, claimable "open seats" is shown so newcomers can see
 *  where to enter the lattice. Capped — claiming one frees a slot for the next. */
export const OPEN_SEAT_COUNT = 8;

/** The store-agent fields the seat builder reads. `Agent` satisfies this structurally. */
export interface SeatAgent {
  id: string;
  userId?: string; // '' for unclaimed coordinate slots
  parentAgentId?: string; // present → subagent (orbits its parent)
  activity?: number; // real chain activity (rank signal)
  isSingularity?: boolean; // the chain origin claim — rendered as the core, not a player
  isSelf?: boolean; // the current player's own node (drives the "YOU" marker)
  tier?: OrbitalTier; // real player Tier when known
  stakedCpu?: number; // fallback proxy when chain activity is absent (mock/offline)
  securingCpu?: number;
  lastActiveBlock?: number; // latest securing/proof block (drives the activity pulse)
}

/**
 * Map store agents → orbital seats. Claimed players + their subagents seat around
 * the Singularity core; up to {@link OPEN_SEAT_COUNT} unclaimed nodes render as
 * grey, claimable "open seats" so a newcomer can see where to enter. The chain
 * origin claim (is_singularity) is excluded — the core is synthesized separately.
 *
 * Colour rules:
 *  - the local player's own node is the UNIQUE Founder/amber marker (isSelf);
 *  - every other claimed player gets ONE consistent player colour — no random
 *    per-id tiers, and never Founder (real per-player tiers arrive with the
 *    DB→chain wiring);
 *  - empty seats are grey ("unclaimed"), tier-less until a player acquires them.
 */
export function seatsFromAgents(agents: readonly SeatAgent[]): SeatInput[] {
  const seats: SeatInput[] = [];
  const open: SeatAgent[] = [];
  for (const a of agents) {
    if (a.isSingularity) continue; // the origin claim is the core, synthesized below
    const isSubagent = !!a.parentAgentId;
    const isClaimedPlayer = (a.userId ?? "") !== "";
    if (!isSubagent && !isClaimedPlayer) {
      open.push(a); // empty seat — collected and capped below
      continue;
    }
    seats.push({
      id: a.id,
      // Founder/amber is reserved for the local node; subagents are tier-less
      // (placeholder, rendered with SUBAGENT_TINT); every other player is one
      // consistent colour — deterministic, never Founder.
      tier: isSubagent ? "community" : a.isSelf ? "founder" : "professional",
      parentId: a.parentAgentId,
      isSelf: a.isSelf,
      activity: a.activity ?? (a.stakedCpu ?? 0) + (a.securingCpu ?? 0),
      lastActiveBlock: a.lastActiveBlock,
    });
  }
  // A fixed ring of grey, claimable open seats — empty nodes with no player yet.
  for (const a of open.slice(0, OPEN_SEAT_COUNT)) {
    seats.push({ id: a.id, tier: "unclaimed", activity: 0 });
  }
  seats.push({ id: SINGULARITY_ID, tier: "singularity", isSingularity: true, activity: 0 });
  return seats;
}
