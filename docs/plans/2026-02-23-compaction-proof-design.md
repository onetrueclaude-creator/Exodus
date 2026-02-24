# Compaction-Proof Memory — Design Document

**Date:** 2026-02-23
**Status:** Approved
**Branch:** zkagentic-monolith

---

## Problem

Claude Code's `/compact` command compresses conversation history to manage context limits. After compaction, Claude loses all prior session context — decisions made, features discussed, work completed, and the sequence of user intent.

## Goal

Automatically capture conversation history before every compaction and restore context after compaction, with no manual steps required.

---

## Three Output Files

All three files live at the **project root** and are **gitignored**.

| File | Contents | Written by |
|------|----------|------------|
| `compacted.md` | Full conversation (user + Claude), accumulated across all compactions | PreCompact bash hook |
| `compacted-summary.md` | LLM-generated summary of what was accomplished, accumulated | Claude (CLAUDE.md instruction before `/compact`) |
| `prompts.md` | User prompts only, accumulated across all compactions | PreCompact bash hook |

### `compacted.md` format

Each compaction appends a clearly delimited block:

```
<!-- compaction-block: 2026-02-23T10:30:00Z | session: abc123 | turns: 42 -->
## Session 2026-02-23 10:30 UTC

### [user]
user message content

### [assistant]
assistant response content

<!-- /compaction-block -->
```

HTML comment delimiters are machine-parseable by a future summarizer; markdown headers are human-readable. Both survive side by side.

### `prompts.md` format

User prompts only, each compaction appended as a section:

```
<!-- prompts-block: 2026-02-23T10:30:00Z | session: abc123 -->
## Prompts — 2026-02-23 10:30 UTC

1. first user message
2. second user message
3. third user message

<!-- /prompts-block -->
```

This file IS the eject target — reading `prompts.md` directly gives the full ordered list of user prompts across sessions. No extraction script needed.

### `compacted-summary.md` format

Claude writes a brief summary before compaction, appended with timestamp:

```
<!-- summary-block: 2026-02-23T10:30:00Z -->
## Summary — 2026-02-23 10:30 UTC

[Claude's summary of what was accomplished, key decisions, and open work]

<!-- /summary-block -->
```

---

## Two Hook Scripts

### `.claude/hooks/precompact.sh` (new)

**Trigger:** `PreCompact` hook event
**Input:** JSON via stdin containing `transcript_path`, `session_id`, `cwd`
**Action:**
1. Parse `transcript_path` (JSONL — one JSON object per line with `role` and `content` fields)
2. Append full conversation to `compacted.md` wrapped in a `compaction-block`
3. Extract user-role messages only and append to `prompts.md` wrapped in a `prompts-block`
4. Output standard hook JSON response (`continue: true`)

Uses `python3` for JSONL parsing (available on macOS, no extra deps).

### `.claude/hooks/session-start-compact.sh` (new)

**Trigger:** `SessionStart` hook event, matcher: `compact`
**Input:** JSON via stdin containing `cwd`
**Action:**
1. Check if `compacted-summary.md` exists at `cwd`
2. If yes: read it and output as `additionalContext` JSON (same pattern as superpowers' `session-start.sh`)
3. Include a note in the injected context that `compacted.md` contains full details and `prompts.md` lists all user prompts
4. If no summary exists: inject a note that `compacted.md` is available for manual review

---

## Configuration Changes

### `.claude/settings.json`

Add a top-level `"hooks"` key alongside existing `"permissions"` and `"enabledPlugins"`:

```json
"hooks": {
  "PreCompact": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash /Users/toyg/Exodus/.claude/hooks/precompact.sh",
          "timeout": 30
        }
      ]
    }
  ],
  "SessionStart": [
    {
      "matcher": "compact",
      "hooks": [
        {
          "type": "command",
          "command": "bash /Users/toyg/Exodus/.claude/hooks/session-start-compact.sh",
          "timeout": 10
        }
      ]
    }
  ]
}
```

### `.gitignore`

Add three entries:
```
compacted.md
compacted-summary.md
prompts.md
```

### `CLAUDE.md` — new section

Add a **Compaction Memory** section instructing Claude to:
1. Before running `/compact`: write a session summary to `compacted-summary.md` (append with timestamp block)
2. After compaction (post-SessionStart injection): confirm to the user that `compacted-summary.md` has been read, and note that `compacted.md` and `prompts.md` are available for full history and user prompt list respectively

---

## Data Flow

```
User types /compact
        │
        ▼
PreCompact hook fires
  ├── precompact.sh reads transcript_path
  ├── Appends full conversation → compacted.md
  └── Appends user prompts only → prompts.md

CLAUDE.md instruction (before compaction):
  └── Claude writes session summary → compacted-summary.md

Compaction occurs (context compressed)

SessionStart fires (matcher: "compact")
  └── session-start-compact.sh reads compacted-summary.md
      └── Outputs as additionalContext → injected into Claude's context

Claude resumes, reads injected summary, confirms to user
  ├── "I've read the session summary from compacted-summary.md"
  ├── Optionally reads compacted.md for full details
  └── User can view prompts.md for full prompt history
```

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `.claude/hooks/precompact.sh` | Create (new script) |
| `.claude/hooks/session-start-compact.sh` | Create (new script) |
| `.claude/settings.json` | Modify (add hooks section) |
| `.gitignore` | Modify (add 3 entries) |
| `CLAUDE.md` | Modify (add Compaction Memory section) |

No new packages, no new app code. All changes are in project configuration.

---

## Future Extension

The `<!-- compaction-block -->` and `<!-- prompts-block -->` delimiters are designed for a future summarizer script or slash command that can:
- Count total prompts across all sessions
- Extract prompts from a specific date range
- Generate a rolling summary from `compacted.md` blocks
- Feed `prompts.md` into an LLM to identify recurring themes

This is explicitly out of scope for this implementation.
