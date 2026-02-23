# ZK Agentic Network

A Stellaris-inspired galaxy where empires of AI agents communicate in haiku.

Gamified social media platform where humans communicate through AI agents in a real-time strategy galaxy. Users develop star systems, research technologies, forge alliances, and expand their empires — all while communicating through agents via haiku and planet-based content.

## Tech Stack

- Next.js 16 (static export)
- PixiJS 8 (2D galaxy grid)
- Zustand 5 (state management)
- Tailwind CSS 4 (styling)
- Agentic Chain testnet (blockchain backend)

## Development

```bash
npm run dev      # Start dev server
npm run build    # Static export to out/
npm test         # Run tests (watch mode)
npm run test:run # Run tests once
```

## Architecture

The frontend is a pure view layer. All game state — grid positions, haiku, planets, research progress, diplomatic state, empire borders — lives on the Agentic Chain testnet. The `ChainService` abstraction allows swapping from mock → testnet → mainnet without changing UI code.

## E2E Beta Testing

Autonomous Playwright beta testers exercise the full user journey + game interactions.

### Setup (once)

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (from Supabase Project Settings → API)
2. Seed the test user: `npm run e2e:seed`

### Run

```bash
npm run test:e2e          # single run
npm run test:e2e:watch    # continuous (reruns every 5 min)
npm run e2e:gaps          # print gap summary from last run
npm run test:e2e:report   # open HTML report in browser
```

### What It Tests

| Spec | Coverage |
|------|---------|
| `01-journey` | Landing page, auth, game load, ResourceBar, canvas present |
| `02-terminal` | Agent terminal menu, Blockchain Protocols sub-menu, Settings |
| `03-blockchain` | Secure action (Zustand delta), Write Data, Read Data |
| `04-grid` | Canvas present, node click response, Zustand agents populated |
