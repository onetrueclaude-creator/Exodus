---
id: exodus
type: origin-project
parent: origin
role: blockchain-dapp
created: 2026-02-23
updated: 2026-04-01
priority: 100
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Exodus Seed

ZK Agentic Network — Stellaris-inspired gamified social media dApp. Primary project of the origin orchestrator.

## Identity

- **ID:** exodus
- **Role:** blockchain dApp (4-domain platform: marketing, monitor, API, game)
- **Parent:** origin orchestrator (`~/.claude/`)
- **Authoritative spec:** `vault/whitepaper.md` (v1.2)

## Domains

| Domain | URL | Source | Stack |
|--------|-----|--------|-------|
| Marketing | zkagentic.com | `ZkAgentic/projects/web/zkagentic-deploy/` | Static HTML, GitHub Pages |
| Monitor | zkagentic.ai | `ZkAgentic/projects/web/zkagentic-monitor/` | Static HTML + JS, Cloudflare Pages |
| Testnet API | (local miner) | `vault/agentic-chain/` | Python FastAPI, Supabase write-through |
| Game | zkagenticnetwork.com | `apps/zkagenticnetwork/` + `src/` | Next.js 16, React 19, PixiJS 8 |

## Children

| Child | Path | Bootstrapped | Inbox | Outbox |
|-------|------|-------------|-------|--------|
| zkagenticnetwork | `apps/zkagenticnetwork/` | 2026-04-01 | `apps/zkagenticnetwork/inbox.md` | `apps/zkagenticnetwork/outbox.md` |
| agentic-chain | `vault/agentic-chain/` | 2026-04-01 | `vault/agentic-chain/inbox.md` | `vault/agentic-chain/outbox.md` |

## Hash Computation

```bash
cat ./ .claude/SEED.md ./ CLAUDE.md ./ .claude/settings.json | shasum -a 256
```
