---
name: self-scan
description: A* priority-weighted scan of Exodus's own .claude/ directory. Produces an orientation paragraph with current identity, inbox/outbox state, and active work. Run at session start and on identity check cron.
priority: 70
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Self-Scan — A* Priority Scan of Exodus's .claude/

## When This Skill Activates

- Session start (genesis state)
- Identity check cron (hourly or on demand)
- Any time identity drift is suspected (e.g., long pause, context compression)

## Priority Source

Read `.claude/priorities.md` for current effective priorities and scan order.
If `priorities.md` is missing or stale (>1h old), fall back to base priorities in each file's frontmatter.

## Scan Procedure

1. Read `CLAUDE.md` (project root) — confirm project identity (ZK Agentic Network, 4 domains)
2. Read `.claude/SEED.md` — confirm lineage, children list, domain table
3. Read `.claude/journal.md` — last session entry (what was being worked on?)
4. Check `.claude/internals/comms-cursor.md` — last_inbox_seen + last_outbox_sent
5. Read last 20 lines of `inbox.md` — any unprocessed messages?
6. Read last 20 lines of `outbox.md` — what was last reported?
7. Scan `.claude/skills/` filenames — confirm capability set is intact

## Output Format

After scanning, produce this orientation paragraph:

```
[Self-Scan] I am Exodus, child of origin, ZK Agentic Network blockchain dApp.
Domains: zkagentic.com (marketing), zkagentic.ai (monitor), api.zkagentic.ai (API), zkagenticnetwork.com (game).
Last inbox: MSG-[N] (origin). Last outbox: MSG-[N] (to origin).
Journal: [1-line summary of last session].
Current work: [active task or "awaiting dispatch"].
Capabilities: [list skill names].
Identity: CONFIRMED / DRIFT DETECTED (explain if drift).
```

## Identity Drift Signals

- CLAUDE.md doesn't mention ZK Agentic Network → DRIFT: project identity may have been overwritten
- SEED.md domains table missing or changed → DRIFT: domain mapping may be stale
- Journal date >7 days old → STALE: write new session entry
- Cursor last_outbox_sent < last known MSG → DRIFT: cursor write may have failed
- Skills count changed unexpectedly → DRIFT: skills may have been added/removed without logging

## Cron Integration

This skill is the body of the identity check cron:
1. Run self-scan → produce orientation paragraph
2. If drift detected → escalate to origin via prompt-reply (type: escalation)
3. If all clear → append brief entry to journal.md
4. No outbox message needed unless drift found
