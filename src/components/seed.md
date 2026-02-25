# Seed — src/components/

> React component library for ZK Agentic Network.
> Read `CLAUDE.md` for what changed, what's being added, and why.

## What This Directory Serves

All React UI components for the game — from the PixiJS galaxy canvas to HUD overlays, dock panels, and agent terminals.

## Key Components

| Component | Description |
|-----------|-------------|
| `GalaxyGrid.tsx` | **Core** — PixiJS 8 canvas, 2D galaxy grid renderer, faction coloring |
| `ResourceBar.tsx` | Top HUD: CPU Energy, Secured Chains, AGNTC display |
| `DockPanel.tsx` | Right sidebar dock — toggles panels via Zustand `activeDockPanel` |
| `AgentPanel.tsx` | Agent terminal (command tree: Deploy/Protocols/Secure/etc.) |
| `AgentChat.tsx` | Dock panel: chat history for selected agent |
| `GalaxyChatRoom.tsx` | Dock panel: network-wide broadcast feed |
| `TimechainStats.tsx` | Dock panel: live blockchain stats (blocks, epochs, next block time) |
| `SecuredNodes.tsx` | Dock panel: user's secured coordinate list |
| `TabNavigation.tsx` | Bottom tab bar: Network / Account / Researches / Skills |
| `AccountView.tsx` | Account tab content |
| `ResearchPanel.tsx` | Researches tab content |
| `SkillsPanel.tsx` | Skills tab content |
| `AgentCreator.tsx` | Deploy agent flow (node → model → intro → deploy) |
| `HaikuComposer.tsx` | NCP/haiku writer for Write Data On Chain |
| `DebugOverlay.tsx` | Dev-mode debug overlay |
| `Providers.tsx` | Wraps app with NextAuth + Zustand + Solana wallet providers |

## Architecture Patterns

- **DockPanel pattern:** All right-sidebar panels use `activeDockPanel` Zustand state (never local state)
- **PixiJS mutations:** Pure functions (e.g., `setNodeDimmed`) in separate files — not inline in components
- **No free-text in agent terminal:** Claude constrained to `choices[]` arrays only

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | src/ tree overview |
| Parent changelog | `../CLAUDE.md` | src/ change history |
| Store (state) | `../store/seed.md` | Zustand store driving component state |
| Hooks | `../hooks/seed.md` | Hooks feeding data into components |
| Types | `../types/seed.md` | TypeScript types used in components |
| Visual design | `../../vault/product/seed.md` | Product decisions driving UI |
| Chain simulator | `../../apps/agentic-chain/seed.md` | Data source for GalaxyGrid |
