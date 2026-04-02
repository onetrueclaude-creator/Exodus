---
priority: 75
last_read: 2026-04-01T22:00:00Z
read_count: 0
---

# Coherence — What This Child Becomes

## Identity

The Agentic Chain testnet is the **beating heart of the ZK Agentic Network**. When the API is down, the monitor shows stale data and the game UI cannot function. Everything depends on this engine running correctly and reliably.

## Relationships

### Sister: zkagenticnetwork.com (Game UI)
The game UI is the primary consumer of this API. It sends commands (deploy agent, secure blocks, claim nodes) and reads state (chain status, agent positions, resources). The API produces the data the UI consumes. They must evolve in lockstep.

### Sister: zkagentic.ai (Testnet Monitor)
The monitor reads chain state via Supabase Realtime. It does not call the API directly — it observes the Supabase tables that `supabase_sync.py` writes after each mined block. The monitor is a passive observer; the API is the active writer.

### Parent: Exodus (Origin Orchestrator)
Exodus dispatches tasks, coordinates cross-project work, and manages the organizational tree. This child receives work via `inbox.md` and reports status via `outbox.md`.

## The Whitepaper Made Real

Every function in this codebase traces back to a section of `vault/whitepaper.md`. The whitepaper is the design; this is the implementation. When they diverge, the whitepaper wins (unless the whitepaper is being updated to reflect a deliberate protocol change).

## Growth Direction

- Short term: Railway deploy, public API at `api.zkagentic.ai`
- Medium term: Subgrid resource allocation (8x8 cell grids per node)
- Long term: SOL migration path, real validator network, mainnet
