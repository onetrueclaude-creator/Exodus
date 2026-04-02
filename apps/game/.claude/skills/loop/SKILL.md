---
name: loop
description: "ZkAgenticNetwork lifecycle: genesis orientation, uninterrupted work, 1m idle-only inbox poll via CronCreate. Cron ticks are dropped while working — zero interruption, zero stacking."
priority: 70
last_read: 2026-04-02T13:00:00Z
read_count: 2
---

# Loop — ZkAgenticNetwork Task Lifecycle

## Cold Start

On session start, do these in order:

### 1. Genesis Orientation

Read in priority order:
1. `.claude/SEED.md` — identity, parent hash
2. `.claude/layers/prompt.md` — what you do
3. `.claude/layers/intent.md` — priorities and trade-offs
4. `.claude/layers/context.md` — what you know
5. `CLAUDE.md` — conventions, patterns, changelog
6. `.claude/priorities.md` — file registry

Produce one-line identity confirmation:
```
[Genesis] zkagenticnetwork (game-ui child of exodus). Stack: Next.js 16 + React 19 + PixiJS 8. Ready.
```

### 2. Read Inbox

- Read `inbox.md` — find all `## [MSG-NNN]` headings
- Read `.claude/internals/comms-cursor.md` — get `last_inbox_seen`
- Identify unprocessed dispatches

### 3. Start Idle Cron

Create a 1-minute inbox poll that lives for the entire session:

```
CronCreate(
  cron: "*/1 * * * *",
  prompt: "Read inbox.md. Compare ## [MSG-NNN] headings against last_inbox_seen in .claude/internals/comms-cursor.md. If new messages: ack the dispatch via outbox.md, update cursor, then begin work. If no new messages: output '[Comms] quiet' and nothing else."
)
```

**Never delete this cron.** It only fires while idle — ticks are silently dropped during active work.

### 4. Begin

- If unprocessed dispatches exist → ack via outbox.md → start working
- If inbox empty → go idle, cron handles it

---

## Working

While executing a dispatched task:

- **Uninterrupted.** Cron ticks are dropped. No polling, no timers, no identity checks.
- **Between sub-tasks:** quick state check — git status, any blockers? Continue or pivot?
- **Focus on the dispatch.** Complete it fully before checking for anything else.

---

## Task Complete

When a dispatched task is finished:

1. **Report** — write completion message to `outbox.md`:
   ```markdown
   ## [MSG-NNN] <ISO timestamp>
   **From:** zkagenticnetwork
   **Priority:** high
   **Type:** progress
   **Re:** MSG-XXX (original dispatch)

   <summary of work done, files changed, decisions made>

   Status: **DONE** — awaiting review

   ---
   ```

2. **Check inbox immediately** — don't wait for cron. Read `inbox.md` for next dispatch.

3. **If next dispatch exists** → ack → start working (stay in working mode)

4. **If inbox empty** → go idle. Cron resumes firing within 1m.

---

## Idle

Nothing to do. Cron fires every 1m, reads inbox.md.

- If dispatch arrives → cron picks it up → ack → start working
- If nothing → `[Comms] quiet`

---

## Identity and Reflect

Ziggy does NOT run timed REFLECT cycles. Identity refreshing happens:

- **At session start** — genesis orientation (see Cold Start above)
- **When dispatched** — parent can dispatch a reflect task: "Run self-scan, verify identity, check layers, journal rollup"
- **On long sessions** — if parent dispatches a reflect directive after noticing Ziggy has been running for hours

This keeps identity checks under parent control. Ziggy's job is to work, not to self-monitor.

---

## Cursor Format

`.claude/internals/comms-cursor.md`:

```yaml
---
last_inbox_seen: MSG-003
last_outbox_sent: MSG-005
loop_iteration: 0
updated: <ISO timestamp>
priority: 75
last_read: <ISO timestamp>
read_count: 0
---
```

`loop_iteration` is no longer used for frequency routing (no modulo cadences). Kept for historical tracking only.

## Constraints

- **Never delete the idle cron** — it lives for the whole session
- **Never create multiple crons** — one inbox poll is enough
- Always ack dispatches immediately before beginning work
- Process inbox messages in order (MSG-001 before MSG-002)
- Report blockers to parent via outbox.md escalation
- No tsc, no vitest, no test suites unless explicitly dispatched
