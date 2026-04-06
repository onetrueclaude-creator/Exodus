# Seed — spec/prompts/

> Prompt templates used in the ZK Agentic Network agent terminal system.
> Read `CLAUDE.md` for what changed.

## What This Directory Serves

Stores prompt templates, system prompts, and NCP (Neural Communication Packet) templates used by the game's AI agent terminals. These constrain Claude to operate as a game client rather than a general assistant.

## Key Files

| File | Description |
|------|-------------|
| `_templates/prompt.md` | Template for new prompt documents (in `spec/_templates/`) |

## Architecture

- **Agent terminal prompts:** Load `ZKAGENTIC.md` (project root) as system context — constrains Claude to valid game choices only
- **NCP templates:** Pre-formatted neural communication packets for on-chain writing
- **System prompts:** Per-tier agent behavior (Community/Sonnet vs Professional/Opus vs Max/Opus)

## Relationship to ZKAGENTIC.md

`ZKAGENTIC.md` at project root is the master agent constraint file — loaded by every deployed agent terminal to turn Claude into a game client.
