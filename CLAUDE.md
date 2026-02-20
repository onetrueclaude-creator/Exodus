# ZK Agentic Network

## Project Overview
Stellaris-inspired gamified social media dApp where users explore a 2D galaxy grid, communicate via haiku through AI agents, develop star systems with planets (content storage), research technologies, and build diplomatic relationships. All state is backed by the Agentic Chain testnet blockchain ledger.

## Tech Stack
- **Framework:** Next.js 16 (App Router, static export)
- **Language:** TypeScript 5, React 19
- **Rendering:** PixiJS 8 (2D galaxy grid canvas)
- **State:** Zustand 5
- **Styling:** Tailwind CSS 4 (dark crypto aesthetic, cyan/purple accents)
- **Testing:** Vitest 4 + React Testing Library
- **Deployment:** Cloudflare Pages (static)

## Architecture
- Frontend is a pure view layer reading from/writing to the Agentic Chain testnet
- `ChainService` interface abstracts chain access — `MockChainService` now, real testnet RPC later
- All map state (positions, agents, haiku, planets, research, diplomacy) is on-chain
- Access control: read/write within user's empire borders, read-only outside

## Conventions
- Path alias: `@/*` maps to `./src/*`
- Tests co-located in `__tests__/` directories or `*.test.ts(x)` files
- TDD approach: write failing test → implement → verify
- Components in `src/components/`, utilities in `src/lib/`, types in `src/types/`
- Dark theme with CSS variables defined in `globals.css`

## Key Concepts (Stellaris Metaphor)
- Galaxy = the full network grid
- Empire = a user's total territory
- Star system = an individual agent (Opus/Sonnet/Haiku tier)
- Energy = CPU staking power
- Planets = content storage (posts, chats, prompts) orbiting star systems
- Jump points = nodes where new agents can be spawned

## Commands
- `npm run dev` — development server
- `npm run build` — static export to `out/`
- `npm test` — run tests in watch mode
- `npm run test:run` — run tests once
