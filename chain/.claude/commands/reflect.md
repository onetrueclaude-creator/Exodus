---
description: Identity check + journal rollup for protocol engine child (1h)
allowed-tools: Read, Write, Edit, Skill
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Reflect — Child Identity Check

Hourly: identity, priorities, journal.

## Steps

1. Run self-scan — confirm identity, check parent hash
2. Run prioritize — rescore all files
3. Read journal — summarize recent entries, roll up if >10
4. If drift → write escalation to outbox.md
5. Journal entry: "[Reflect] Identity confirmed. N files scored. N stale."
