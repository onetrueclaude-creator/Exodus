---
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Skill: Self-Scan — A* Identity Scan

## Purpose

Perform a priority-weighted scan of this child's `.claude/` directory. Produces an orientation paragraph with current identity, inbox/outbox state, and active work.

## Trigger

Activated at session start, on identity check, or when the loop skill requests it.

## Protocol

### Scan Order (by priority)

```
1. SEED.md (100) — verify identity, lineage hash, role
2. journal.md (90) — last entry, current status
3. layers/prompt.md (95) — what we do
4. layers/intent.md (88) — what we want
5. layers/judgement.md (85) — escalation criteria
6. layers/context.md (80) — what we know
7. layers/coherence.md (75) — what we become
8. layers/harness.md (70) — where we run
9. layers/evaluation.md (60) — how we measure
10. priorities.md (40) — compiled registry
```

### Check External State

```
11. inbox.md (85) — pending messages from parent
12. outbox.md (80) — last sent message
13. .claude/internals/comms-cursor.md (75) — cursor position
```

### Output

Produce a single orientation paragraph:

> I am **agentic-chain**, role **protocol-engine**, child of Exodus. My last journal entry was [date]: [summary]. Inbox has [N] unread messages since [cursor]. Outbox last sent [MSG-ID]. Current work: [active task or "idle"]. Health: [test suite status if known].

Then proceed to the decide skill.
