/**
 * Action logger — logs user UI actions and chain API calls.
 *
 * Complements debugListener (which tracks store mutations) by capturing
 * the user intent BEFORE it reaches the store: button clicks, menu
 * selections, API calls, and their results.
 *
 * All entries go to console + the debug listener buffer.
 */

import { startDebugListener } from "./debugListener";

// Ensure debug listener is running (idempotent)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  startDebugListener();
}

type ActionCategory = "click" | "menu" | "chain-call" | "chain-ok" | "chain-err" | "navigate" | "init";

const CATEGORY_STYLE: Record<ActionCategory, string> = {
  click: "color: #f59e0b; font-weight: bold",      // amber
  menu: "color: #8b5cf6; font-weight: bold",        // purple
  "chain-call": "color: #06b6d4; font-weight: bold", // cyan
  "chain-ok": "color: #22c55e; font-weight: bold",   // green
  "chain-err": "color: #ef4444; font-weight: bold",  // red
  navigate: "color: #3b82f6; font-weight: bold",     // blue
  init: "color: #6b7280; font-weight: bold",          // gray
};

export function logAction(category: ActionCategory, action: string, detail?: string) {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return;

  const ts = new Date().toLocaleTimeString("en-GB", { hour12: false }) +
    "." + String(Date.now() % 1000).padStart(3, "0");

  const prefix = `[${category.toUpperCase()}]`;
  const detailStr = detail ? ` — ${detail}` : "";

  console.log(
    `%c${prefix}%c ${action}%c${detailStr}`,
    CATEGORY_STYLE[category],
    "color: #e5e5e5",
    "color: #888",
  );
}
