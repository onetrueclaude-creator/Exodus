# ZK Agentic Network

## Required Reading
**Before working on any feature, read `vault/whitepaper.md`** — the v1.0 whitepaper (21K words) is the authoritative specification for all protocol mechanics: PoAIV consensus, dual staking, tokenomics, subgrid resources, privacy architecture, and the SOL→L1 migration path. All implementation must align with the whitepaper.

## Project Overview
Stellaris-inspired gamified social media dApp where users explore a 2D galaxy grid, communicate via haiku through AI agents, develop star systems with planets (content storage), research technologies, and build diplomatic relationships. All state is backed by the Agentic Chain testnet blockchain ledger.

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

## Key Concepts (Stellaris Metaphor)
- Galaxy = the full network grid (dynamic bounds, grows with epoch rings)
- Empire = a user's total territory
- Star system = an individual agent (Opus/Sonnet/Haiku tier), base 10x10 coordinate blocks
- CPU Energy = CPU deployed to maintaining the grid (yellow resource)
- Secured Chains = blocks secured by the user (green resource with +/- deltas)
- AGNTC = tradeable coins; supply grows via mining only (soft cap with 5% ceiling). Node claims cost AGNTC + CPU (city model: inner expensive, outer cheap)
- Data Frags = compute production from mining
- Planets = content storage (posts, chats, prompts) orbiting star systems
- Jump points = nodes where new agents can be spawned
- Coordinates = (x, y, timestamp) — third value is time, not z-axis
- Node density = resource richness (0-100%), multiplies CPU cost for Secure actions

## Subscription Tiers
- **Community (free)**: Sonnet Homenode, 100 CPU Energy, yellowish-orange theme, deploys Haiku only
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
> I seem to have a CPU Energy ticker on the resources tab on the top, and Secured Chains. When the 2D grid map first rendered, it was focused on my Sonnet Homenode. I see a Stellaris-like networked nodes, and my Homenode has a border around it, it is yellow, like the subscription tier I've chosen.
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

## Compaction Memory

Three files at the project root capture conversation history across compactions (all gitignored):

| File | Contents |
|------|----------|
| `compacted.md` | Full conversation transcript (auto-written by PreCompact hook) |
| `compacted-summary.md` | LLM summary you write before compacting |
| `prompts.md` | User prompts only (auto-written by PreCompact hook) |

### Manual `/compact`

**Write a session summary first:**

1. Append a summary block to `compacted-summary.md`:
   ```
   <!-- summary-block: [ISO timestamp] -->
   ## Summary — [human timestamp]

   [What was accomplished, key decisions made, open work remaining, current branch/feature context]

   <!-- /summary-block -->
   ```
2. Then proceed with `/compact`

### Auto-compaction (triggered automatically at ~10% context remaining)

Auto-compaction fires without warning — you cannot write a summary beforehand. The PreCompact hook still captures `compacted.md` and `prompts.md` automatically.

**After auto-compaction resumes**, the SessionStart hook injects the most recent raw transcript block with an explicit instruction. You MUST:

1. Write a summary block to `compacted-summary.md` immediately (this is your first action)
2. Confirm to the user: "Auto-compaction occurred. I've written a summary to `compacted-summary.md`."
3. Briefly state what was compacted (1-2 sentences)

### After any compaction resumes

The SessionStart hook injects either `compacted-summary.md` (if it exists) or the most recent `compacted.md` block (auto-compaction fallback). You MUST:

1. Confirm to the user what was restored
2. Note: "Full transcript in `compacted.md`, all prompts in `prompts.md`"

## Dispatch State

`.claude/dispatch-state.json` tracks multi-session feature work (phase, step, branch, completed steps, artifact paths). Check it when resuming interrupted work.

---

## Navigation Connectors

When working in a directory, read `seed.md` first (purpose), then `CLAUDE.md` (history). Start from `seed.md` at the root to navigate the full tree.

| Directory | Purpose |
|-----------|---------|
| `seed.md` | **Root** — project tree map, architecture table, navigation connector index |
| `src/seed.md` → `src/CLAUDE.md` | Next.js source — components, store, services, hooks, types |
| `vault/seed.md` → `vault/CLAUDE.md` | Knowledge base — design, product, research, engineering |
| `playwright/seed.md` → `playwright/CLAUDE.md` | E2E test suite |
| `docs/seed.md` → `docs/CLAUDE.md` | Public documentation |

Sub-directory seeds have their own connector tables pointing up (parent), down (children), and sideways (related).

---

## Change Log

### 2026-03-28 — Gameplay Wiring + Public API Deployment + Monitor Enhancement

**Security:** Removed hardcoded Supabase service_role key from `supabase_sync.py`, moved to env vars via python-dotenv. CORS restricted to specific origins. Admin-gated `/api/reset` and `/api/automine`. Rate limiting via SlowAPI. WebSocket cap at 50 connections.
**Deployment:** Dockerfile, `requirements.txt`, `.dockerignore` for Railway. Public API at `api.zkagentic.ai` (pending deploy).
**Backend:** New Supabase tables `subgrid_allocations` and `resource_rewards` (per-wallet, RLS + Realtime). Sync functions added to `supabase_sync.py`.
**Monitor:** Circulating supply, burned fees, epoch progress bar cards added to zkagentic.ai. New Subgrid Simulator tab (wallet selector, 8x8 clickable grid, Apply via POST to API, live yields via Realtime).
**Game terminal:** Secure command redesigned from generation-based to cell allocation (8/16/32/48/64 cells via API). Chain Stats fetches live from public API instead of Zustand store.

### 2026-03-12 — Tokenomics v3: BME City Economics

**Design:** Node claims cost AGNTC + CPU (no longer mint tokens). Burn-Mint Equilibrium: claim burns flow to verifiers. City real estate model: inner rings expensive, outer cheap. Machines Faction as permanent accumulator (never sells, no voting power). Soft cap with 5% annual inflation ceiling. Human-only governance with 75% supermajority for emergency treasury unlock. 1 AGNTC fresh mint signup bonus.
**Backend:** params.py (v3 constants + legacy shims), mining.py (no CommunityPool), rewards.py (ceiling enforcement + BME), epoch.py (uncapped 16×ring hardness), coordinate.py (claim_cost function), genesis.py (no pool), api.py (claim cost endpoint).
**Stack:** All 4 layers updated (intent, judgement, coherence, context).
**Docs:** Whitepaper sections rewritten, new governance section, website tokenomics page updated.
**Design doc:** `docs/plans/2026-03-12-tokenomics-v3-design.md`

### 2026-02-25 — Tokenomics v2: organic growth model (commits `788b9cb38`..`764195e6b`)

**Design:** Removed scheduled inflation, organic growth model, 25/25/25/25 faction split.
**Backend:** params.py, epoch.py, mining.py, coordinate.py, genesis.py, api.py all updated. CommunityPool removed. Grid bounds dynamic. Hardness = 16N.
**Frontend:** Dynamic grid defaults (±20 genesis), removed `community_pool_remaining`, added `epoch_ring` to status.
**Tests:** 26 new v2 tests + all 593 existing tests passing.

### 2026-02-25 — Hierarchical memory system (commit `cb5e4c1c0`)

**Added:** 28 `seed.md` + 23 `CLAUDE.md` files across the full project tree. Every directory now has:
- `seed.md` — purpose/architecture descriptor, read first
- `CLAUDE.md` — timestamped changelog with navigation connectors

**Permissions:** `Read(**/seed.md)` and `Read(**/CLAUDE.md)` auto-allowed in `.claude/settings.json`.

**Also:** `GalaxyGrid.tsx` faction background hidden (`visible = false`) until minigrid sub-cells are formally introduced.

### 2026-02-24 — Galaxy grid: faction + connections + beta testers (commits `a0e79335e`, `adca30656`, `fbc9489c6`)

**Changed:** `GalaxyGrid.tsx` — 4-faction coloring, clean same-faction connections, full grid coverage, no void cells.

**Added:** 4 parallel Playwright faction beta-tester agents; fresh testnet setup per run.

**Design:** Galaxy grid redesign golden prompt captured in `vault/seed.md`; approved design doc at `vault/seed.md#approved-design-summary`.

### 2026-02-23 — Loading fix, energy tick guard, Playwright green (commits `~62aff06`, `~e87a349`)

**Fixed:** `useGameRealtime.ts` — `Promise.race` 5s Supabase timeout; `gameStore.ts` — zero-agent tick guard.

**Tests:** All 22 Playwright e2e tests passing.
