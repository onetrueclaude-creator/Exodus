---
priority: 80
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Context — What This Child Knows

## Source Layout

All source lives under `apps/zkagenticnetwork/`:

| Path | Contents |
|------|----------|
| `src/components/` | React components (Neural Lattice grid, terminal, dock panels, resource bar, onboarding) |
| `src/store/` | Zustand stores (game state, UI state, chain state) |
| `src/services/` | ChainService interface + implementations (TestnetChainService, MockChainService) |
| `src/hooks/` | Custom React hooks (game realtime, wallet, auth) |
| `src/types/` | TypeScript type definitions |
| `src/lib/` | Utilities, helpers |
| `src/app/` | Next.js App Router pages and layouts |
| `prisma/` | Database schema and migrations |
| `public/` | Static assets |

## Key Interfaces

- **ChainService** — abstraction over the blockchain API. Two implementations:
  - `TestnetChainService` — calls FastAPI at `localhost:8080` (dev) or `api.zkagentic.ai` (prod)
  - `MockChainService` — offline fallback with simulated responses
- **Supabase Realtime** — WebSocket subscription for live chain status, agent updates, epoch events
- **NextAuth v5** — Google OAuth provider, JWT strategy, Prisma adapter for session persistence

## Database

PostgreSQL 16 stores user identity only (email, username, wallet hash, subscription tier, blockchain coordinates). The blockchain is the source of truth for all game state.

**Two-tier user model:**
- "Hollow DB" — no Phantom wallet connected, DB only, limited actions
- "On-chain" — Phantom wallet connected, real chain actions

## Dependencies

- Parent (Exodus) owns the root CLAUDE.md, whitepaper, and vault
- Testnet API (`vault/agentic-chain/`) is a sibling concern, not owned by this child
- Static sites (zkagentic.com, zkagentic.ai) are separate domains, never modified by this child

## Testing

- **Vitest 4** + React Testing Library for unit/integration tests
- **Playwright** for E2E tests (in `playwright/` at repo root)
- `@solana/wallet-adapter-react` must be mocked globally in tests that render ResourceBar
- PixiJS sub-components need test stubs (canvas/WebGL unavailable in jsdom)
- DockPanel sub-components stubbed with `data-testid` markers in unit tests
