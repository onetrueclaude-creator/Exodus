---
priority: 80
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Command: /comms — Check Communications

## Purpose

Check inbox for new messages from parent, process them, and update the comms cursor.

## Steps

1. **Read cursor** — `.claude/internals/comms-cursor.md` to get `last_inbox_seen` and `last_outbox_sent`
2. **Read inbox** — `inbox.md` (at project root: `vault/agentic-chain/inbox.md`)
3. **Identify unread** — messages with ID greater than `last_inbox_seen`
4. **Process each message:**
   - Display message content
   - Classify type (dispatch, query, status-request, info)
   - If dispatch: acknowledge and begin work planning
   - If query: prepare answer
   - If status-request: gather current status
5. **Update cursor** — write new `last_inbox_seen` to `.claude/internals/comms-cursor.md`
6. **Reply if needed** — invoke prompt-reply skill to write response to `outbox.md` (at project root: `vault/agentic-chain/outbox.md`)

## Quick Status

To just check without processing:
```
Read inbox.md → count messages after cursor → report "[N] unread"
```
