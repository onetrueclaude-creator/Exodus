# Loop Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create 4 loop commands for parent (Exodus) and 3 for each child, with collision-aware timing and terse/comprehensive prompt scaling.

**Architecture:** Each loop is a `.claude/commands/*.md` file with frontmatter specifying allowed-tools. The `/loop` plugin fires them on schedule. Fast loops (1m comms) have 2-3 line prompts. Slow loops (1h reflect) have multi-step comprehensive procedures.

**Tech Stack:** Markdown command files with YAML frontmatter. No executable code.

---

### Task 1: Update parent `/comms` to poll children outboxes

**Files:**
- Modify: `.claude/commands/comms.md`

**Step 1:** Read the current file, then replace the entire content with the version below that adds children outbox polling.

**Content:**
```markdown
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

- Read last 20 lines of `apps/zkagenticnetwork/outbox.md`
- Read last 20 lines of `vault/agentic-chain/outbox.md`
- Flag any escalations (Type: escalation) for immediate attention
- Note any reports for context

### 3. Update cursor

- Set `last_inbox_seen` to highest processed MSG
- Update `updated` timestamp

### 4. If no new messages anywhere

Skip silently.
```

**Step 2: Verify**
```bash
head -5 .claude/commands/comms.md
```
Expected: shows the new frontmatter with priority: 80

**Step 3: Commit**
```bash
git add .claude/commands/comms.md
git commit -m "feat: update /comms to poll children outboxes"
```

---

### Task 2: Create parent `/loop` command

**Files:**
- Create: `.claude/commands/loop.md`

**Content:**
```markdown
---
description: Full OODA iteration — prioritize, comms, state, decide, act
allowed-tools: Read, Write, Edit, Skill, Bash, Glob, Grep
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Loop — Full OODA Cycle

Prioritize → comms → local state → decide → act → update.

## Steps

### 0. Prioritize

Run prioritize skill: glob .claude/*.md + inbox.md + outbox.md, rescore by freshness, write priorities.md.

### 1. Comms check

Run /comms (inbox.md + children outboxes).

### 2. Local state

- Read MEMORY.md — any context updates?
- Read .claude/dispatch-state.json — active feature?
- Check git status — unstaged work?
- Read .claude/priorities.md — any stale files?

### 3. Decide

One paragraph answering:
- **Where:** inbox status, active work, deploy health
- **What changed:** since last iteration
- **Next action:** specific, executable

### 4. Act

Execute the recommended action.

### 5. Update

- Update .claude/internals/comms-cursor.md
- Append 1-line entry to .claude/journal.md
- Send replies via prompt-reply if needed
```

**Step 2: Verify**
```bash
cat .claude/commands/loop.md | head -5
```

**Step 3: Commit**
```bash
git add .claude/commands/loop.md
git commit -m "feat: add /loop command — full OODA cycle for parent"
```

---

### Task 3: Create parent `/watchdog` command

**Files:**
- Create: `.claude/commands/watchdog.md`

**Content:**
```markdown
---
description: Health check — monitor children pulse, deploys, test suites (parent only, 30m)
allowed-tools: Read, Write, Edit, Bash, Glob
priority: 65
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Watchdog — Health & Responsiveness

Comprehensive health check for all children. Runs every 30 minutes. Parent only.

## Checks

### zkagenticnetwork

1. **Pulse:** Read `apps/zkagenticnetwork/outbox.md` — last message timestamp
   - If >1h ago → flag **SILENT**
2. **Journal:** Read `apps/zkagenticnetwork/.claude/journal.md` — last entry date
   - If >24h ago → flag **STALE**
3. **Server:** `lsof -i :3000 2>/dev/null | head -1` — dev server running?
4. **Tests:** `cd apps/zkagenticnetwork && npx vitest run --reporter=verbose 2>&1 | tail -10`

### agentic-chain

1. **Pulse:** Read `vault/agentic-chain/outbox.md` — last message timestamp
   - If >1h ago → flag **SILENT**
2. **Journal:** Read `vault/agentic-chain/.claude/journal.md` — last entry date
   - If >24h ago → flag **STALE**
3. **API:** `curl -sf http://localhost:8080/health 2>/dev/null || echo "DOWN"`
4. **Tests:** `cd vault/agentic-chain && python3 -m pytest tests/ -x -q 2>&1 | tail -5`

## Report

```
[Watchdog] zkagenticnetwork: ALIVE/SILENT | tests: PASS/FAIL(N) | server: UP/DOWN | last msg: <age>
[Watchdog] agentic-chain: ALIVE/SILENT | tests: PASS/FAIL(N) | API: UP/DOWN | last msg: <age>
```

## Actions

- If **SILENT**: write dispatch to that child's inbox.md — query type, ask for status
- If **FAIL**: write dispatch to that child's inbox.md — dispatch type, investigate failures
- If all healthy: 1-line journal entry
```

**Step 2: Commit**
```bash
git add .claude/commands/watchdog.md
git commit -m "feat: add /watchdog command — parent health monitor (30m)"
```

---

### Task 4: Create parent `/reflect` command

**Files:**
- Create: `.claude/commands/reflect.md`

**Content:**
```markdown
---
description: Identity realignment, A* rescore, journal rollup, skill gap detection (1h)
allowed-tools: Read, Write, Edit, Skill, Bash, Glob, Grep
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Reflect — Identity + Skills + Journal

Hourly deep check: identity, priorities, journal, skills, layers.

## Procedure

### 1. Identity

Run self-scan skill. Produce orientation paragraph.
- Check SEED.md children table matches actual children paths
- Verify parent lineage hash (origin)
- If drift → escalate to origin via outbox.md

### 2. Priorities

Run prioritize with full rescore.
- Flag files with base >= 70 that show as stale
- If stale: read now to refresh, or lower priority if no longer relevant

### 3. Journal rollup

Read .claude/journal.md.
- Summarize today's entries into 1 paragraph
- If >20 entries today: roll up oldest into summary block, trim individual entries

### 4. Skill gaps

Review last 3 completed tasks or dispatches:
- Were any skills missing that would have helped?
- Were there repeated manual patterns that should become a skill?
- If gap found: append "SKILL GAP: <description>" to journal

### 5. Layer health

Skim all 7 layers:
- layers/context.md — are tech versions still correct?
- layers/harness.md — are deploy targets current?
- layers/evaluation.md — are test counts current?
- If stale: flag "STALE LAYER: <file> — <what changed>"

### 6. Output

```
[Reflect] Identity: CONFIRMED/DRIFT. Priorities: N active, N stale.
Journal: N entries, rolled to M. Skills: [gap/none]. Layers: [current/N stale].
```
```

**Step 2: Commit**
```bash
git add .claude/commands/reflect.md
git commit -m "feat: add /reflect command — hourly identity + skills + journal"
```

---

### Task 5: Create child loop + reflect commands for zkagenticnetwork

**Files:**
- Create: `apps/zkagenticnetwork/.claude/commands/loop.md`
- Create: `apps/zkagenticnetwork/.claude/commands/reflect.md`

**loop.md content:**
```markdown
---
description: Full OODA iteration for game UI child (5m)
allowed-tools: Read, Write, Edit, Skill, Bash
priority: 70
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Loop — Game UI OODA Cycle

Prioritize → comms → state → decide → act → update.

## Steps

### 0. Prioritize
Rescore .claude/ files + inbox.md + outbox.md. Write priorities.md.

### 1. Comms
Check inbox.md for parent dispatches. Ack immediately.

### 2. State
- Read .claude/journal.md — last entry
- Check git status in apps/zkagenticnetwork/
- Quick TypeScript check: npx tsc --noEmit 2>&1 | tail -3

### 3. Decide
One paragraph: where we stand, what changed, what next.

### 4. Act
Execute recommended action.

### 5. Update
Update cursor, append 1-line journal entry, send replies.
```

**reflect.md content:**
```markdown
---
description: Identity check + journal rollup for game UI child (1h)
allowed-tools: Read, Write, Edit, Skill
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Reflect — Child Identity Check

Hourly: identity, priorities, journal.

## Steps

1. Run self-scan — confirm identity, check parent hash
2. Run prioritize — rescore all files
3. Read journal — summarize recent entries, roll up if >10
4. If drift → write escalation to outbox.md
5. Journal entry: "[Reflect] Identity confirmed. N files scored. N stale."
```

**Step 2: Commit**
```bash
git add apps/zkagenticnetwork/.claude/commands/loop.md apps/zkagenticnetwork/.claude/commands/reflect.md
git commit -m "feat: add /loop and /reflect commands for zkagenticnetwork child"
```

---

### Task 6: Create child loop + reflect commands for agentic-chain

**Files:**
- Create: `vault/agentic-chain/.claude/commands/loop.md`
- Create: `vault/agentic-chain/.claude/commands/reflect.md`

**loop.md content:**
```markdown
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
```

**reflect.md content:**
```markdown
---
description: Identity check + journal rollup for protocol engine child (1h)
allowed-tools: Read, Write, Edit, Skill
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Reflect — Child Identity Check

Hourly: identity, priorities, journal.

## Steps

1. Run self-scan — confirm identity, check parent hash
2. Run prioritize — rescore all files
3. Read journal — summarize recent entries, roll up if >10
4. If drift → write escalation to outbox.md
5. Journal entry: "[Reflect] Identity confirmed. N files scored. N stale."
```

**Step 2: Commit**
```bash
git add vault/agentic-chain/.claude/commands/loop.md vault/agentic-chain/.claude/commands/reflect.md
git commit -m "feat: add /loop and /reflect commands for agentic-chain child"
```

---

### Task 7: Verify full pipeline and update docs

**Step 1: Verify all command files exist**
```bash
echo "=== Parent commands ===" && ls .claude/commands/comms.md .claude/commands/loop.md .claude/commands/watchdog.md .claude/commands/reflect.md
echo "=== zkagenticnetwork commands ===" && ls apps/zkagenticnetwork/.claude/commands/comms.md apps/zkagenticnetwork/.claude/commands/loop.md apps/zkagenticnetwork/.claude/commands/reflect.md
echo "=== agentic-chain commands ===" && ls vault/agentic-chain/.claude/commands/comms.md vault/agentic-chain/.claude/commands/loop.md vault/agentic-chain/.claude/commands/reflect.md
```

**Step 2: Update parent journal**
Append to `.claude/journal.md`:
```
- Created 4-loop pipeline: /comms (1m), /loop (5m), /watchdog (30m, parent only), /reflect (1h)
- Children get 3 loops each: /comms, /loop, /reflect
- Collision rule: most comprehensive loop subsumes lighter ones at shared boundaries
```

**Step 3: Update parent harness layer**
Add to `.claude/layers/harness.md` Commands section:
```
- `loop` — Full OODA cycle (5m)
- `watchdog` — Health monitor for children (30m, parent only)
- `reflect` — Identity + skills + journal rollup (1h)
```

**Step 4: Commit**
```bash
git add .claude/journal.md .claude/layers/harness.md
git commit -m "docs: loop pipeline complete — 4 parent + 3×2 child commands"
```
