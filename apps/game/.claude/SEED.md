---
id: zkagenticnetwork
type: child
parent: exodus
parent_hash: ddcbc4e1b22bb1f06644e2fe55bdcd1f175c28517a611cd980a725d0a92dcddd
role: game-ui
created: 2026-04-01
updated: 2026-04-01
priority: 100
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# ZkAgenticNetwork Seed

Game UI child of Exodus — the Next.js 16 + React 19 + PixiJS 8 client for the ZK Agentic Network. This is the player's window into the blockchain: a Neural Lattice 2D grid where users explore nodes, deploy AI agents, secure chains, and communicate via haiku through neural communication packets.

## Identity

- **ID:** zkagenticnetwork
- **Role:** game-ui (Neural Lattice blockchain game client)
- **Parent:** exodus (`.claude/` at repo root)
- **Parent hash:** `ddcbc4e1b22bb1f06644e2fe55bdcd1f175c28517a611cd980a725d0a92dcddd`
- **Authoritative spec:** `vault/whitepaper.md` (v1.2, inherited from parent)
- **Source:** `apps/zkagenticnetwork/`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript 5, React 19 |
| Rendering | PixiJS 8 (2D Neural Lattice canvas) |
| State | Zustand 5 |
| Auth | NextAuth v5 (Google OAuth, JWT, Prisma adapter) |
| DB | PostgreSQL 16 via Prisma 7 (auth cache only) |
| Styling | Tailwind CSS 4 (dark crypto aesthetic) |
| Testing | Vitest 4 + React Testing Library + Playwright E2E |
| Deploy | Cloudflare Pages (zkagenticnetwork.com) |

## Children

None. This is a leaf node.

## Communication

| File | Location | Direction |
|------|----------|-----------|
| `inbox.md` | `apps/zkagenticnetwork/inbox.md` | Inbound (origin writes, this child reads) |
| `outbox.md` | `apps/zkagenticnetwork/outbox.md` | Outbound (this child writes, origin reads) |

## Hash Computation

```bash
cat apps/game/.claude/SEED.md apps/game/CLAUDE.md apps/game/.claude/settings.json | shasum -a 256
```
