---
priority: 60
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Exodus Manifest — Canonical .claude/ Structure

Blueprint for what a properly bootstrapped Exodus `.claude/` should contain. Used for audits, bootstrapping children, and verifying structural integrity.

## Required Files

| File | Purpose | Created By |
|------|---------|-----------|
| `SEED.md` | Identity, lineage, children registry | Bootstrap |
| `MANIFEST.md` | This file — canonical structure blueprint | Bootstrap |
| `settings.json` | Permissions, plugins, hooks | Bootstrap |
| `journal.md` | Session-level operational notes | Bootstrap (empty) |
| `priorities.md` | Compiled A* priority registry | Prioritize skill (auto-generated) |
| `dispatch-state.json` | Feature workflow state machine | Feature dispatch |

### Project Root Files (outside .claude/)

| File | Purpose | Created By |
|------|---------|-----------|
| `inbox.md` | Inbound messages from origin | Bootstrap (empty) |
| `outbox.md` | Outbound messages to origin | Bootstrap (empty) |

## Required Directories

| Directory | Purpose | Minimum Contents |
|-----------|---------|-----------------|
| `layers/` | Identity framework (7 files) | prompt, context, intent, judgement, coherence, evaluation, harness |
| `skills/` | Executable capabilities | At minimum: loop, self-scan, prompt-fetch, prompt-reply, prioritize |
| `commands/` | Slash commands | At minimum: comms |
| `hooks/` | Lifecycle automation | Project-specific |
| `internals/` | State tracking | `comms-cursor.md` |

## Optional Directories

| Directory | Purpose | When Needed |
|-----------|---------|-------------|
| `docs/` | Reference documentation | On demand |
| `projects/` | Per-project memory | Managed by Claude Code |

## Layer Files (7 required)

| Layer | Question It Answers |
|-------|-------------------|
| `layers/prompt.md` | What does this project do? |
| `layers/context.md` | What does this project know? |
| `layers/intent.md` | What does this project want? (priority ordering) |
| `layers/judgement.md` | When should this project escalate? |
| `layers/coherence.md` | What does this project become? (identity) |
| `layers/evaluation.md` | How does this project measure success? |
| `layers/harness.md` | Where does this project run? (infrastructure) |

## Communication Protocol Files

| File | Location | Owner | Direction |
|------|----------|-------|-----------|
| `inbox.md` | Project root | Origin writes, project reads | Inbound |
| `outbox.md` | Project root | Project writes, origin reads | Outbound |
| `internals/comms-cursor.md` | .claude/ | Project writes | Internal sync state |
| `priorities.md` | .claude/ | Prioritize skill writes | Internal registry |

## Structural Verification

```bash
# Quick check — .claude/ required files
for f in SEED.md MANIFEST.md settings.json journal.md priorities.md; do
  [ -f ".claude/$f" ] && echo "OK: .claude/$f" || echo "MISSING: .claude/$f"
done

# Mailbox at project root
for f in inbox.md outbox.md; do
  [ -f "$f" ] && echo "OK: $f (project root)" || echo "MISSING: $f"
done

# Layer check — all 7 layers present
for l in prompt context intent judgement coherence evaluation harness; do
  [ -f ".claude/layers/$l.md" ] && echo "OK: layers/$l.md" || echo "MISSING: layers/$l.md"
done

# Skill check — protocol skills present
for s in loop self-scan prompt-fetch prompt-reply prioritize; do
  [ -f ".claude/skills/$s/SKILL.md" ] && echo "OK: skills/$s" || echo "MISSING: skills/$s"
done
```
