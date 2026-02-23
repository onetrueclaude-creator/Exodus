# Galaxy Grid: Faction Fog + Camera + Node Visibility Design

**Date:** 2026-02-22
**Status:** Approved
**Scope:** Approach B — faction fog refactor

---

## Problem Statement

The current game shows all 4 faction arms to every user regardless of subscription tier.
The priority story (CLAUDE.md UX Spec) requires that a free Community user only sees their
own arm (upper-left quadrant), with the other 3 factions hidden behind hard fog.

Three root bugs are blocking the story experience:

1. **All factions shown to everyone** — `setVisibleFactions(["community","treasury","founder","pro-max"])`
   is called unconditionally in the new-user init flow.
2. **Nodes invisible at runtime** — when the testnet has 11+ blocks, `syncFromChain` adds 44+
   nodes asynchronously and the auto-zoom bounding box widens to ~29% zoom, making 8px nodes
   sub-pixel and invisible.
3. **Focus request silently dropped** — `requestFocus(homenode.id)` fires before PixiJS is
   initialized; the focusRequest effect exits early without clearing the request, and since
   `appReady` is not in its dependency array, the effect never retries.

---

## Design

### 1. Faction Visibility System

**Goal:** `visibleFactions` reflects what the current player has unlocked, not all claimed factions.

**Changes to `gameStore.ts`:**

- Remove auto-add of faction in `claimBlocknode` — it will no longer update `visibleFactions`.
- Add new action: `revealFaction(faction: FactionId)` — explicitly unlocks a faction arm for
  the current player.
- Add dev-only flag: `devRevealAll: boolean` — when true, fog is suppressed for all 4 factions.
  Default: `false`. Toggled by pressing `D` on the keyboard in `GalaxyGrid.tsx`.

**Changes to `page.tsx` (new-user flow):**

```typescript
// BEFORE (wrong):
setVisibleFactions(["community", "treasury", "founder", "pro-max"]);

// AFTER (correct):
revealFaction(newUserFaction); // only the player's own arm
```

Dev seed (`claimBlocknode("block-0-treasury", ...)`, `claimBlocknode("block-0-founder", ...)`)
still runs to populate the chain state, but because it no longer auto-reveals, those factions
remain fogged for the player.

**Rendering in `GridBackground.ts`:**
No changes needed — it already uses `visibleFactions` for the fog/tint decision.
Arm cells for fogged factions get the full `FOG_ALPHA = 0.85` overlay; their Voronoi territory
is dark but still renders the grid lines and seed dots (the player can see the galaxy _shape_
is there, but cannot see content).

---

### 2. Camera & Node Visibility

**Auto-zoom fix:**
Cap the bounding box to ring-index ≤ 2 (genesis cluster only). This ensures the initial zoom
is always based on the 4–12 innermost nodes regardless of how many blocks the testnet has
processed:

```typescript
// Only use inner nodes for initial zoom
const zoomNodes = visibleNodes.filter((n) => n.ringIndex <= 2);
```

**Minimum zoom floor:**
Add `MIN_INITIAL_ZOOM = 0.8` applied only to the auto-zoom calculation, distinct from
`MIN_ZOOM = 0.1` (the user-draggable minimum). The auto-fit will never produce a zoom below 80%.

**Focus request fix:**
Add `appReady` to the focusRequest effect's dependency array:

```typescript
useEffect(() => {
  if (!focusRequest || !appReady) return; // guard both
  // ... camera move + clearFocusRequest()
}, [focusRequest, appReady, clearFocusRequest, setCamera]);
```

This ensures if `requestFocus` is called before PixiJS initializes, the effect retries once
`appReady` becomes true and the focus request is still in the store.

---

### 3. Homenode Ring Highlight

A claimed node owned by `currentUserId` gets an additional ring drawn at `empireColor`:

```typescript
if (node.ownerId === currentUserId) {
  const homeRing = new Graphics();
  homeRing.circle(0, 0, baseRadius * 1.6);
  homeRing.stroke({ width: 2, color: empireColor, alpha: 0.85 });
  container.addChild(homeRing);
  // TODO (v2): pulse animation via ticker
}
```

`empireColor` is already in the store (`s.empireColor`) and maps to the subscription tier:

- COMMUNITY → `0xffffff` (white)
- PROFESSIONAL → `0x00ffff` (cyan)
- MAX → `0xd946ef` (fuchsia)

Coordinate labels on nodes are already implemented (`coordLabel` in `createBlockNode`). ✅

---

## Implementation Plan (tasks for writing-plans)

| #   | File                              | Change                                                                                                                                            |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/store/gameStore.ts`          | Remove auto-reveal in `claimBlocknode`; add `revealFaction`, `devRevealAll` actions                                                               |
| 2   | `src/app/game/page.tsx`           | Replace `setVisibleFactions(all4)` with `revealFaction(playerFaction)`                                                                            |
| 3   | `src/components/GalaxyGrid.tsx`   | Fix focusRequest effect deps; cap auto-zoom to ring ≤ 2; add `D` key devRevealAll toggle; pass `currentUserId` + `empireColor` to createBlockNode |
| 4   | `src/components/grid/StarNode.ts` | Add homenode ring in `createBlockNode` when `ownerId === currentUserId`                                                                           |
| 5   | Tests                             | Update store tests for removed auto-reveal + new revealFaction action                                                                             |

---

## Success Criteria

- [ ] New Community user sees ONLY the community arm (upper-left spiral), other 3 factions hard-fogged
- [ ] Camera opens centered on the user's ring-0 homenode at ≥ 80% zoom
- [ ] Homenode has a visible ring highlight in the subscription tier color
- [ ] `D` key in dev mode toggles full-galaxy reveal for testing
- [ ] Pressing the ⌂ Home Node button always snaps back to homenode
- [ ] 351/351 tests still pass
