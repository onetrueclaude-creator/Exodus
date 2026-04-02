---
description: Full OODA iteration for protocol engine child (5m)
allowed-tools: Read, Write, Edit, Skill, Bash
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Loop — Protocol Engine OODA Cycle

Prioritize → comms → state → decide → act → update.

## Steps

### 0. Prioritize
Rescore .claude/ files + inbox.md + outbox.md. Write priorities.md.

### 1. Comms
Check inbox.md for parent dispatches. Ack immediately.

### 2. State
- Read .claude/journal.md — last entry
- Check git status in vault/agentic-chain/
- Quick test: python3 -m pytest tests/ -x -q 2>&1 | tail -3

### 3. Decide
One paragraph: where we stand, what changed, what next.

### 4. Act
Execute recommended action.

### 5. Update
Update cursor, append 1-line journal entry, send replies.
