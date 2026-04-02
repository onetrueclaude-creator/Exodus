# Loop Pipeline Design — Four Loops for Parent + Children

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Exodus (parent), zkagenticnetwork (child), agentic-chain (child)

## Context

The Exodus organization needs a pipelined loop system that keeps parent and children synchronized, healthy, and self-aware. Four loops at different frequencies handle four concerns: communication, decision-making, health monitoring, and identity maintenance.

## The Four Loops

### Loop 1: `/comms` — Mailbox Poll

| Property | Value |
|----------|-------|
| **Frequency** | Every 1 minute |
| **Cost** | ~5 seconds |
| **Who** | Parent + both children |
| **Purpose** | Check inbox, ack dispatches, execute queries |

**Prompt (terse — designed for fast firing):**

Parent:
```
Check inbox.md for origin messages. Poll children outboxes: read last 20 lines of apps/zkagenticnetwork/outbox.md and vault/agentic-chain/outbox.md. Ack new dispatches. Update cursor.
```

Child:
```
Check inbox.md for parent messages. Ack dispatches, answer queries. Update cursor.
```

**What it does NOT do:** No state scan, no identity check, no decide step, no test runs.

---

### Loop 2: `/loop` — Full OODA Cycle

| Property | Value |
|----------|-------|
| **Frequency** | Every 5 minutes |
| **Cost** | ~30-60 seconds |
| **Who** | Parent + both children |
| **Purpose** | Prioritize → comms → state → decide → act → update |

**Prompt (medium — full cycle but no external checks):**

Parent:
```
Full OODA iteration. Step 0: run prioritize (rescore .claude/ files, write priorities.md). Step 1: comms check (inbox.md + children outboxes). Step 2: local state (MEMORY.md, dispatch-state.json, git status). Step 3: decide — one paragraph: where we stand, what changed, what next. Step 4: act. Step 5: update cursor, journal, send replies.
```

Child (zkagenticnetwork):
```
Full OODA iteration. Prioritize → check inbox.md → check journal + git status + TypeScript errors (npx tsc --noEmit 2>&1 | tail -3) → decide (one paragraph) → act → update cursor + journal.
```

Child (agentic-chain):
```
Full OODA iteration. Prioritize → check inbox.md → check journal + git status + quick test (python3 -m pytest tests/ -x -q 2>&1 | tail -3) → decide (one paragraph) → act → update cursor + journal.
```

---

### Loop 3: `/watchdog` — Health & Responsiveness

| Property | Value |
|----------|-------|
| **Frequency** | Every 30 minutes |
| **Cost** | ~2-3 minutes |
| **Who** | Parent ONLY |
| **Purpose** | Monitor children pulse, deploys, test suites |

**Prompt (comprehensive — runs tests, checks endpoints):**

```
Health check for all children.

For zkagenticnetwork:
- Read apps/zkagenticnetwork/outbox.md — last message timestamp. If >1h ago: SILENT.
- Read apps/zkagenticnetwork/.claude/journal.md — last entry. If >24h: STALE.
- Check dev server: lsof -i :3000 2>/dev/null | head -1
- Quick test: cd apps/zkagenticnetwork && npx vitest run --reporter=verbose 2>&1 | tail -10

For agentic-chain:
- Read vault/agentic-chain/outbox.md — last message timestamp. If >1h ago: SILENT.
- Read vault/agentic-chain/.claude/journal.md — last entry. If >24h: STALE.
- Check API: curl -sf http://localhost:8080/health 2>/dev/null || echo "DOWN"
- Quick test: cd vault/agentic-chain && python3 -m pytest tests/ -x -q 2>&1 | tail -5

Produce health report:
[Watchdog] zkagenticnetwork: ALIVE/SILENT | tests: PASS/FAIL(N) | server: UP/DOWN | last msg: <age>
[Watchdog] agentic-chain: ALIVE/SILENT | tests: PASS/FAIL(N) | API: UP/DOWN | last msg: <age>

If any SILENT: dispatch status query to that child's inbox.md.
If any FAIL: dispatch investigation to that child's inbox.md.
If all healthy: 1-line journal entry.
```

---

### Loop 4: `/reflect` — Identity + Skills + Journal

| Property | Value |
|----------|-------|
| **Frequency** | Every 1 hour |
| **Cost** | ~3-5 minutes |
| **Who** | Parent + both children (children run simpler version) |
| **Purpose** | Identity realignment, A* rescore, journal rollup, skill gap detection |

**Parent prompt (comprehensive):**

```
Reflection cycle — identity, priorities, skills, layers.

1. IDENTITY: Run self-scan. Produce orientation paragraph. Check SEED.md children table matches reality. Check parent lineage hash.

2. PRIORITIES: Run prioritize with full rescore. Flag files decayed to stale. If any file with base >= 70 is stale, either read it now (refresh) or lower its priority (no longer relevant).

3. JOURNAL: Read .claude/journal.md. Summarize today's entries into 1 paragraph. If >20 entries today, roll up the oldest into a summary block and trim.

4. SKILLS: Review last 3 completed tasks or dispatches.
   - Were any skills missing that would have helped?
   - Were there repeated patterns worth capturing?
   - If gap found: note "SKILL GAP: <description>" in journal.

5. LAYERS: Skim all 7 layers. Does content still match reality?
   - layers/context.md: are the tech versions still correct?
   - layers/harness.md: are the deploy targets current?
   - layers/evaluation.md: are the test counts current?
   If stale: flag "STALE LAYER: <file> — <what changed>"

6. OUTPUT:
[Reflect] Identity: CONFIRMED/DRIFT. Priorities: N active, N stale.
Journal: N entries, rolled to M. Skills: [gap/none]. Layers: [current/N stale].
```

**Child prompt (simpler):**

```
Reflection cycle.
1. Run self-scan — confirm identity and parent hash.
2. Run prioritize — rescore all files.
3. Read journal — summarize recent entries. Roll up if >10 entries.
4. If drift detected → write escalation to outbox.md.
5. Journal entry: "[Reflect] Identity confirmed. N files scored. N stale."
```

---

## Timing Pipeline

```
Minute: 0    1    2    3    4    5    ...  29   30   ...  59   60
        |    |    |    |    |    |         |    |         |    |
comms   ●    ●    ●    ●    ●    .    ...  ●    .    ...  ●    .
ooda                             ●    ...       .    ...       .
watchdog                                        ●              .
reflect                                                        ●
```

### Collision Rules

When multiple loops share a minute boundary, the **most comprehensive** loop runs and subsumes the lighter ones:

| Minute | What fires | What's subsumed |
|--------|-----------|-----------------|
| 1, 2, 3, 4 | comms only | — |
| 5, 10, 15, 20, 25 | ooda (includes comms) | comms skipped |
| 30 | watchdog (includes ooda + comms) | ooda + comms skipped |
| 35, 40, 45, 50, 55 | ooda (includes comms) | comms skipped |
| 60 | reflect (includes watchdog + ooda + comms) | all others skipped |

**Effective cost per hour:**
- comms: ~48 firings × 5s = ~4 minutes
- ooda: ~10 firings × 45s = ~7.5 minutes
- watchdog: 1 firing × 2.5m = ~2.5 minutes
- reflect: 1 firing × 4m = ~4 minutes
- **Total: ~18 minutes of agent time per hour**

## Implementation: What Gets Created

### For Exodus (parent) — 4 command files

| File | Invocation | Content |
|------|-----------|---------|
| `.claude/commands/comms.md` | `/comms` | Already exists — update to also poll children outboxes |
| `.claude/commands/loop.md` | `/loop` | New — full OODA with step 0 prioritize (replace current skill-only approach) |
| `.claude/commands/watchdog.md` | `/watchdog` | New — health check, tests, deploy status, dispatch on failure |
| `.claude/commands/reflect.md` | `/reflect` | New — identity, priorities, journal rollup, skill gaps, layer health |

### For each child — 3 command files

| File | Invocation | Content |
|------|-----------|---------|
| `commands/comms.md` | `/comms` | Already exists |
| `commands/loop.md` | `/loop` | New — child OODA (prioritize → comms → state → decide → act) |
| `commands/reflect.md` | `/reflect` | New — child identity check + journal rollup (simpler than parent) |

Children do NOT get `/watchdog` — that's a parent-only supervisory function.

### Cron schedule (set via `/loop` plugin)

```
/loop 1m /comms         — fires every 1 minute
/loop 5m /loop          — fires every 5 minutes (skipped when watchdog/reflect fires)
/loop 30m /watchdog     — fires every 30 minutes (parent only)
/loop 1h /reflect       — fires every 1 hour
```
