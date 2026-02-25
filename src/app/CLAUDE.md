# Change Log — src/app/

> Tracks what changed in App Router routes, what's planned, and why.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

---

## 2026-02-23 — game/page.tsx: removed cold-start

**Changed:** `game/page.tsx`
- Reads agents from Zustand store snapshot instead of calling `service.getAgents()` directly
- Loading overlay uses `(isInitializing || !isReady)`
- Removed dead `addAgent` selector

**Why:** Eliminated double-fetch on mount; cold-start logic moved to `useGameRealtime` hook.

---

## Pending

- [ ] Add `/game/[agentId]` route for per-agent terminal deep link
- [ ] Add `/admin` route for genesis monitoring (founder tier only)
- [ ] `api/subscribe` — write blockchain coordinate to chain (not just DB) on subscription

## Navigation Connectors

| Direction | Path | Why |
|-----------|------|-----|
| Parent | `../CLAUDE.md` | src/ changelog |
| UI components | `../components/CLAUDE.md` | Component changes affecting game page |
| Realtime hook | `../hooks/CLAUDE.md` | useGameRealtime driving isReady |
| Store | `../store/CLAUDE.md` | Zustand changes |
