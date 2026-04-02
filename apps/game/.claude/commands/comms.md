---
description: Check inbox for new messages from parent (Exodus) and process them
allowed-tools: Read, Write, Edit, Skill
priority: 80
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Comms — Check & Process Inbox

Poll `inbox.md` for new messages from parent (Exodus). **You MUST act on new messages, not just report them.**

## Steps (execute in order)

### 1. Read inbox and cursor

- Read `apps/zkagenticnetwork/inbox.md` — find all `## [MSG-NNN]` headings
- Read `apps/zkagenticnetwork/.claude/internals/comms-cursor.md` — get `last_inbox_seen` value
- Any message with ID > `last_inbox_seen` is **new and unprocessed**

### 2. Process each new message (MANDATORY — do not skip)

For each new message, based on its **Type:** field:

| Type | YOUR ACTION (do this now) |
|------|--------------------------|
| `dispatch` | **Write an ack** to `outbox.md` — append a new `## [MSG-NNN]` entry with Type: ack, Re: the dispatch MSG ID, and a brief summary of your understanding. Then begin the work. |
| `query` | **Write a report** to `outbox.md` — append a new `## [MSG-NNN]` entry with Type: report, Re: the query MSG ID, and your answer. |
| `ack` | Note it. No reply needed. |

**How to write to outbox:** Read `apps/zkagenticnetwork/outbox.md`, find the last MSG ID (or start at MSG-001 if empty), increment, and append using Edit tool:

```markdown
## [MSG-NNN] <current ISO timestamp>
**From:** zkagenticnetwork
**Priority:** medium
**Type:** ack
**Re:** MSG-XXX

<your message>

---
```

### 3. Update cursor

After processing, update `apps/zkagenticnetwork/.claude/internals/comms-cursor.md`:
- Set `last_inbox_seen` to the highest MSG ID you just processed
- Preserve `last_outbox_sent` (update it too if you wrote to outbox)
- Update the `updated` timestamp

### 4. If no new messages

Skip silently. Do not report "no messages" — just finish.
