# Homenode vs Claimable Node Visual Distinction — Design

**Goal:** Make owned nodes visually distinct from claimable nodes on the galaxy grid using a filled-vs-outline metaphor, with claimable nodes showing their faction shape (dimmed) instead of a generic dashed ring.

**Architecture:** Modify `FactionGlyphs.ts` to accept an `isOwned` flag controlling fill rendering, update `StarNode.ts` to classify unclaimed nodes by spiral faction position, and remove the generic dashed-ring unclaimed icon.

## Visual Treatment

| Node state | Shape | Stroke | Fill | Alpha |
|------------|-------|--------|------|-------|
| Owned (any faction) | Faction shape (circle/hex/tri/diamond) | Full color, 1.5px | 15% faction color | 0.85 |
| Claimable (in faction zone) | Same faction shape | Dimmed color, 1px | None | 0.35 |
| Origin (0,0) | Concentric rings | Unchanged | Unchanged | Unchanged |

## Code Changes

1. **`FactionGlyphs.ts`**: Add `isOwned` parameter to `createFactionGlyph`. When `isOwned=true`, add 15% alpha fill. When `false`, use thinner stroke (1px) and lower alpha.
2. **`StarNode.ts`**: Update `determineFaction` — for nodes without userId, classify by spiral position instead of returning `'unclaimed'`. Pass `isOwned` (derived from `!!agent.userId`) to `createFactionGlyph`.
3. **Remove `drawUnclaimedIcon`** — dashed ring replaced by dimmed faction shapes.
4. **Remove `'unclaimed'` from `FactionId`** — all nodes now belong to a faction.

## Sizing

- Origin: 28px (unchanged)
- Owned primary/opus: 22px (unchanged)
- Owned other: 16px (unchanged)
- Claimable: 14px (unchanged size, but now faction-shaped instead of dashed ring)
