---
description: Identity realignment, A* rescore, journal rollup, skill gap detection (1h)
allowed-tools: Read, Write, Edit, Skill, Bash, Glob, Grep
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Reflect — Identity + Skills + Journal

Hourly deep check: identity, priorities, journal, skills, layers.

## Procedure

### 1. Identity

Run self-scan skill. Produce orientation paragraph.
- Check SEED.md children table matches actual children paths
- Verify parent lineage hash (origin)
- If drift → escalate to origin via outbox.md

### 2. Priorities

Run prioritize with full rescore.
- Flag files with base >= 70 that show as stale
- If stale: read now to refresh, or lower priority if no longer relevant

### 3. Journal rollup

Read .claude/journal.md.
- Summarize today's entries into 1 paragraph
- If >20 entries today: roll up oldest into summary block, trim individual entries

### 4. Skill gaps

Review last 3 completed tasks or dispatches:
- Were any skills missing that would have helped?
- Were there repeated manual patterns that should become a skill?
- If gap found: append "SKILL GAP: <description>" to journal

### 5. Layer health

Skim all 7 layers:
- layers/context.md — are tech versions still correct?
- layers/harness.md — are deploy targets current?
- layers/evaluation.md — are test counts current?
- If stale: flag "STALE LAYER: <file> — <what changed>"

### 6. Output

```
[Reflect] Identity: CONFIRMED/DRIFT. Priorities: N active, N stale.
Journal: N entries, rolled to M. Skills: [gap/none]. Layers: [current/N stale].
```
