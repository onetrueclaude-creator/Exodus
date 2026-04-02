---
priority: 65
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Skill: Prioritize — A* Registry Scorer

## Purpose

Rescore all `.claude/` files by effective priority and write the compiled registry to `priorities.md`. Runs as step 0 of every `/loop` iteration.

## Trigger

Activated at the start of each loop iteration, or on demand when the priority landscape may have changed.

## Protocol

### 1. Scan All Files

Read frontmatter from every `.md` file in `.claude/` (recursive). Extract:
- `priority` (base score, 1-100)
- `last_read` (ISO timestamp)
- `read_count` (integer)

### 2. Compute Effective Priority

```
effective_priority = base_priority + freshness_bonus + urgency_bonus

freshness_bonus:
  - Updated in last hour: +5
  - Updated in last day: +2
  - Updated in last week: +0
  - Older than 1 week: -2

urgency_bonus:
  - inbox.md with unread messages: +10
  - journal.md with active work: +5
  - No special state: +0
```

### 3. Sort and Write

Sort all files by effective priority (descending). Write to `.claude/priorities.md`:

```markdown
---
priority: 40
last_read: [current timestamp]
read_count: [incremented]
---

# Agentic Chain — Priority Registry

Last compiled: [ISO timestamp]

| Rank | File | Base | Effective | Notes |
|------|------|------|-----------|-------|
| 1 | SEED.md | 100 | 105 | Identity |
| 2 | layers/prompt.md | 95 | 97 | Purpose |
| ... | ... | ... | ... | ... |
```

### 4. Return

The compiled registry is now available for the loop and self-scan skills to use for optimal file read ordering.
