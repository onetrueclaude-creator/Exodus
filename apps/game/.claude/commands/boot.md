---
description: "Genesis orientation + idle inbox poll. Run once at session start — never needs restarting."
allowed-tools: Read, Write, Edit, Skill, Bash
priority: 70
last_read: 2026-04-02T13:00:00Z
read_count: 0
---

# Boot — ZkAgenticNetwork Cold Start

Read the loop skill (`skills/loop/SKILL.md`) and follow its Cold Start procedure:

1. Genesis orientation (A* scan, identity confirmation)
2. Read inbox for pending dispatches
3. CronCreate */1 comms-only inbox poll (lives for entire session, never deleted)
4. If dispatch exists → ack → start working
5. If empty → idle, cron handles it
