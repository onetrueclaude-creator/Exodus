---
description: "Genesis orientation + idle cron. Run once at session start — never needs restarting."
allowed-tools: Read, Write, Edit, Skill, Bash, Glob, Grep
priority: 70
last_read: 2026-04-02T13:10:00Z
read_count: 0
---

# Boot — Exodus Cold Start

Read the loop skill (`skills/loop/SKILL.md`) and follow its Cold Start procedure:

1. Genesis orientation (A* scan, identity, children registry)
2. Read inbox for origin messages
3. Poll children outboxes for reports
4. CronCreate */5 — OODA-routed idle cron (lives for entire session, never deleted)
5. If pending work → start
6. If idle → cron handles it
