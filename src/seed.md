# Seed — src/

> Main Next.js application source for ZK Agentic Network.
> Read `CLAUDE.md` for what changed, what's being built, and why.

## What This Directory Serves

The primary TypeScript/React source tree for the ZK Agentic Network frontend. All game UI, auth flows, state management, and blockchain integration live here.

## Contents

| Dir | Description |
|-----|-------------|
| `app/` | Next.js 16 App Router — pages, layouts, API routes |
| `components/` | React components (PixiJS galaxy grid, dock panels, resource bar) |
| `hooks/` | Custom React hooks (realtime polling, WebSocket, game state) |
| `lib/` | Utility functions (fog, spiral, energy, auth, format, supabase) |
| `services/` | External service adapters (ChainService, MockChainService, TestnetChainService) |
| `store/` | Zustand 5 global game store |
| `types/` | TypeScript interfaces and type definitions |
| `test/` | Test setup and global mocks |
| `middleware.ts` | NextAuth v5 session middleware |

## Architecture Flow

```
app/ (Next.js routes)
  └─ components/ (React UI)
       ├─ GalaxyGrid (PixiJS canvas)
       ├─ DockPanel (right sidebar)
       └─ ResourceBar (top HUD)
           ↕ store/ (Zustand)
               ↕ services/ (ChainService)
                   ↕ apps/agentic-chain/ (Python FastAPI :8080)
```

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | Exodus monorepo root |
| App routes | `app/seed.md` | Next.js pages and API routes |
| UI components | `components/seed.md` | React component library |
| Hooks | `hooks/seed.md` | Custom React hooks |
| Utilities | `lib/seed.md` | Shared utility functions |
| Services | `services/seed.md` | Chain service adapters |
| State | `store/seed.md` | Zustand global store |
| Types | `types/seed.md` | TypeScript type definitions |
| Implementation ref | `../apps/zkagenticnetwork/seed.md` | App-level context |
