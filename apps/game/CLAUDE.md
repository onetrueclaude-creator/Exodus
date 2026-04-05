# ZK Agentic Network

## Project Overview
Gamified social media dApp built on the Neural Lattice where users explore a 2D network grid, communicate via haiku through AI agents, develop nodes with planets (content storage), research technologies, and build diplomatic relationships. All state is backed by the Agentic Chain testnet blockchain ledger.

## Tech Stack
- **Framework:** Next.js 16 (App Router, server mode with `output: 'standalone'`)
- **Language:** TypeScript 5, React 19
- **Rendering:** PixiJS 8 (2D galaxy grid canvas)
- **State:** Zustand 5
- **Auth:** NextAuth v5 (Google OAuth, JWT strategy, Prisma adapter)
- **Database:** PostgreSQL 16 via Prisma 7 (Docker Compose for local dev)
- **Styling:** Tailwind CSS 4 (dark crypto aesthetic, cyan/purple accents)
- **Testing:** Vitest 4 + React Testing Library
- **Deployment:** Server mode (standalone), Cloudflare or Docker

## Architecture
- Frontend reads from/writes to the Agentic Chain testnet via `ChainService` interface
- `TestnetChainService` calls FastAPI at `localhost:8080`; `MockChainService` is offline fallback
- PostgreSQL stores user identity (email, username, wallet hash, subscription, blockchain coordinates)
- Blockchain is source of truth for game state; DB is auth cache
- **Two-tier user state:** "Hollow DB" (no Phantom wallet, DB only) vs "On-chain" (Phantom connected, real chain actions)
- **Tabbed layout**: ResourceBar (top) → TabNavigation → tab content (Network/Account/Researches/Skills)
- **Timechain Stats panel** in upper-right corner shows live blockchain status

## Conventions
- Path alias: `@/*` maps to `./src/*`
- Tests co-located in `__tests__/` directories or `*.test.ts(x)` files
- TDD approach: write failing test → implement → verify
- Components in `src/components/`, utilities in `src/lib/`, types in `src/types/`
- Services in `src/services/`, store in `src/store/`
- Dark theme with CSS variables defined in `globals.css`

## UI Architecture (DockPanel pattern)
- **Dock state lives in Zustand** (`activeDockPanel`), not component-local state — any part of the tree can open a panel
- `setActiveDockPanel(null)` is an unconditional close; `setActiveDockPanel(id)` toggles (same id = close, different id = switch)
- `activeTab` (tab navigation) and `activeDockPanel` (right sidebar) are **orthogonal** — never let one affect the other
- **`focusRequest` must be consumed** after the camera moves (`clearFocusRequest()`); leaving it set causes snap-back on every agent update
- CSS utility classes for dock UI: `dock-icon`, `dock-icon-active`, `glass-panel-floating`, `animate-slide-left` (defined in `globals.css`)
- Use `z-[25]` bracket syntax for non-standard z-index values (Tailwind 4 only generates z-0/10/20/30/40/50)

## PixiJS Patterns
- Mutations to PixiJS objects (alpha, tint, position) belong in pure functions (e.g. `setNodeDimmed`) imported into React effects — not inline in components
- Never iterate `world.children` and assume all children are star nodes — filter by explicit marker (`.label` string or future `.name === 'star-node'`)
- Canvas/WebGL is not available in jsdom — mock PixiJS sub-components with test stubs in unit tests

## Test Mocking Patterns
- `@solana/wallet-adapter-react` must be mocked globally in any test that renders `ResourceBar` (it calls `useWallet()` unconditionally)
- DockPanel sub-components (GalaxyChatRoom, AgentChat, SecuredNodes, TimechainStats, TimeRewind) should be stubbed with `data-testid` markers in unit tests to avoid canvas/WebGL crashes
- When a service makes multiple sequential `fetch` calls, each must be covered by its own `mockResolvedValueOnce` in test setup

## Key Concepts (Neural Lattice)
- Galaxy = the full network grid (6481x6481, -3240 to +3240)
- Empire = a user's total territory
- Star system = an individual agent (Opus/Sonnet/Haiku tier), base 10x10 coordinate blocks
- CPU Energy = CPU deployed to maintaining the grid (yellow resource)
- Secured Chains = blocks secured by the user (green resource with +/- deltas)
- AGNTC = tradeable coins, each mapped to a grid coordinate
- Data Frags = compute production from mining
- Planets = content storage (posts, chats, prompts) orbiting star systems
- Jump points = nodes where new agents can be spawned
- Coordinates = (x, y, timestamp) — third value is time, not z-axis
- Node density = resource richness (0-100%), multiplies CPU cost for Secure actions

## Subscription Tiers
- **Community (free)**: Sonnet Homenode, 1000 CPU Energy, yellowish-orange theme, deploys Haiku only
- **Professional ($50/mo)**: Opus Homenode, 500 CPU Energy, cyan blue theme, deploys up to Opus
- **Max ($200/mo)**: Opus Homenode, 2000 CPU Energy, purple theme, unlimited Opus deployment

## Onboarding Flow
Landing (/) → Google OAuth → /onboard (choose unique username, real-time check) → /subscribe (choose tier) → /game

## Agent Terminal Menu Structure
Top-level commands:
1. **Deploy Agent** → multi-step: pick node → pick model → set intro → deploy on-chain
2. **Blockchain Protocols** → sub-menu:
   - **Secure** → choose block cycles + AGNTC, costs CPU Energy (density multiplier)
   - **Write Data On Chain** → send NCP (neural communication packet)
   - **Read Data On Chain** → scan/report
   - **Transact** → AGNTC transfer (coming soon)
   - **Stats** → full status report
3. **Adjust Securing Operations Rate** → staking CPU sub-choices
4. **Adjust Network Parameters** → mining rate + border pressure
5. **Settings** → network color (Opus only), status report

## Commands
- `npm run dev` — development server (localhost:3000)
- `npm run build` — production build (standalone)
- `npm test` — run tests in watch mode
- `npm run test:run` — run tests once
- `docker compose up -d` — start PostgreSQL
- `npx prisma migrate dev` — apply database migrations
- `npx prisma generate` — regenerate Prisma client

---

## UX Design Spec (Authoritative Reference)

**Every feature implementation MUST align with this user story. Check this section before building any UI component.**

> I go to zkagenticnetwork.com, I see a landing page asking for Google Login. I am already logged in to Google from my Chrome. I click the Google auth that the website is asking me, Google automatically connects, only providing my email address. Then I see another window asking me for a unique username. I am asked to enter a unique username. I try entering "God" as username, but the entry box flashes red and says that username cannot be taken. It seems to check and compare against its datasets and checks and denies duplicate username attempts. That's good. I find a unique username and enter it.
>
> I am asked to choose between three subscription methods. First one is Free for Community, a yellowish orange themed tier card. Second one is for Professional method, a cyan blue tier card. And a Max access tier, able to start with Opus 4.6 agent model. I see that the Free for Community access can only create Sonnet agent at max and it says on the card "Sonnet Homenode". Max says "Opus Homenode", Pro says "Opus Homenode". I choose free tier for now.
>
> I am now presented with a 2D grid map of the entire visualized blockchain environment. I see nodes with coordinates written on them. I see on the right upper corner the Timechain stats — it gives the genesis block timestamp, and it has a live blockchain, it shows how many epochs and blocks mined values, it shows critical live blockchain stats. For now it shows it is on testnet.
>
> I seem to have a CPU Energy ticker on the resources tab on the top, and Secured Chains. When the 2D grid map first rendered, it was focused on my Sonnet Homenode. I see Neural Lattice networked nodes, and my Homenode has a border around it, it is yellow, like the subscription tier I've chosen.
>
> I see a window opened to give my Sonnet prewritten commands. There are: Deploy Agent, Blockchain Protocols, Adjust Securing Operations Rate, Adjust Network Parameters, and Settings. I click Blockchain Protocols. This choice is most likely the only choice to perform operations on chain, it looks like. The Sonnet now asks me for additional prewritten choices: Secure, Write Data On Chain, Read Data On Chain, Transact, Stats.
>
> For now I choose Secure. Other choices are self-explanatory and they can do what they say. Sonnet now asks me to choose again, for how many block generation cycles and for how much AGNTC Coin. It says I will have to pay CPU Energy on this action, and it says the AGNTC Coin I will receive is calculated from how much actual CPU that I will use by spending Claude usage.
>
> When I click execute action for 10 generations, and spend 500 of my CPU Energy (which is the yellow resource value shown above the 2D grid map), I click execute and it shows -500 CPU Energy in red right next to the yellow display, but the Secured Chains has +1 in green right next to it. The initial values were 1000 CPU Energy and 0 Secured Chains. Now it says 1000-500 CPU Energy and 0+1 Secured Chains. It looks like it will update in the next block creation cycle.
>
> The right-hand side stats window seems to be showing how many block creation cycles it has been since the genesis block creation, and est. time for next block creation. It seems to be creating a block every minute or so and has been creating for many minutes now since the genesis.
>
> I now look at the 2D map. I can click on the unclaimed nodes. I see that I can also deploy clones in the left-hand side bar — it changed when I clicked on the unclaimed node. I close the chat with my Sonnet. I click "create agent" on the left bar while an unclaimed node is selected. Also I notice the Node density values. I see that this is a rich density node, which will give multipliers on the cost of the CPU Energy per blockchain Secure actions.
>
> I create a Haiku because it only allows me to create Haiku because I am a free user, but I'm sure the Max subscription tier allows full Opus model agent creation for Securing nodes.
