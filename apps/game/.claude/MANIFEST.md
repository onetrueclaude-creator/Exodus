---
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# ZkAgenticNetwork Manifest — Canonical .claude/ Structure

Blueprint for this child's `.claude/` folder. Used for audits and structural verification.

## Required Files

| File | Purpose | Created By |
|------|---------|-----------|
| `SEED.md` | Identity, lineage, parent hash | Bootstrap |
| `MANIFEST.md` | This file — canonical structure blueprint | Bootstrap |
| `settings.json` | Permissions | Bootstrap |
| `journal.md` | Session-level operational notes | Bootstrap (empty template) |
| `priorities.md` | Compiled A* priority registry | Prioritize skill (auto-generated) |

### Project Root Files (outside .claude/)

| File | Purpose | Created By |
|------|---------|-----------|
| `inbox.md` | Inbound messages from parent (Exodus) | Bootstrap (empty) |
| `outbox.md` | Outbound messages to parent (Exodus) | Bootstrap (empty) |

## Required Directories

| Directory | Purpose | Minimum Contents |
|-----------|---------|-----------------|
| `layers/` | Identity framework (7 files) | prompt, context, intent, judgement, coherence, evaluation, harness |
| `skills/` | Executable capabilities | loop, self-scan, prompt-fetch, prompt-reply, prioritize |
| `commands/` | Slash commands | comms |
| `hooks/` | Lifecycle automation | Project-specific (empty at bootstrap) |
| `internals/` | State tracking | `comms-cursor.md` |

## Layer Files (7 required)

| Layer | Question It Answers |
|-------|-------------------|
| `layers/prompt.md` | What does this child do? |
| `layers/context.md` | What does this child know? |
| `layers/intent.md` | What does this child want? (priority ordering) |
| `layers/judgement.md` | When should this child escalate? |
| `layers/coherence.md` | What does this child become? (identity) |
| `layers/evaluation.md` | How does this child measure success? |
| `layers/harness.md` | Where does this child run? (infrastructure) |

## Communication Protocol Files

| File | Location | Owner | Direction |
|------|----------|-------|-----------|
| `inbox.md` | Project root (`apps/zkagenticnetwork/`) | Parent writes, child reads | Inbound |
| `outbox.md` | Project root (`apps/zkagenticnetwork/`) | Child writes, parent reads | Outbound |
| `internals/comms-cursor.md` | `.claude/` | Child writes | Internal sync state |
| `priorities.md` | `.claude/` | Prioritize skill writes | Internal registry |

## Structural Verification

```bash
# Quick check — .claude/ required files
cd ./ apps/zkagenticnetwork
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
