# Timechain Grid (`apps/timegrid`)

Public, privacy-first Bitcoin wallet civilization viewer. A 2D-lattice rendering of the Bitcoin blockchain across time — every miner and economically significant wallet appears as a node, the network grows as new wallets emerge, transactions form transient bonds that fade over ~10 blocks, and force-directed gravity keeps high-mass wallets (e.g. Satoshi) anchored to the origin.

Forked from `apps/game` (zkagenticnetwork.com). Shares 30–40% of its rendering layer via `@exodus/lattice-core`.

## Run locally

```bash
cd apps/timegrid
npm install
npm run dev          # → http://localhost:3000
```

## Stack

- **Framework:** Next.js 16 (standalone)
- **Rendering:** PixiJS 8 (2D canvas, Web Worker for keyframe interpolation)
- **State:** Zustand 5
- **Styling:** Tailwind CSS 4 (dark theme, no third-party fonts)
- **Testing:** Vitest 4 + React Testing Library
- **Data:** Static parquet snapshots fetched from own CDN; queried in-browser via DuckDB-Wasm

## Privacy posture

Zero centralized API calls from the browser during normal usage. All data fetched from a self-hosted CDN bucket (Cloudflare R2 or equivalent), with no per-viewer telemetry, analytics, or third-party scripts. Source data extracted offline from a self-hosted `bitcoind` + `electrs` indexer over Bitcoin's P2P protocol.

## Project structure (planned, in progress)

```
src/
├── app/                    Next.js App Router (layout, page, api/tail)
├── components/             BitcoinLatticeView, TimeScrubber, BlockLookupBar,
│                           EpochQuickLinks, TwentyFourHourRing,
│                           WalletInspectorPanel, BlockStatsPanel, BondsLayer
├── data/                   BitcoinChainAdapter, parquetClient,
│                           keyframeInterpolator, activityResolver
├── store/                  timegridStore.ts (Zustand)
└── types/                  wallet.ts, block.ts
```

## Status

Skeleton stage. Boots a placeholder page; canvas rendering pending integration with `@exodus/lattice-core` (which is itself in the middle of being extracted from `apps/game`).
