# Testnet Monitor Dashboard — zkagentic.ai

**Date:** 2026-03-12
**Status:** Approved
**Domain:** zkagentic.ai (existing Cloudflare Pages deployment)

## Purpose

Replace the current marketing site on zkagentic.ai with a public blockchain monitoring dashboard for the ZK Agentic Chain testnet. Inspired by timechaincalendar.com — a single-screen, real-time dashboard showing chain health, block production, mining, and staking statistics.

## Architecture

- **Format:** Single-page static HTML (no build step)
- **Hosting:** Cloudflare Pages (existing setup)
- **Data:** Supabase Realtime subscriptions (anon key, public read)
- **Styling:** Reuse compiled Tailwind CSS from zkagentic.com + inline dashboard styles
- **Simulator:** Streamlit tokenomics app embedded via iframe tab

## Layout

```
┌─────────────────────────────────────────────────┐
│  [Logo] ZK Agentic Chain — Testnet Monitor  [●] │  header + live indicator
├─────────────────────────────────────────────────┤
│              BLOCK  12,847                      │  hero (giant monospace)
│          Epoch Ring 3 · State: 0xa7f...         │  subtitle
├────────────┬────────────┬───────────────────────┤
│  MINING    │  NETWORK   │  BLOCK PRODUCTION     │  stat card row 1
├────────────┴────────────┴───────────────────────┤
│  STAKING               │  EPOCH                 │  stat card row 2
├─────────────────────────────────────────────────┤
│  [Dashboard] [Tokenomics Simulator]             │  tab nav
│  (Streamlit iframe when simulator tab active)   │
├─────────────────────────────────────────────────┤
│  Last updated: 12s ago · Testnet: LIVE 🟢       │  footer status bar
└─────────────────────────────────────────────────┘
```

## Stat Cards

| Card | Values | Source |
|------|--------|--------|
| **Mining** | Total AGNTC mined, mining rate | `chain_status.total_mined` |
| **Network** | Total agents, total claims | `count(agents)`, `chain_status.total_claims` |
| **Block Production** | Avg block time, next block countdown | `chain_status.next_block_in` |
| **Staking** | Total CPU staked, formula reminder | `sum(agents.staked_cpu)` |
| **Epoch** | Current ring, hardness (16N), progress to next | `chain_status.epoch_ring` |

## Data Flow

1. Page loads → initialize Supabase client (CDN, anon key)
2. Fetch `chain_status` (`.single()`) → populate hero + cards
3. Fetch `agents` (aggregate count + sum staked_cpu) → populate Network + Staking cards
4. Subscribe to `chain_status` Realtime channel → auto-update hero + cards on change
5. Heartbeat timer (10s tick):
   - **LIVE** (green) — update received within 120s
   - **STALE** (yellow) — 120s–600s since last update
   - **OFFLINE** (red) — 600s+ or connection failed

## RLS Changes

Two new policies for anonymous public read access:

```sql
CREATE POLICY "public can read chain_status"
  ON public.chain_status FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "public can read agents"
  ON public.agents FOR SELECT
  TO anon
  USING (true);
```

## Visual Design

- **Background:** Pure black (#000 / existing `bg-background`)
- **Cards:** Glass-morphism (`glass-card` class from existing compiled CSS)
- **Hero number:** White, ~80px, monospace
- **Labels:** Uppercase, muted grey, small
- **Accents:** Cyan `#22d3ee` (primary values), purple `#a78bfa` (secondary)
- **Live dot:** Green `#22c55e` / Yellow `#eab308` / Red `#ef4444`
- **Card headers:** Outlined pill shapes
- **Responsive:** Cards stack vertically on mobile

## Files

| File | Purpose |
|------|---------|
| `index.html` | Dashboard page |
| `js/monitor.js` | Supabase client, Realtime subscription, DOM updates |
| `CNAME` | `zkagentic.ai` |

## Tokenomics Simulator

Embedded as an iframe pointing to:
`https://onetrueclaude-creator-agentic-chain-simulator.streamlit.app/?embedded=true`

Shown when user clicks the "Tokenomics Simulator" tab. Hidden by default (Dashboard tab active).

## Security

- Anon key is safe for client-side use (RLS enforced)
- Only SELECT policies added (no write access for anon)
- Agent data (coordinates, tiers, staking) is public by design (on-chain data)
- No user PII exposed through the dashboard
