/**
 * Focus-request retention rule (W6, task #23).
 *
 * The orbital canvas consumes a one-shot `focusRequest` each tick to recenter the
 * camera. The bug: it cleared the request even when the target node wasn't in the
 * scene yet (the init→rebuild race), silently dropping focus — a dead "Home Node"
 * button / no recenter. Rule: clear the request only once its target was found
 * (camera moved) OR it has aged out; otherwise retain it so the next tick retries.
 *
 * The canvas mirrors this inline (it runs inside a PixiJS ticker, untestable in
 * jsdom); this pure function is the documented, unit-tested source of the rule.
 */
export function shouldClearFocusRequest(
  found: boolean,
  fr: { ts: number } | null,
  nowMs: number,
  maxAgeMs = 5000,
): boolean {
  if (!fr) return false;
  return found || nowMs - fr.ts > maxAgeMs;
}
