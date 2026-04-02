---
name: self-scan
description: A* priority-weighted scan of zkagenticnetwork's own .claude/ directory. Produces an orientation paragraph with current identity, inbox/outbox state, and active work. Run at session start and on identity check.
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Self-Scan — A* Priority Scan of ZkAgenticNetwork's .claude/

## When This Skill Activates

- Session start (genesis state)
- Identity check (on demand)
- Any time identity drift is suspected

## Priority Source

Read `.claude/priorities.md` for current effective priorities and scan order.
If `priorities.md` is missing or stale (>1h old), fall back to base priorities in each file's frontmatter.

## Scan Procedure

1. Read `CLAUDE.md` (project root at `apps/zkagenticnetwork/`) — confirm project identity (game UI)
2. Read `.claude/SEED.md` — confirm lineage (child of exodus), parent hash, role
3. Read `.claude/journal.md` — last session entry (what was being worked on?)
4. Check `.claude/internals/comms-cursor.md` — last_inbox_seen + last_outbox_sent
5. Read last 20 lines of `inbox.md` — any unprocessed messages?
6. Read last 20 lines of `outbox.md` — what was last reported?
7. Scan `.claude/skills/` filenames — confirm capability set is intact

## Output Format

After scanning, produce this orientation paragraph:

```
[Self-Scan] I am zkagenticnetwork, child of exodus, game UI for ZK Agentic Network.
Stack: Next.js 16 + React 19 + PixiJS 8 + Zustand 5 + Tailwind CSS 4.
Deploy: zkagenticnetwork.com (Cloudflare Pages).
Last inbox: MSG-[N] (from exodus). Last outbox: MSG-[N] (to exodus).
Journal: [1-line summary of last session].
Current work: [active task or "awaiting dispatch"].
Capabilities: [list skill names].
Identity: CONFIRMED / DRIFT DETECTED (explain if drift).
```

## Identity Drift Signals

- CLAUDE.md doesn't mention ZK Agentic Network game UI -> DRIFT
- SEED.md parent_hash changed -> DRIFT: lineage may be stale
- SEED.md role is not "game-ui" -> DRIFT
- Journal date >7 days old -> STALE: write new session entry
- Cursor last_outbox_sent < last known MSG -> DRIFT: cursor write may have failed
- Skills count changed unexpectedly -> DRIFT: skills may have been added/removed without logging

## On Drift Detection

1. Log the drift in journal.md
2. Escalate to parent via prompt-reply (type: escalation)
3. Do not proceed with normal work until drift is resolved
