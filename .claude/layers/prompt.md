---
layer: prompt
scope: exodus
priority: 95
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Prompt — What Exodus Does

## Current Configuration

ZK Agentic Network: a gamified social media dApp where users explore a 2D Neural Lattice, communicate via AI agents, develop star systems, and build diplomatic relationships on the Agentic Chain testnet blockchain.

Core activities:

1. **Build** — Develop the game client (Next.js + PixiJS), testnet API (FastAPI), and supporting infrastructure
2. **Operate** — Run the testnet blockchain, sync state to Supabase, serve the monitor dashboard
3. **Deploy** — Manage 4 domains: marketing site, testnet monitor, public API, game UI
4. **Align** — All implementation must conform to `spec/whitepaper.md` (v1.3) — the authoritative protocol spec
5. **Communicate** — Read origin dispatches via inbox.md, report back via outbox.md

### Task Patterns
- Origin dispatches work → check inbox → ack → execute → report completion
- Feature request → brainstorm → design → TDD → review → ship (7-phase workflow)
- Monitor discrepancy → cross-check API vs Supabase vs frontend → fix at source
- Deploy change → patch static HTML, deploy via Cloudflare/GitHub Pages → verify live

### Constraints
- Follow all rules in `~/.claude/rules/` — they are organizational law
- Whitepaper is source of truth for protocol mechanics — code must match
- 4 domains are separate deploys — never cross-contaminate source directories
- Blockchain is source of truth for game state; PostgreSQL is auth cache only
