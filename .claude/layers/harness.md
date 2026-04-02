---
layer: harness
scope: exodus
priority: 70
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Harness — Where Exodus Runs

## Current Configuration

### Communication Infrastructure
- **File-based mailbox** — `inbox.md` (from origin, read-only) and `outbox.md` (to origin, write-only) (both at project root)
- **Cursor tracking** — `internals/comms-cursor.md` tracks last-read inbox position
- **Polling** — `/loop` runs `prompt-fetch` skill to check for new messages

### Development Tooling
- **TypeScript/Node** — Next.js 16, React 19, PixiJS 8, Zustand 5, Vitest 4
- **Python** — FastAPI, uvicorn, SQLite, Supabase client, SlowAPI rate limiting
- **PostgreSQL** — Docker Compose for local dev (auth cache via Prisma 7)
- **Playwright** — E2E test automation (22+ specs + 4 faction beta testers)

### Deploy Targets
- **GitHub Pages** — zkagentic.com (marketing, static HTML)
- **Cloudflare Pages** — zkagentic.ai (monitor, static HTML + JS)
- **Cloudflare Pages** — zkagenticnetwork.com (game UI, Next.js standalone, Phase 3)
- **Local only** — Testnet miner runs on dev machine, syncs to Supabase (no Railway)

### External Services
- **Supabase** — `inqwwaqiptrmpxruyczy.supabase.co` (Realtime sync, waitlist, RLS)
- **Google OAuth** — NextAuth v5 provider for user authentication
- **Solana** — Phantom wallet adapter for on-chain tier (future)

### Skills (protocol)
- `self-scan` — A* priority self-scan for identity verification
- `prioritize` — A* registry scorer (runs each /loop, writes priorities.md)
- `loop` — OODA iteration cycle (comms → state → decide → act)
- `prompt-fetch` — Read inbox from origin
- `prompt-reply` — Write to outbox with conduct audit

### Skills (domain)
- `fastapi-testnet` — API conventions, Supabase sync, test patterns
- `debugger` — Known bug patterns and fixes
- `supabase-expert` — Schema, RLS, Realtime patterns
- `turborepo` — Monorepo build system guide

### Commands
- `comms` — Mailbox poll: inbox + children outboxes (1m)
- `loop` — Full OODA cycle: prioritize → comms → state → decide → act (5m)
- `watchdog` — Health monitor: children pulse, deploys, test suites (30m, parent only)
- `reflect` — Identity + priorities + journal rollup + skill gaps (1h)
- `exodus/feature` — 7-phase feature development workflow
- `skills/*` — 12 expert persona dispatchers

### Hooks
- `stop-log.sh` — Logs each assistant turn to vault/user-prompts.md
- `precompact.sh` — Captures full conversation before compaction
- `session-start-compact.sh` — Injects memory on session resume
- `user-prompt-log.sh` — Logs user prompts before processing
- `watch-prompts.py` — Background daemon for cross-session tracking
