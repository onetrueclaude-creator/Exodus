# Seed — src/lib/

> Shared utility functions for ZK Agentic Network.
> Read `CLAUDE.md` for what changed.

## What This Directory Serves

Pure utility functions and helpers used across components, hooks, and services. No React or Zustand here — purely functional modules.

## Contents

| File/Dir | Description |
|----------|-------------|
| `auth.ts` | NextAuth session helpers, user role resolution |
| `debugListener.ts` | Global keyboard shortcut listener for dev overlay |
| `diplomacy.ts` | Faction relation calculations |
| `energy.ts` | CPU Energy computation (token spend → energy, density multipliers) |
| `fog.ts` | Fog-of-war calculations (faction visibility, rival arm tinting) |
| `format.ts` | Number formatting, coordinate display, timestamp formatting |
| `persistResources.ts` | LocalStorage persistence for resource state |
| `persistSocial.ts` | LocalStorage persistence for social/haiku data |
| `placement.ts` | Agent placement rules (jump points, node eligibility) |
| `proximity.ts` | Node proximity detection, hover radius calculations |
| `research.ts` | Research tree calculations (unlock requirements, costs) |
| `syllables.ts` | Haiku syllable counter for NCP composition |
| `spiral/` | Logarithmic spiral math for galaxy grid layout |
| `supabase/` | Supabase client initialization and helpers |

## Architecture Pattern

All functions here are pure (no side effects, no global state). They're imported by components and hooks that need their logic.

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | src/ tree |
| Components using this | `../components/seed.md` | UI layer that calls lib functions |
| Hooks using this | `../hooks/seed.md` | Hooks that call lib functions |
| Chain math source | `../../apps/agentic-chain/seed.md` | Protocol params that energy/fog math mirrors |
| Supabase | `../../supabase/` | Supabase schema lib/supabase/ connects to |
