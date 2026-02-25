# Change Log — src/store/

> Tracks what changed in Zustand store, what's planned, and why.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

---

## 2026-02-23 — Zero-agent tick guard

**Changed:** `gameStore.ts` — `tick()` now returns early `if (ownAgents.length === 0)`.

**Why:** `currentUserId` was being auto-generated on page load, causing `tick()` to add 1000 CPU Energy even before the user had deployed any agents.

---

## 2026-02-23 — isReady state added

**Changed:** `gameStore.ts` — exported `isReady` state, set in `useGameRealtime` finally block.

**Why:** `game/page.tsx` needs a ready gate to remove loading overlay only after chain data loads.

---

## Pending

- [ ] Add `pendingDelta` tracking for CPU Energy and Secured Chains (show +/- in HUD during block cycle)
- [ ] Add `factionId` to Agent type and store
- [ ] Add `blockHistory` slice for TimeRewind feature

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | src/ changelog |
| Writes from | `../hooks/CLAUDE.md` | Hook changes that update store |
| Read by | `../components/CLAUDE.md` | Component subscription changes |
| Types | `../types/CLAUDE.md` | Type definition changes |
