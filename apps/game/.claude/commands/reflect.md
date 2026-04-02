---
description: "Identity check + journal rollup. Not timed — run manually or when dispatched by parent."
allowed-tools: Read, Write, Edit, Skill
priority: 60
last_read: 2026-04-02T13:00:00Z
read_count: 0
---

# Reflect — Identity + Journal

On-demand only. Run when dispatched by parent, or manually via `/reflect`.

## Steps

1. Run self-scan — confirm identity, check parent hash
2. Run prioritize — rescore all .claude/ files
3. Read journal — summarize recent entries, roll up if >10
4. If drift → write escalation to outbox.md
5. Journal entry: "[Reflect] Identity confirmed. N files scored. N stale."
