// W3 #61 — deterministic visual-test harness primitives. Strictly opt-in: these
// only take effect on the dev-only /visual/* routes (?visualTest=1). Zero effect
// on normal play. Pure + unit-tested; the OrbitalCanvas freeze seam consumes the
// constants, the harness routes consume the fixture + the mode/route guards.
import type { Agent } from "@/types";
import { generateMockAgents } from "@/services/mockData";

/** True ONLY when the URL/search carries visualTest=1. */
export function isVisualTestMode(
  search: string | URLSearchParams | null | undefined,
): boolean {
  if (!search) return false;
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return params.get("visualTest") === "1";
}

/** /visual/* routes must never exist in a production build. */
export function isVisualRouteBlocked(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Manual-ticker freeze: run this many fixed-dt physics steps, then stop. */
export const VISUAL_SETTLE_STEPS = 180;
/** Fixed per-step deltaMS so the settled layout is identical every run. */
export const VISUAL_FRAME_MS = 1000 / 60;

/**
 * A fixed, deterministic agent set for the canvas baseline. Derived from the
 * seed-deterministic mock source; the first agent is marked as the player's own
 * node so the self-ring renders. Frozen subset keeps the scene small + stable.
 *
 * generateMockAgents has four nondeterministic fields — position (randomPosition),
 * createdAt (Date.now), and density + storageSlots (Math.random). NONE of them are
 * read by the seat builder (it keys on id/userId/tier/activity/isSelf), so we simply
 * OVERWRITE them with fixed, index-derived values. This makes the fixture identical
 * every run WITHOUT patching any globals — determinism is fully contained here.
 */
export function buildVisualFixture(): Agent[] {
  const FIXTURE_TIMESTAMP = 1782305600000; // fixed; createdAt is render-irrelevant but must be stable
  const agents = generateMockAgents(0).slice(0, 6).map((a, i) => ({
    ...a,
    position: { x: i * 40 - 100, y: i * 40 - 100 },
    createdAt: FIXTURE_TIMESTAMP,
    density: 0.5,
    storageSlots: 4,
  }));
  if (agents.length > 0) {
    agents[0] = { ...agents[0], isSelf: true, userId: "visual-self" };
  }
  return agents;
}
