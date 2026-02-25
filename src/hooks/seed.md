# Seed — src/hooks/

> Custom React hooks for ZK Agentic Network.
> Read `CLAUDE.md` for what changed.

## What This Directory Serves

Custom hooks that bridge game state, blockchain polling, and real-time data into React components.

## Hooks

| Hook | Description |
|------|-------------|
| `useGameRealtime.ts` | Polls `TestnetChainService`, syncs Supabase realtime, sets `isReady` gate |
| `useTestnetWebSocket.ts` | WebSocket connection to testnet for live block events |

## Architecture

```
useGameRealtime
  ├─ Promise.race(fetchAgents, 5s timeout)   ← Supabase SSL bypass
  ├─ sets isReady = true (finally block)
  └─ Zustand: setAgents(), setIsInitializing()

useTestnetWebSocket
  └─ ws://localhost:8080/ws → block events → Zustand: addBlock()
```

## Key Patterns

- **5s timeout race:** `useGameRealtime` uses `Promise.race` to prevent hanging on SSL/network errors
- **isReady gate:** `game/page.tsx` waits for `isReady` before hiding loading overlay

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../seed.md` | src/ tree |
| State | `../store/seed.md` | Zustand store hooks write to |
| Services | `../services/seed.md` | Services hooks call |
| Components | `../components/seed.md` | Components that use these hooks |
| Chain server | `../../apps/agentic-chain/seed.md` | Data source |
