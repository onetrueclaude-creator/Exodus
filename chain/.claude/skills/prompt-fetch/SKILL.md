---
priority: 68
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Skill: Prompt-Fetch — Read Inbox

## Purpose

Read `inbox.md` at project root for new messages from the parent orchestrator (Exodus). Compare against the comms cursor to identify unread messages.

## Trigger

Activated on every `/loop` iteration, or when explicitly checking for messages.

## Protocol

### 1. Read Cursor

```
Read .claude/internals/comms-cursor.md
Extract: last_inbox_seen (e.g., MSG-003)
```

### 2. Read Inbox

```
Read vault/agentic-chain/inbox.md
Parse all MSG-### entries
```

### 3. Identify Unread

```
Filter messages where MSG ID > last_inbox_seen
If no new messages: report "Inbox clear" and return
If new messages: list them with sender, timestamp, subject
```

### 4. Update Cursor

```
Update .claude/internals/comms-cursor.md:
  last_inbox_seen: [highest MSG ID seen]
  updated: [current timestamp]
```

### 5. Surface Messages

For each unread message, present:
- MSG ID
- From (should always be "exodus" or "origin")
- Timestamp
- Type (dispatch, query, status-request, info)
- Content summary

Then trigger the decide skill to determine response.

## Message Format Expected

```markdown
### MSG-001
- **From:** exodus
- **Timestamp:** 2026-04-01T22:30:00Z
- **Type:** dispatch
- **Subject:** [subject line]

[message body]
```
