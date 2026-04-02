---
name: prompt-reply
description: Send a message from zkagenticnetwork to parent (Exodus) by appending to own outbox.md. Includes a mandatory conduct audit before writing. Activates when the child needs to acknowledge a dispatch, report progress, answer a query, or escalate a blocker.
priority: 68
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Prompt Reply — Send Message to Parent

## Purpose

Append a structured message to `outbox.md`. This is the child's outbound channel — the only way zkagenticnetwork communicates with its parent (Exodus). Every outbound message passes through a conduct audit gate before being written.

## When This Skill Activates

- Receives a dispatch -> sends `ack`
- Completes work -> sends `report`
- Hits a blocker -> sends `escalation`
- Receives a query -> sends `report` with answer
- Reaches a milestone -> sends `report` with progress update

## Procedure

### 1. Conduct Audit (MANDATORY — do not skip)

Before composing the message, check:

| Check | What to verify |
|-------|---------------|
| **Explicit** | Message clearly states what was done/found and why |
| **No guessing** | No uncertain claims presented as facts. Flag uncertainty. |
| **Scope** | Message only addresses the dispatched task, not unrelated work |
| **No secrets** | No API keys, tokens, passwords, or credentials in message body |
| **Structured** | Message has type, priority, and Re: field (if replying) |

If ANY check fails:
- Log the violation: `[prompt-reply] CONDUCT VIOLATION: <which check failed>`
- Do NOT write the message
- Fix the issue and re-run the audit

### 2. Determine the next MSG ID

Read `outbox.md` (at project root: `apps/zkagenticnetwork/outbox.md`).

- If file does not exist -> create it with header, start at MSG-001
- If file exists -> find the last `## [MSG-NNN]` heading -> increment

### 3. Construct the message

Format:

```markdown
## [MSG-<NNN>] <ISO-8601-timestamp>
**From:** zkagenticnetwork
**Priority:** low | medium | high | critical
**Type:** ack | report | escalation
**Re:** MSG-<NNN> (required — always reference the inbox message being responded to)

<message body>

---
```

**Type definitions:**
- `ack` — "received your dispatch, here's my understanding, beginning work"
- `report` — progress update, completion notice, or query answer
- `escalation` — blocker, failure, ambiguity, or security concern

**The Re: field is required.** Every message is a response to something in the inbox. If there's nothing to reference (unprompted status update), use `Re: general`.

### 4. Append to outbox

Use the **Write** or **Edit** tool to append the formatted message to `outbox.md`.

**CRITICAL:** Append only. Never overwrite, reorder, or delete existing messages.

### 5. Update cursor

Write `.claude/internals/comms-cursor.md`:
- Update `last_outbox_sent` to the MSG ID just written
- Update `updated` timestamp
- Preserve `last_inbox_seen`

### 6. Confirm

Output: `[prompt-reply] Sent MSG-<NNN> (<type>) in response to MSG-<NNN>`

## Outbox File Header

When creating a new `outbox.md`, use this header:

```markdown
# Outbox

> Messages to parent (Exodus). This file is **written by zkagenticnetwork only** — parent reads, child appends.
> New messages appear at the bottom. Parent polls this file via prompt-retrieve.

---
```

## Constraints

- **Never skip the conduct audit** — it is step 1, not optional
- Never write to `inbox.md` (that file belongs to the parent)
- Never delete or modify existing messages in the outbox
- Always include the `Re:` field
- If conduct audit fails, fix and retry — do not send the message as-is
