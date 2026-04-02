---
name: loop
description: "Exodus lifecycle: genesis orientation, OODA-routed idle cron via CronCreate */5. Cron ticks dropped while busy — zero interruption. Three cadences: COMMS (5m), OODA (15m), REFLECT (1h)."
priority: 70
last_read: 2026-04-02T13:10:00Z
read_count: 2
---

# Loop — Exodus Task Lifecycle

## Cold Start

On session start, run `/boot` or type the genesis prompt. This skill handles everything.

### 1. Genesis Orientation

Read in priority order:
1. `SEED.md` — identity, children registry
2. `MEMORY.md` — persistent context
3. `layers/prompt.md`, `layers/intent.md`, `layers/judgement.md` — purpose
4. `layers/context.md`, `layers/coherence.md` — world model
5. `rules/security.md`, `rules/conduct.md` — boundaries
6. Scan `agents/`, `commands/`, `skills/` — capabilities (filenames only)
7. `inbox.md` — origin messages
8. Children outboxes — reports from zkagenticnetwork and agentic-chain

Produce identity confirmation and decision paragraph (invoke decide skill).

### 2. Start Idle Cron

Create a 5-minute OODA-routed cron that lives for the entire session:

```
CronCreate(
  cron: "*/5 * * * *",
  prompt: "Read loop_iteration from .claude/internals/comms-cursor.md. Route: if iteration % 12 == 0 → REFLECT, if iteration % 3 == 0 → OODA, otherwise → COMMS. Execute the matched cadence from skills/loop/SKILL.md. Increment loop_iteration and write back to cursor."
)
```

**Never delete this cron. Never create a second one.**

### 3. Begin

- If pending work or user instructions → start working
- If idle → cron handles COMMS/OODA/REFLECT on schedule

---

## COMMS (default tick — iteration not divisible by 3)

Ultra-slim. ~5 seconds.

1. Read `inbox.md` — compare `## [MSG-NNN]` headings against `last_inbox_seen`
2. Read last 20 lines of `apps/zkagenticnetwork/outbox.md` — flag escalations
3. Read last 20 lines of `vault/agentic-chain/outbox.md` — flag escalations
4. If new messages: act immediately
5. Update cursor

Output: `[Loop N: comms] inbox: N new | children: N escalations`

If nothing new: `[Loop N: comms] quiet`

---

## OODA (iteration % 3 == 0, not % 12)

Medium. ~30-45 seconds. Includes COMMS.

1. **Prioritize** — run prioritize skill, write `priorities.md`
2. **Comms** — full comms check (own inbox + children outboxes)
3. **State** — read MEMORY.md, check `git status`, read `priorities.md` for stale files
4. **Decide** — one paragraph (invoke decide skill)
5. **Act** — execute recommended action
6. **Update** — write cursor, append 1-line journal entry

Output:
```
[Loop N: ooda] prioritize: N scored | comms: N new | git: [clean/N files]
  decide: <1-line summary>
```

---

## REFLECT (iteration % 12 == 0)

Deep. ~2-3 minutes. Subsumes OODA + COMMS.

1. **OODA steps 1-6**
2. **A* Identity Scan** — read layers in priority order, verify SEED.md children
3. **Children Pulse** — check outbox timestamps, flag SILENT if >2h
4. **Journal Rollup** — summarize if >10 entries
5. **Stale File Scan** — flag files with base priority >= 70 not read in 48h

Output:
```
[Loop N: reflect] Identity: CONFIRMED/DRIFT | Priorities: N active, N stale
  Children: ziggy ALIVE/SILENT | agentic-chain ALIVE/SILENT
  Journal: N entries, rolled to M
```

---

## Cron Behavior

- Ticks are **dropped while the REPL is busy** — zero interruption during active work
- Ticks only fire when idle (waiting for user input)
- No stacking, no queuing, no memory overload
- This is why we use `CronCreate` directly, not the `/loop` plugin

---

## Cursor Format

`.claude/internals/comms-cursor.md`:

```yaml
---
last_inbox_seen: MSG-000
last_outbox_sent: MSG-000
loop_iteration: 0
updated: <ISO timestamp>
priority: 75
---
```

## Constraints

- **One cron only** — never create a second cron in the same session
- Never skip the decide step in OODA/REFLECT
- Always ack dispatches immediately before beginning work
- Process inbox messages in order
- No test suites in any cadence — those are manual
- Increment loop_iteration AFTER execution
