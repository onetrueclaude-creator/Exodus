---
description: Poll inbox for parent messages and children outboxes for reports
allowed-tools: Read, Write, Edit, Skill
priority: 80
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Comms — Mailbox Poll

Check inbox.md for origin messages. Poll children outboxes. Act on everything.

## Steps

### 1. Check own inbox

- Read `inbox.md` — find all `## [MSG-NNN]` headings
- Read `.claude/internals/comms-cursor.md` — get `last_inbox_seen`
- Process new messages: dispatch → ack + work, query → report, ack → note

### 2. Poll children outboxes

- Read last 20 lines of `apps/game/outbox.md`
- Read last 20 lines of `chain/outbox.md`
- Flag any escalations (Type: escalation) for immediate attention
- Note any reports for context

### 3. Act on messages

For each new message in own inbox:

| Type | Action |
|------|--------|
| `dispatch` | Write ack to `outbox.md`, begin work |
| `query` | Write report to `outbox.md` |
| `ack` | Note it, no reply |

For children escalations: address immediately or dispatch fix.

**Outbox format:**
```markdown
## [MSG-NNN] <ISO timestamp>
**From:** exodus
**Priority:** medium
**Type:** ack
**Re:** MSG-XXX

<message>

---
```

### 4. Update cursor

- Set `last_inbox_seen` to highest processed MSG
- Update `last_outbox_sent` if wrote to outbox
- Update `updated` timestamp

### 5. If no messages anywhere

Skip silently.
