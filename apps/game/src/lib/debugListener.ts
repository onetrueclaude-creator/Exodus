/**
 * Debug listener — subscribes to every Zustand store mutation.
 * Logs structured diffs to the browser console and pushes entries
 * to an in-memory ring buffer that the DebugOverlay component reads.
 */
import { useGameStore } from "@/store";

export interface DebugEntry {
  id: number;
  ts: number;
  label: string;
  detail: string;
}

const MAX_ENTRIES = 200;
let seq = 0;
const buffer: DebugEntry[] = [];
let listeners: Array<() => void> = [];

/** External subscribers (e.g. React components) */
export function subscribeDebug(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
export function getDebugEntries(): readonly DebugEntry[] {
  return buffer;
}

/** Rate-limit server POSTs — batch flushes at most once per second */
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingFlush: Array<{ label: string; detail: string }> = [];

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const batch = pendingFlush.splice(0);
    if (batch.length === 0) return;
    fetch("/api/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    }).catch(() => {});
  }, 1000);
}

function push(label: string, detail: string) {
  const entry: DebugEntry = { id: ++seq, ts: Date.now(), label, detail };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  listeners.forEach((l) => l());
  // Batch server POSTs — flush at most once per second
  pendingFlush.push({ label, detail });
  scheduleFlush();
}

/* ── Diff engine ─────────────────────────────────────── */

type State = ReturnType<typeof useGameStore.getState>;

const SKIP_KEYS = new Set(["turnInterval"]); // noisy / non-serialisable

function diffState(prev: State, next: State) {
  const changes: { key: string; from: unknown; to: unknown }[] = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof State>;

  for (const key of allKeys) {
    if (SKIP_KEYS.has(key as string)) continue;
    if (typeof prev[key] === "function") continue; // skip actions
    if (prev[key] !== next[key]) {
      changes.push({ key: key as string, from: prev[key], to: next[key] });
    }
  }
  return changes;
}

function describeChange(c: { key: string; from: unknown; to: unknown }): {
  label: string;
  detail: string;
} {
  const { key, from, to } = c;

  // Agents map — detect add / remove / update
  if (key === "agents") {
    const prevAgents = (from ?? {}) as Record<string, unknown>;
    const nextAgents = (to ?? {}) as Record<string, unknown>;
    const prevIds = new Set(Object.keys(prevAgents));
    const nextIds = new Set(Object.keys(nextAgents));
    const added = [...nextIds].filter((id) => !prevIds.has(id));
    const removed = [...prevIds].filter((id) => !nextIds.has(id));
    const changed = [...nextIds].filter(
      (id) => prevIds.has(id) && prevAgents[id] !== nextAgents[id]
    );

    const parts: string[] = [];
    if (added.length)
      parts.push(
        `+${added.length} added (${added.slice(0, 3).join(", ")}${added.length > 3 ? "..." : ""})`
      );
    if (removed.length) parts.push(`-${removed.length} removed`);
    if (changed.length) {
      // Show what changed on first modified agent
      const first = changed[0];
      const pa = prevAgents[first] as Record<string, unknown>;
      const na = nextAgents[first] as Record<string, unknown>;
      const fields = Object.keys(na).filter((f) => pa[f] !== na[f]);
      parts.push(`~${changed.length} updated [${first}]: ${fields.join(", ")}`);
    }
    return { label: "agents", detail: parts.join(" | ") || "no diff" };
  }

  // Haiku array
  if (key === "haiku") {
    const prevLen = Array.isArray(from) ? (from as unknown[]).length : 0;
    const nextLen = Array.isArray(to) ? (to as unknown[]).length : 0;
    return { label: "haiku", detail: `${prevLen} → ${nextLen}` };
  }

  // Scalar changes
  if (typeof to === "number" || typeof to === "string" || typeof to === "boolean" || to === null) {
    return { label: key, detail: `${JSON.stringify(from)} → ${JSON.stringify(to)}` };
  }

  // Object changes (camera, diplomacy, planets, etc.)
  try {
    return {
      label: key,
      detail: `${JSON.stringify(from).slice(0, 80)} → ${JSON.stringify(to).slice(0, 80)}`,
    };
  } catch {
    return { label: key, detail: "[complex change]" };
  }
}

/* ── Lifecycle ───────────────────────────────────────── */

let unsub: (() => void) | null = null;

export function startDebugListener() {
  if (unsub) return; // already running

  let prev = useGameStore.getState();

  unsub = useGameStore.subscribe((next) => {
    const changes = diffState(prev, next);
    for (const c of changes) {
      const { label, detail } = describeChange(c);
      // Console
      console.log(
        `%c[DEBUG] %c${label}%c ${detail}`,
        "color: #888",
        "color: #0ff; font-weight: bold",
        "color: #ccc"
      );
      // Buffer
      push(label, detail);
    }
    prev = next;
  });

  push("system", "Debug listener started");
  console.log(
    "%c[DEBUG] Listener active — tracking all store mutations",
    "color: #0f0; font-weight: bold"
  );
}

export function stopDebugListener() {
  if (unsub) {
    unsub();
    unsub = null;
    push("system", "Debug listener stopped");
    console.log("%c[DEBUG] Listener stopped", "color: #f00");
  }
}
