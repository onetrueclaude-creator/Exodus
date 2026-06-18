import type { SeatInput, OrbitalTier } from "@/types/orbital";

/** Synthetic id for the Singularity core node (rendered separately from players). */
export const SINGULARITY_ID = "__singularity__";

/** Deterministic per-id cosmetic colour across the player palette (varied/alive).
 *  Phase-2 placeholder until the chain serves a real tier per node. */
const PLAYER_TIERS: OrbitalTier[] = ["community", "professional", "founder"];
export function tierByHash(id: string): OrbitalTier {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PLAYER_TIERS[h % PLAYER_TIERS.length];
}

/** The store-agent fields the seat builder reads. `Agent` satisfies this structurally. */
export interface SeatAgent {
  id: string;
  userId?: string; // '' for unclaimed coordinate slots
  parentAgentId?: string; // present → subagent (orbits its parent)
  activity?: number; // real chain activity (rank signal)
  isSingularity?: boolean; // the chain origin claim — rendered as the core, not a player
  isSelf?: boolean; // the current player's own node (drives the "YOU" marker)
  tier?: OrbitalTier; // real player Tier when known (overrides the per-id hash colour)
  stakedCpu?: number; // fallback proxy when chain activity is absent (mock/offline)
  securingCpu?: number;
}

/**
 * Map store agents → orbital seats. Per the phyllotaxis spec the graph seats only
 * **claimed players + their subagents** around a central Singularity; the retired
 * coordinate-grid's unclaimed nodes are NOT seated. The Singularity core is
 * synthesized separately, so the chain's origin claim (is_singularity) is excluded
 * from the player ring. Activity is the chain's real score, falling back to the
 * staked+securing CPU proxy when the chain hasn't supplied one (mock/offline).
 */
export function seatsFromAgents(agents: readonly SeatAgent[]): SeatInput[] {
  const seats: SeatInput[] = [];
  for (const a of agents) {
    const isSubagent = !!a.parentAgentId;
    const isClaimedPlayer = (a.userId ?? "") !== "" && !a.isSingularity;
    if (!isSubagent && !isClaimedPlayer) continue; // drop unclaimed slots + the origin
    seats.push({
      id: a.id,
      // Subagents are TIER-LESS: they belong to their parent player and must not
      // carry (or be coloured by) a player Tier. We deliberately do NOT assign a
      // per-id `tierByHash` tier to a child — only top-level players get one. The
      // placeholder "community" here is structural (SeatInput.tier is required);
      // downstream consumers key off `parentId` and ignore a subagent's tier,
      // rendering the neutral SUBAGENT_TINT marker instead.
      tier: isSubagent ? "community" : (a.tier ?? tierByHash(a.id)),
      parentId: a.parentAgentId,
      isSelf: a.isSelf,
      activity: a.activity ?? (a.stakedCpu ?? 0) + (a.securingCpu ?? 0),
    });
  }
  seats.push({ id: SINGULARITY_ID, tier: "singularity", isSingularity: true, activity: 0 });
  return seats;
}
