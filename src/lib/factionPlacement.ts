import type { GridPosition } from '@/types/grid';
import type { Agent } from '@/types/agent';
import type { SubscriptionTier } from '@/types/subscription';

/** The four factions in the ZK Agentic Network galaxy */
export type Faction = 'community' | 'machines' | 'founders' | 'professional';

/** Grid spacing between nodes (matches params.py NODE_GRID_SPACING) */
export const NODE_GRID_SPACING = 10;

/**
 * Origin coordinates for each faction arm (first node on the arm).
 * Matches GENESIS_FACTION_MASTERS in params.py.
 */
export const FACTION_ARM_ORIGINS: Record<Faction, GridPosition> = {
  community:    { x: 0,   y: 10  },  // North
  machines:     { x: 10,  y: 0   },  // East
  founders:     { x: 0,   y: -10 },  // South
  professional: { x: -10, y: 0   },  // West
};

/**
 * Step direction for each faction arm (how to walk outward).
 * Each step moves NODE_GRID_SPACING units along the arm's cardinal direction.
 */
export const FACTION_ARM_STEPS: Record<Faction, GridPosition> = {
  community:    { x: 0,   y: 10  },  // North: +y
  machines:     { x: 10,  y: 0   },  // East:  +x
  founders:     { x: 0,   y: -10 },  // South: -y
  professional: { x: -10, y: 0   },  // West:  -x
};

/**
 * Walk outward along a faction's arm from the Faction Master homenode
 * and return the first unclaimed grid-aligned position.
 *
 * A position is "claimed" if any agent with a non-empty userId exists
 * at that coordinate.
 */
export function computeFactionSpawnPoint(
  faction: Faction,
  agents: Agent[],
): GridPosition {
  const origin = FACTION_ARM_ORIGINS[faction];
  const step = FACTION_ARM_STEPS[faction];

  // Build a set of claimed positions for O(1) lookups
  const claimed = new Set<string>();
  for (const agent of agents) {
    if (agent.userId) {
      claimed.add(`${agent.position.x},${agent.position.y}`);
    }
  }

  // Walk outward from origin along the arm direction
  let x = origin.x;
  let y = origin.y;

  // Safety limit to prevent infinite loops (1000 steps = 10,000 grid units)
  const MAX_STEPS = 1000;
  for (let i = 0; i < MAX_STEPS; i++) {
    const key = `${x},${y}`;
    if (!claimed.has(key)) {
      return { x, y };
    }
    x += step.x;
    y += step.y;
  }

  // Fallback (should never be reached in practice)
  return { x, y };
}

/**
 * Maps a subscription tier to its corresponding faction.
 *
 * - COMMUNITY  → community (North arm)
 * - PROFESSIONAL → professional (West arm)
 * - MAX → founders (South arm)
 */
export function subscriptionToFaction(tier: SubscriptionTier): Faction {
  const mapping: Record<SubscriptionTier, Faction> = {
    COMMUNITY: 'community',
    PROFESSIONAL: 'professional',
    MAX: 'founders',
  };
  return mapping[tier];
}
