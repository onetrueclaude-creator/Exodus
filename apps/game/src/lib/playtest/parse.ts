import type { Severity, UxAssessment, UxTicket } from "@/lib/playtest/types";

const SEVERITIES: readonly Severity[] = ["blocker", "confusing", "polish"];

/**
 * Pull the first balanced {...} JSON object out of arbitrary model text.
 * String-aware: braces inside quoted strings (e.g. "issue":"use {prop}") do NOT
 * affect depth, so realistic suggestions referencing code/template syntax don't
 * truncate the extraction. Handles escaped quotes within strings.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Tolerant parser: extracts the JSON object (ignoring code fences / prose),
 * validates + coerces each ticket. NEVER throws — bad output → empty tickets.
 */
export function parseAssessment(modelText: string, screen: string): UxAssessment {
  const raw = extractJsonObject(modelText ?? "");
  if (!raw) return { tickets: [] };
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { tickets: [] };
  }
  const list = (obj as { tickets?: unknown })?.tickets;
  if (!Array.isArray(list)) return { tickets: [] };

  const tickets: UxTicket[] = [];
  for (const item of list) {
    const t = item as Partial<UxTicket>;
    if (typeof t?.issue !== "string" || !t.issue) continue; // issue is required
    const severity: Severity = SEVERITIES.includes(t.severity as Severity)
      ? (t.severity as Severity)
      : "polish"; // unknown → least-severe default
    tickets.push({
      screen,
      severity,
      issue: t.issue,
      suggestion: typeof t.suggestion === "string" ? t.suggestion : "",
    });
  }
  return { tickets };
}
