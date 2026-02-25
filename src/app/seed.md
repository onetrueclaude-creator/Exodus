# Seed — src/app/

> Next.js 16 App Router — pages, layouts, and API routes.
> Read `CLAUDE.md` for what changed.

## What This Directory Serves

The App Router tree defining all routes, layouts, and server-side API handlers for ZK Agentic Network.

## Route Structure

```
app/
├── page.tsx           → / (landing, Google OAuth prompt)
├── layout.tsx         → Root layout (Providers, fonts, globals.css)
├── globals.css        → Tailwind CSS 4 + CSS variables + utility classes
├── favicon.ico
├── onboard/           → /onboard (username selection)
├── subscribe/         → /subscribe (tier selection)
├── game/              → /game (galaxy grid, main game UI)
└── api/
    ├── auth/          → NextAuth v5 routes
    ├── username-check/→ Real-time username availability check
    └── subscribe/     → Tier selection + DB write + blockchain coord assignment
```

## User Journey

```
/ → (Google OAuth) → /onboard → /subscribe → /game
```

## Key Patterns

- `game/page.tsx` — reads agents from Zustand store snapshot, not direct service call
- Loading overlay: `(isInitializing || !isReady)` — removed when chain data is ready
- All API routes use NextAuth `getServerSession()` for auth

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | src/ tree |
| Components in game | `../components/seed.md` | UI loaded by game/page.tsx |
| Store | `../store/seed.md` | Store snapshot read by game/page.tsx |
| Auth flow | `../../vault/engineering/seed.md` | Auth architecture |
| UX spec | `../../vault/seed.md` | Canonical user story driving routes |
