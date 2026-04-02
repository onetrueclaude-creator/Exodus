---
name: loop
description: Agentic Chain iteration cycle with frequency routing. Single /loop 1m drives three cadences — comms (1m), OODA (5m), reflect (1h). Reads loop_iteration from cursor, routes to the right depth.
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Loop — Agentic Chain Iteration Cycle

## Cold Start

```
/loop 1m
```

That's it. This skill handles all routing internally.

## Frequency Routing

Read `loop_iteration` from `.claude/internals/comms-cursor.md`. Then:

```
if iteration % 60 == 0  → REFLECT  (subsumes ooda + comms)
if iteration % 5 == 0   → OODA     (subsumes comms)
otherwise               → COMMS    (lightweight)
```

Increment `loop_iteration` and write it back to cursor after every iteration.

---

## COMMS (every 1m — iterations not divisible by 5)

Fast. ~5 seconds. No decide step.

1. Read `inbox.md` — check for new `## [MSG-NNN]` headings vs `last_inbox_seen`
2. Act on new messages: dispatch → ack + work, query → report, ack → note
3. Update `last_inbox_seen` in cursor

Output: `[Loop N: comms] inbox: N new`

---

## OODA (every 5m — iterations divisible by 5, not 60)

Medium. ~30-60 seconds. Includes comms.

1. **Prioritize** — run prioritize skill, write `.claude/priorities.md`
2. **Comms** — check `inbox.md` for parent dispatches
3. **State:**
   - Read `.claude/journal.md` — last entry
   - Check git status in `vault/agentic-chain/`
   - Quick test: `python3 -m pytest tests/ -x -q 2>&1 | tail -3`
4. **Decide** — one paragraph: where we stand, what changed, what next
5. **Act** — execute recommended action
6. **Update** — cursor, journal (1-line entry), send replies via outbox.md

Output:
```
[Loop N: ooda] prioritize: N scored, N stale
  comms: N new | git: [clean/N files] | tests: [pass/N fail]
  decide: <1-line summary of action taken>
```

---

## REFLECT (every 60m — iterations divisible by 60)

Deep. ~3-5 minutes. Includes ooda.

1. **OODA steps 1-6** (prioritize → comms → state → decide → act → update)
2. **Identity** — run self-scan skill
   - Confirm identity (agentic-chain, child of exodus)
   - Check parent lineage hash
3. **Priorities** — flag stale files (base >= 70 but not read in 48h)
4. **Journal rollup** — summarize recent entries, roll up if >10
5. If drift detected → write escalation to `outbox.md`

Output:
```
[Loop N: reflect] Identity: CONFIRMED/DRIFT | Priorities: N active, N stale
  Journal: N entries, rolled to M
```

---

## Cursor Format

`.claude/internals/comms-cursor.md` must include `loop_iteration`:

```yaml
---
last_inbox_seen: MSG-000
last_outbox_sent: MSG-000
loop_iteration: 0
updated: <ISO timestamp>
priority: 75
last_read: <ISO timestamp>
read_count: 0
---
```

Every loop run: read → increment `loop_iteration` → route → execute → write back.

## Constraints

- Never skip the decide step in OODA/reflect
- Always ack dispatches immediately before beginning work
- Process inbox messages in order (MSG-001 before MSG-002)
- Report blockers to parent via prompt-reply escalation
- Increment loop_iteration AFTER execution
