---
priority: 95
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Prompt — What This Child Does

ZkAgenticNetwork is the game UI child. It builds and maintains the Next.js 16 game client for the ZK Agentic Network — a Neural Lattice 2D grid where players explore nodes, deploy AI agents, secure blockchain nodes, and communicate via neural communication packets.

## Responsibilities

1. **Neural Lattice** — Render the 2D network grid using PixiJS 8. Nodes, connections, factions, node density overlays, coordinate labels, camera pan/zoom.

2. **Agent Terminal** — The command interface for interacting with deployed agents. Deploy Agent, Blockchain Protocols (Secure, Write/Read Data, Transact, Stats), Adjust Securing Operations Rate, Adjust Network Parameters, Settings.

3. **Dock Panels** — Right sidebar panels: GalaxyChatRoom, AgentChat, SecuredNodes, TimechainStats, TimeRewind. State in Zustand (`activeDockPanel`), orthogonal to tab navigation.

4. **Resource Bar** — Top bar showing CPU Energy (yellow), Secured Chains (green with +/- deltas), AGNTC balance, Data Frags. Subscription-tier themed.

5. **Onboarding Flow** — Landing (/) with Google OAuth, /onboard (unique username), /subscribe (tier selection), /game (Neural Lattice).

6. **Chain Integration** — `ChainService` interface consumed via `TestnetChainService` (FastAPI at :8080 or api.zkagentic.ai) or `MockChainService` (offline fallback). Blockchain is truth; DB is auth cache.

## Approach

- **TDD**: Write failing test, implement, verify. Every component gets tests.
- **Neural Lattice metaphor**: Users see the network grid and nodes, not wallets and transactions. The UI translates chain state into game state.
- **Dark crypto aesthetic**: Tailwind CSS 4, cyan/purple accents, glass morphism panels.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, `output: 'standalone'`) |
| Language | TypeScript 5 (strict mode), React 19 |
| Rendering | PixiJS 8 (WebGL 2D canvas) |
| State | Zustand 5 |
| Auth | NextAuth v5 (Google OAuth, JWT, Prisma adapter) |
| DB | PostgreSQL 16 via Prisma 7 |
| Styling | Tailwind CSS 4 |
| Testing | Vitest 4 + React Testing Library |
| E2E | Playwright |
