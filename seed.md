# Seed — Exodus Monorepo Root

> **Read this first.** This is the top-level navigation descriptor for the Exodus/ZK Agentic Network project.
> After reading this, read `CLAUDE.md` for project-wide conventions, current branch state, and change history.

## What This Root Serves

The Exodus monorepo is the full development environment for **ZK Agentic Network** — a gamified social media dApp built on the Agentic Chain testnet blockchain, visualized as a 2D Neural Lattice.

## Project Tree

```
Exodus/
├── chain/              → Protocol core: Python FastAPI testnet (consensus, economics, mining)
├── apps/
│   └── game/           → Game UI: Next.js 16, React 19, PixiJS 8 (zkagenticnetwork.com)
├── web/
│   ├── marketing/      → Marketing site: zkagentic.com (static, GitHub Pages)
│   └── monitor/        → Testnet monitor: zkagentic.ai (static, Cloudflare Pages)
├── spec/               → Knowledge base: whitepaper v1.3, research, product specs, audit reports
├── docs/               → Plans and references (design docs, implementation plans)
├── tests/              → E2E tests (Playwright)
├── supabase/           → Database migrations
├── public/             → Static assets (logos)
└── .claude/            → Governance: layers, skills, commands, hooks
```

## Architectures Contained

| Layer | Technology | Location |
|-------|------------|----------|
| Protocol | Python FastAPI (Agentic Chain testnet) | `chain/` |
| Frontend | Next.js 16, React 19, PixiJS 8, Tailwind 4 | `apps/game/` |
| State | Zustand 5 | `apps/game/src/store/` |
| Auth | NextAuth v5, Prisma 7, PostgreSQL 16 | `apps/game/` |
| Marketing | Static HTML, GitHub Pages | `web/marketing/` |
| Monitor | Static HTML + JS, Cloudflare Pages | `web/monitor/` |
| Spec | Whitepaper, research, audit reports | `spec/` |
| E2E Testing | Playwright | `tests/` |
| Unit Testing | Vitest 4 + React Testing Library | `apps/game/src/**/__tests__/` |

## Key Entry Points

- `cd apps/game && npm run dev` → Start game UI at localhost:3000
- `cd chain && uvicorn agentic.testnet.api:app --port 8080` → Start testnet API
- `cd chain && python3 -m pytest tests/ -v` → Run chain tests (717+)
- `npx playwright test` → Run E2E tests

## Navigation Connectors

| Directory | Purpose |
|-----------|---------|
| `seed.md` | **Root** — this file |
| `chain/seed.md` → `chain/CLAUDE.md` | Testnet API — protocol, consensus, mining |
| `apps/game/seed.md` → `apps/game/CLAUDE.md` | Game UI — components, store, services |
| `spec/seed.md` → `spec/CLAUDE.md` | Knowledge base — whitepaper, research, product |
| `docs/seed.md` → `docs/CLAUDE.md` | Plans and documentation |
| `tests/seed.md` → `tests/CLAUDE.md` | E2E test suite |
