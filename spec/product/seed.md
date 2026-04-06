# Seed — spec/product/

> Product management knowledge base: feature specs, decisions, and roadmap.
> Read `CLAUDE.md` for what changed and what's being planned.

## What This Directory Serves

Houses all product-level documentation: feature specifications, product decisions (with rationale), and the development roadmap for ZK Agentic Network.

## Contents

| Dir/File | Description |
|----------|-------------|
| `features/` | Feature specifications and user stories |
| `decisions/` | Product decision log (what was decided and why) |
| `roadmap/` | Development milestones and phased delivery plan |
| `_index.md` | Directory index |

## Product Vision

ZK Agentic Network is a gamified blockchain social dApp where users manage AI agents across a 2D galaxy grid. The canonical user story lives in `CLAUDE.md` (root) under "UX Design Spec."

## Key Decisions Already Made

- Subscription tiers: Community (free/Sonnet), Professional ($50/Opus), Max ($200/Opus unlimited)
- 4-faction galaxy grid with spiral arms (designed 2026-02-24)
- Agent terminal = constrained Claude API (no free text, only valid game choices)
- **CPU Tokens** (was CPU Energy) = cumulative proof-of-work counter, read-only, tracks all Claude API token spend
- **CPU Staked** = live measure of compute committed to Secure (mining) sub-agents
- **Subgrid allocation** = private 8×8 inner panel — 4 types (Secure, Develop, Research, Storage)
- Mining = securing the chain via agentic action; Secure sub-agents measure their token spend as CPU Staked
- Storage sub-agent = ZK tunnel for private on-chain data (Filecoin PoST architecture reference)
- Level scaling: `output = base × level^0.8`, levels purchased with Development Points
