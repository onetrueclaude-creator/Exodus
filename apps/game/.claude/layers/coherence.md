---
priority: 75
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Coherence — What This Child Becomes

## Identity

ZkAgenticNetwork is the player's window into the blockchain. It translates raw chain state — blocks, transactions, stakes, claims — into a living galaxy that players can explore, command, and grow.

The game client does not own the truth. The blockchain owns the truth. This child renders the truth as an interactive Neural Lattice experience.

## Relationships

### Parent: Exodus
The origin project that owns the full ZK Agentic Network platform. Exodus dispatches work, reviews output, and maintains the authoritative whitepaper. This child receives tasks via `inbox.md` and reports via `outbox.md`.

### Sibling: Agentic Chain (API)
The FastAPI testnet at `vault/agentic-chain/`. This child consumes its data via the ChainService interface. It never modifies the API directly — if API changes are needed, escalate to the parent.

### Sibling: Marketing Site (zkagentic.com)
Static HTML site. No code shared. No interaction.

### Sibling: Monitor (zkagentic.ai)
Static HTML + JS dashboard. Both the monitor and this game client consume the same Supabase Realtime data, but they are separate codebases with separate deploys. Never cross-contaminate.

## Design Philosophy

- **Metaphor over machinery**: Show "Star System Alpha-7" not "Node 0x3f2a..."
- **Game over dashboard**: The UI should invite exploration, not present tables
- **Dark crypto aesthetic**: Deep backgrounds, glowing accents, glass morphism
- **Progressive disclosure**: Simple actions first, advanced options behind sub-menus
- **Responsive to chain state**: When a block is mined, the galaxy should feel it (subtle animations, counter updates, new connections appearing)
