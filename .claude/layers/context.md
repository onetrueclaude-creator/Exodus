---
layer: context
scope: exodus
priority: 80
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Context — What Exodus Knows

## Current Configuration

### Domains (4 separate deploys)
- **zkagentic.com** — Marketing site (GitHub Pages, static HTML, waitlist)
- **zkagentic.ai** — Testnet monitor (Cloudflare Pages, live chain stats, subgrid simulator)
- **Testnet API** — Local Python FastAPI miner, Supabase write-through (no public hosting)
- **zkagenticnetwork.com** — Game UI (Next.js 16, React 19, PixiJS 8, Zustand 5)

### Tech Stack
- **Frontend:** TypeScript 5, React 19, Next.js 16 (App Router), PixiJS 8, Tailwind CSS 4, Zustand 5
- **Backend:** Python 3, FastAPI, SQLite persistence, Supabase sync
- **Auth:** NextAuth v5 (Google OAuth, JWT, Prisma adapter)
- **Database:** PostgreSQL 16 (auth cache) + Supabase (Realtime sync)
- **Testing:** Vitest 4 + React Testing Library + Playwright E2E (22+ specs)

### Protocol (Whitepaper v1.2)
- **Consensus:** Proof of Agentic Verification (PoAIV) — 13 AI verifiers, 9/13 threshold
- **Token:** AGNTC — 42M supply, burn-mint equilibrium, 5% annual inflation ceiling
- **Grid:** 6481x6481 galaxy (-3240 to +3240), epoch rings expand outward
- **Privacy:** Sparse Merkle Tree (depth 26), nullifiers, private 8x8 subgrids
- **Agents:** Claude models (Haiku/Sonnet/Opus) running autonomous Secure/Develop/Research/Storage

### Communication
- **inbox.md** — Messages from origin (read-only) (both at project root, not in .claude/)
- **outbox.md** — Messages to origin (write-only) (both at project root, not in .claude/)
- **internals/comms-cursor.md** — Tracks last-read message position

### Parent
- Origin orchestrator at `~/.claude/`
- Lineage hash in SEED.md
