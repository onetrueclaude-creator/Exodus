---
priority: 68
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Skill: Prompt-Reply — Write to Outbox

## Purpose

Send a message from this child (agentic-chain) to the parent orchestrator (Exodus) by appending to `outbox.md` at project root. Includes a mandatory conduct audit before writing.

## Trigger

Activated when the child needs to:
- Acknowledge a dispatch
- Report progress on active work
- Answer a query from parent
- Escalate a blocker
- Report task completion

## Protocol

### 1. Conduct Audit (MANDATORY)

Before writing any message, verify:
- [ ] Message is within role scope (protocol-engine)
- [ ] No secrets or credentials in message body
- [ ] Tone is factual and concise (per rules/communication.md)
- [ ] Message type is accurate (ack, progress, answer, escalation, completion)
- [ ] If escalation: judgement.md criteria are met

If any check fails, do NOT send. Log the failure in journal.md.

### 2. Read Cursor

```
Read .claude/internals/comms-cursor.md
Extract: last_outbox_sent (e.g., MSG-002)
```

### 3. Compose Message

```markdown
### MSG-[next sequential ID]
- **From:** agentic-chain
- **Timestamp:** [ISO 8601]
- **Type:** [ack | progress | answer | escalation | completion]
- **Re:** [MSG ID being responded to, if applicable]
- **Subject:** [concise subject line]

[message body — factual, concise, actionable]
```

### 4. Append to Outbox

```
Append the composed message to vault/agentic-chain/outbox.md
```

### 5. Update Cursor

```
Update .claude/internals/comms-cursor.md:
  last_outbox_sent: [new MSG ID]
  updated: [current timestamp]
```

### 6. Log

Add a brief entry to `.claude/journal.md`:
```
- Sent [MSG-ID] ([type]) re: [subject]
```
