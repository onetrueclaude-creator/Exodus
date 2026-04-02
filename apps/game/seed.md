# Seed — apps/zkagenticnetwork/

> Next.js 16 frontend application for ZK Agentic Network.
> The full game UI, auth layer, and blockchain visualization.
> Read `CLAUDE.md` for change history and pending work.

## What This Directory Serves

Hosts the main **ZK Agentic Network** web application — the Stellaris-inspired galaxy grid game UI served at `localhost:3000` (dev) or deployed via Docker/Cloudflare.

## Architectures Contained

| Layer | Description |
|-------|-------------|
| Next.js 16 App Router | `src/app/` — page routes, layouts, API handlers |
| PixiJS 8 Canvas | `src/components/GalaxyGrid.tsx` — 2D galaxy grid renderer |
| Zustand 5 Store | `src/store/gameStore.ts` — global game state |
| NextAuth v5 | Auth routes in `src/app/api/auth/` — Google OAuth + JWT |
| Prisma 7 + PostgreSQL | `prisma/schema.prisma` — user identity, coordinates |
| Tailwind CSS 4 | Dark crypto aesthetic, cyan/purple accents |
| Vitest + RTL | Unit tests in `src/**/__tests__/` |

## User Journey

```
/ (landing) → Google OAuth → /onboard (username) → /subscribe (tier) → /game (galaxy grid)
```

## Key Files

- `src/components/GalaxyGrid.tsx` — PixiJS galaxy renderer
- `src/store/gameStore.ts` — Zustand global store
- `src/services/testnetChainService.ts` — connects to Python chain at :8080
- `src/hooks/useGameRealtime.ts` — blockchain polling + Supabase realtime

## Commands

```bash
npm run dev          # localhost:3000
npm run build        # production build
npm run test:run     # run unit tests once
```
