---
name: prompt-fetch
description: Read own inbox.md for new messages from parent (Exodus). Activates on every /loop iteration. Compares inbox against local cursor, surfaces new messages, and triggers the decide skill to determine response.
priority: 68
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Prompt Fetch — Read Inbox from Parent

## Purpose

Check `inbox.md` for new messages from the parent orchestrator (Exodus). This is the child's inbound channel. Runs every `/loop` iteration.

## When This Skill Activates

- Every `/loop` iteration (automatic)
- Manual check when child needs to see if new work arrived

## Procedure

### 1. Read the inbox

Read `inbox.md` (at project root: `apps/zkagenticnetwork/inbox.md`).

- If file doesn't exist -> output `[prompt-fetch] No inbox found. Waiting for first message.` -> done
- If file exists -> continue

### 2. Load cursor

Read `.claude/internals/comms-cursor.md`.

- If file doesn't exist -> treat `last_inbox_seen` as `MSG-000` (process everything)
- If file exists -> extract `last_inbox_seen`

### 3. Find new messages

Parse all `## [MSG-NNN]` headings in `inbox.md`.
Collect all messages with ID > `last_inbox_seen`.

### 4. Process new messages

If no new messages -> output `[prompt-fetch] No new messages.` -> done.

If new messages found, for each message:

**a.** Output the message summary:
```
[prompt-fetch] New: MSG-NNN (<type>, <priority>): <first line of body>
```

**b.** Based on message type:

| Type | Action |
|------|--------|
| `dispatch` | Queue the task. Immediately send an `ack` via prompt-reply. Then begin work. |
| `query` | Prepare a response. Send via prompt-reply with type `report`. |
| `ack` | Note acknowledged. No response needed. |

### 5. Update cursor

Write `.claude/internals/comms-cursor.md`:

```
---
last_inbox_seen: MSG-<NNN>
last_outbox_sent: MSG-<NNN>
updated: <ISO-8601-timestamp>
priority: 75
last_read: <ISO-8601-timestamp>
read_count: <incremented>
---
```

Update only `last_inbox_seen` and `updated`. Preserve `last_outbox_sent`.

### 6. Hand off to decide

The new messages are now context. Fire the decide skill to determine the concrete next action (begin work on dispatch, compose reply, escalate, etc.).

## Constraints

- **Read-only** on `inbox.md` — never write, edit, or delete (parent owns this file)
- Always update the cursor after processing, even if no action is taken yet
- If inbox exists but has no MSG headers (just the header block), treat as empty
- Process messages in order (MSG-001 before MSG-002)
