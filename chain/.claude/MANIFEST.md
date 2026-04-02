---
priority: 60
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Agentic Chain — Canonical Structure

This manifest defines the required files and directories for the agentic-chain child `.claude/` folder.

## Required Files

| File | Priority | Purpose |
|------|----------|---------|
| `SEED.md` | 100 | Identity, lineage, role |
| `MANIFEST.md` | 60 | This file — structure blueprint |
| `journal.md` | 90 | Session log, decisions, progress |
| `settings.json` | 40 | Permissions and configuration |
| `priorities.md` | 40 | Compiled priority registry |

## Required Directories

### `layers/` — Identity Layers (7 files)

| File | Priority | Purpose |
|------|----------|---------|
| `prompt.md` | 95 | What this child does |
| `intent.md` | 88 | What this child wants |
| `judgement.md` | 85 | When to escalate |
| `context.md` | 80 | What this child knows |
| `coherence.md` | 75 | What this child becomes |
| `harness.md` | 70 | Where this child runs |
| `evaluation.md` | 60 | How to measure success |

### `skills/` — Protocol Skills (5 directories)

| Skill | Priority | Purpose |
|-------|----------|---------|
| `loop/SKILL.md` | 70 | OODA cycle for this child |
| `self-scan/SKILL.md` | 70 | A* scan of own .claude/ |
| `prompt-fetch/SKILL.md` | 68 | Read inbox.md for messages |
| `prompt-reply/SKILL.md` | 68 | Write to outbox.md |
| `prioritize/SKILL.md` | 65 | A* registry scorer |

### `commands/` — Slash Commands

| File | Priority | Purpose |
|------|----------|---------|
| `comms.md` | 80 | Check inbox, process, update cursor |

### `internals/` — State Files

| File | Priority | Purpose |
|------|----------|---------|
| `comms-cursor.md` | 75 | Last inbox/outbox message IDs |

## External Files (at project root, NOT in .claude/)

| File | Priority | Purpose |
|------|----------|---------|
| `inbox.md` | 85 | Messages from parent (Exodus) |
| `outbox.md` | 80 | Messages to parent (Exodus) |

## Coexistence Note

The `stack/` folder at `vault/agentic-chain/stack/` contains **operational layers** (persistence, consensus, network, monitoring, deployment). The `.claude/layers/` folder contains **identity layers** (purpose, intent, judgement). They serve different functions and coexist.
