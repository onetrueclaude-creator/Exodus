# ZK Agentic Network

## Required Reading
**Before working on any feature, read `spec/whitepaper.md`** — the whitepaper is the authoritative specification for all protocol mechanics (PoAIV consensus, Proof-of-Vault, dual staking with the finality firewall, tokenomics, subgrid resources, privacy architecture, and the SOL→L1 migration path). Its header states the current version (v1.7, Finality Single-Path Revision, July 2026) — never trust a version number cited elsewhere. All implementation must align with the whitepaper; `spec/CLAUDE.md` is the revision changelog.

## Project Overview
Gamified social media dApp where users explore a 2D Neural Lattice, communicate via haiku through AI agents, develop nodes with planets (content storage), research technologies, and build diplomatic relationships. All state is backed by the Agentic Chain testnet blockchain ledger. Since 2026-07-01 the protocol is building out its real-resources direction — players contribute verifiable **Disk / CPU / Time** (Proof-of-Vault storage shards, sampled possession proofs, and a soulbound gates-only Time tenure ledger; see whitepaper §5A/§5B and the S1–S3 chain modules).

## Tech Stack
- **Framework:** Next.js 16 (App Router, server mode with `output: 'standalone'`)
- **Language:** TypeScript 5, React 19
- **Rendering:** PixiJS 8 (2D Neural Lattice canvas)
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

## UI / PixiJS / Test-Mocking Patterns
Game-UI implementation patterns (DockPanel state rules, `focusRequest` consumption, PixiJS mutation and `world.children` rules, wallet-adapter and fetch mocking) live in **`apps/game/CLAUDE.md`** — the single source of truth for game-app gotchas. Read it before touching anything under `apps/game/`.

## Key Concepts (Neural Lattice)
- Neural Lattice = the full network grid (dynamic bounds, grows with epoch rings)
- Empire = a user's total territory
- Star system = an individual agent occupying a node on the lattice, base 10x10 coordinate blocks
- Node tier = Synapse (L1-3, 1.0×), Cortex (L4-6, 1.25×), Lattice (L7-9, 1.5×), Nexus (L10+, 2.0×); derived from numeric node level. Distinct from subscription tier.
- Claude model = LLM powering a deployed agent (Haiku/Sonnet/Opus), chosen at deploy time. Distinct from node tier — any node tier can run any model.
- CPU Energy = CPU deployed to maintaining the grid (yellow resource)
- Secured Chains = blocks secured by the user (green resource with +/- deltas)
- AGNTC = the native token; **fixed total supply of 1,000,000,000** (v1.6) — new circulating AGNTC is *released* only through subgrid mining, and the 5% ceiling is the per-epoch release rate of the earned buckets, not open-ended inflation. Node claims cost AGNTC + CPU (city model: inner expensive, outer cheap)
- Data Frags = compute production from mining
- Planets = content storage (posts, chats, prompts) orbiting nodes
- Jump points = nodes where new agents can be spawned
- Coordinates = (x, y, timestamp) — third value is time, not z-axis
- Node density = resource richness (0-100%), multiplies CPU cost for Secure actions

## Subscription Tiers
- **Community (free)**: 1,000 CPU Energy, yellowish-orange theme
- **Professional ($50/mo)**: 5,000 CPU Energy, cyan blue theme

All tiers can deploy any Claude model (Haiku/Sonnet/Opus) for both homenode and child agents. API cost is the natural gate. Tiers control resources (CPU Energy, deploy range, node count), visual theme, and governance weight.

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
5. **Settings** → network color (premium visual feature), status report

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
> I am asked to choose between two subscription methods. First one is Free for Community, a yellowish orange themed tier card. Second one is for Professional method, a cyan blue tier card. The tier cards show CPU Energy allocation, deploy range, node count, and governance weight. Each tier can use any Claude model — the difference is in resources, not model access. I choose free tier for now.
>
> I am now presented with a 2D grid map of the entire visualized blockchain environment. I see nodes with coordinates written on them. I see on the right upper corner the Timechain stats — it gives the genesis block timestamp, and it has a live blockchain, it shows how many epochs and blocks mined values, it shows critical live blockchain stats. For now it shows it is on testnet.
>
> I seem to have a CPU Energy ticker on the resources tab on the top, and Secured Chains. When the 2D grid map first rendered, it was focused on my Homenode. I see Neural Lattice networked nodes, and my Homenode has a border around it, it is yellow, like the subscription tier I've chosen.
>
> I see a window opened to give my agent prewritten commands. There are: Deploy Agent, Blockchain Protocols, Adjust Securing Operations Rate, Adjust Network Parameters, and Settings. I click Blockchain Protocols. This choice is most likely the only choice to perform operations on chain, it looks like. The agent now asks me for additional prewritten choices: Secure, Write Data On Chain, Read Data On Chain, Transact, Stats.
>
> For now I choose Secure. Other choices are self-explanatory and they can do what they say. The agent now asks me to choose again, for how many block generation cycles and for how much AGNTC Coin. It says I will have to pay CPU Energy on this action, and it says the AGNTC Coin I will receive is calculated from how much actual CPU that I will use by spending Claude usage.
>
> When I click execute action for 10 generations, and spend 500 of my CPU Energy (which is the yellow resource value shown above the 2D grid map), I click execute and it shows -500 CPU Energy in red right next to the yellow display, but the Secured Chains has +1 in green right next to it. The initial values were 1000 CPU Energy and 0 Secured Chains. Now it says 1000-500 CPU Energy and 0+1 Secured Chains. It looks like it will update in the next block creation cycle.
>
> The right-hand side stats window seems to be showing how many block creation cycles it has been since the genesis block creation, and est. time for next block creation. It seems to be creating a block every minute or so and has been creating for many minutes now since the genesis.
>
> I now look at the 2D map. I can click on the unclaimed nodes. I see that I can also deploy clones in the left-hand side bar — it changed when I clicked on the unclaimed node. I close the chat with my agent. I click "create agent" on the left bar while an unclaimed node is selected. Also I notice the Node density values. I see that this is a rich density node, which will give multipliers on the cost of the CPU Energy per blockchain Secure actions.
>
> I see model options: Haiku, Sonnet, and Opus. Each shows an estimated API cost indicator. I choose Haiku because it's the most cost-effective for a secondary node. I could deploy Opus here, but the API costs would be significantly higher — the choice is economic, not a tier restriction.

## Navigation Connectors

When working in a directory, read `seed.md` first (purpose), then `CLAUDE.md` (history). Start from `seed.md` at the root to navigate the full tree.

| Directory | Purpose |
|-----------|---------|
| `seed.md` | **Root** — project tree map, architecture table, navigation connector index |
| `spec/seed.md` → `spec/CLAUDE.md` | Knowledge base — whitepaper (+ revision changelog), research, product |
| `apps/game/CLAUDE.md` | Game UI (Next.js/PixiJS) — components, store, services, UI gotchas |
| `apps/timegrid/` · `apps/zkagenticnetwork/` | Sibling apps (timegrid was forked out to the Timechain Grid project 2026-04-29) |
| `chain/seed.md` → `chain/CLAUDE.md` | Testnet API — protocol, consensus, mining, Proof-of-Vault |
| `tests/seed.md` → `tests/CLAUDE.md` | E2E + visual test suites |
| `web/marketing/` · `web/monitor/` | Site sources (marketing → zkagentic.com; monitor → zkagentic.ai) — see `DEPLOY.md`, never mix them |
| `docs/seed.md` → `docs/CLAUDE.md` | Working documentation index |

Sub-directory seeds have their own connector tables pointing up (parent), down (children), and sideways (related).

---

## Change Log

See [CHANGELOG.md](CHANGELOG.md) for detailed development history.
