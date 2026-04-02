# Galaxy Grid: Faction Fog + Camera + Node Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the game match the priority story — Community users see only their arm (hard fog on others), camera opens centered on homenode at legible zoom, homenode has a visible ring highlight.

**Architecture:** Three-layer fix: (1) store separates "node claimed" from "faction visible to player"; (2) GalaxyGrid fixes auto-zoom bounding box + focusRequest retry; (3) StarNode adds homenode ring. All changes are additive — no existing public API is removed.

**Tech Stack:** TypeScript 5, Zustand 5, PixiJS 8, React 19, Next.js 16, Vitest 4

---

## Task 1: Add `revealFaction` + `devRevealAll` to store; remove auto-reveal from `claimBlocknode`

**Files:**

- Modify: `src/store/gameStore.ts`

**Context:**
`claimBlocknode` currently auto-adds the node's faction to `visibleFactions`. This means dev seeds
(treasury, founder) pollute the player's visible factions. We want `visibleFactions` to represent
only what the player has explicitly unlocked.

Also fix `syncBlocknodeFromSupabase` which has the same auto-reveal problem.

**Step 1: Write failing tests**

Open `src/__tests__/gameStore.test.ts`. Find the test at line ~23:

```
it("claimBlocknode sets ownerId and adds to visibleFactions", () => {
```

Update it to:

```typescript
it("claimBlocknode sets ownerId but does NOT auto-add to visibleFactions", () => {
  useGameStore.getState().initGalaxy(1);
  const result = useGameStore.getState().claimBlocknode("block-0-community", "user-001");
  expect(result).toBe(true);
  const state = useGameStore.getState();
  expect(state.blocknodes["block-0-community"].ownerId).toBe("user-001");
  // visibleFactions must NOT be auto-populated — player must call revealFaction explicitly
  expect(state.visibleFactions).toEqual([]);
});
```

Add two new tests at the bottom of the same describe block:

```typescript
it("revealFaction adds faction to visibleFactions", () => {
  useGameStore.getState().initGalaxy(1);
  useGameStore.getState().revealFaction("community");
  expect(useGameStore.getState().visibleFactions).toContain("community");
});

it("revealFaction is idempotent — does not duplicate", () => {
  useGameStore.getState().initGalaxy(1);
  useGameStore.getState().revealFaction("community");
  useGameStore.getState().revealFaction("community");
  expect(useGameStore.getState().visibleFactions.filter((f) => f === "community").length).toBe(1);
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|claimBlocknode|revealFaction" | head -20
```

Expected: the updated `claimBlocknode` test fails (currently visibleFactions IS auto-populated), new revealFaction tests fail (action doesn't exist yet).

**Step 3: Implement changes in `src/store/gameStore.ts`**

3a. Add `revealFaction` to the store interface (around line 138):

```typescript
  revealFaction: (faction: FactionId) => void;
  devRevealAll: boolean;
  setDevRevealAll: (on: boolean) => void;
```

3b. Add initial state (around line 168):

```typescript
  devRevealAll: false,
```

3c. Remove the `visibleFactions` update from `claimBlocknode` (lines 574-576). The updated `set` call becomes:

```typescript
set((state) => ({
  blocknodes: {
    ...state.blocknodes,
    [nodeId]: { ...node, ownerId: userId },
  },
  // visibleFactions NOT updated here — call revealFaction() explicitly
}));
```

3d. Remove the `visibleFactions` update from `syncBlocknodeFromSupabase` (lines 692-695):

```typescript
  syncBlocknodeFromSupabase: (node) =>
    set((s) => ({
      blocknodes: { ...s.blocknodes, [node.id]: node },
      // visibleFactions not auto-updated — controlled explicitly
    })),
```

3e. Add the new actions at the end of the actions section (before `reset`):

```typescript
  revealFaction: (faction) =>
    set((s) => ({
      visibleFactions: s.visibleFactions.includes(faction)
        ? s.visibleFactions
        : [...s.visibleFactions, faction],
    })),

  setDevRevealAll: (on) => set({ devRevealAll: on }),
```

**Step 4: Run tests**

```bash
npm run test:run 2>&1 | tail -5
```

Expected: all tests pass (including the updated and new ones).

**Step 5: Commit**

```bash
git add src/store/gameStore.ts src/__tests__/gameStore.test.ts
git commit -m "feat(store): separate claimBlocknode from visibleFactions; add revealFaction + devRevealAll"
```

---

## Task 2: Update `page.tsx` — call `revealFaction` instead of `setVisibleFactions(all4)`

**Files:**

- Modify: `src/app/game/page.tsx`

**Context:**
Line 202 in `page.tsx` calls `setVisibleFactions(["community","treasury","founder","pro-max"])` for
all new users. This needs to become `revealFaction(newUserFaction)` so the player only sees their
own arm. The dev seed claims (treasury, founder) still run but no longer pollute visibleFactions.

**Step 1: Write a failing integration check (no new test file needed — use existing gameStore test)**

Verify current failing behavior in the console by checking that after the refactor the old all-4 call no longer exists. Do a quick grep:

```bash
grep -n "setVisibleFactions.*community.*treasury" src/app/game/page.tsx
```

Expected: should find the line. After the fix it should return nothing.

**Step 2: Update `page.tsx`**

Find `revealFaction` — it's not yet imported. Add it to the destructured store hooks near the top:

```typescript
const revealFaction = useGameStore((s) => s.revealFaction);
```

Find line 202:

```typescript
useGameStore.getState().setVisibleFactions(["community", "treasury", "founder", "pro-max"]);
```

Replace with:

```typescript
revealFaction(newUserFaction);
```

**Step 3: Run tests**

```bash
npm run test:run 2>&1 | tail -5
```

Expected: all tests pass.

**Step 4: Verify by grep**

```bash
grep -n "setVisibleFactions.*community.*treasury" src/app/game/page.tsx
```

Expected: no output.

**Step 5: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat(game): new user reveals only own faction arm on join"
```

---

## Task 3: Fix `GalaxyGrid.tsx` — focusRequest retry, auto-zoom cap, devRevealAll key

**Files:**

- Modify: `src/components/GalaxyGrid.tsx`

**Context:**
Three independent fixes in the same file:

1. The `focusRequest` effect doesn't retry when PixiJS initializes after the request is set
2. The auto-zoom bounding box includes ALL nodes — when testnet has 11+ blocks, this zooms to ~29% making nodes sub-pixel invisible
3. Need to wire up the `D` key hotkey to toggle `devRevealAll` for dev testing

**Step 1: Fix focusRequest effect deps**

Find the focusRequest effect (around line 329):

```typescript
  }, [focusRequest, clearFocusRequest, setCamera]);
```

Change to:

```typescript
  }, [focusRequest, appReady, clearFocusRequest, setCamera]);
```

Also update the guard at the top of the effect:

```typescript
  useEffect(() => {
    if (!focusRequest || !appReady) return;
    // rest of effect...
```

**Step 2: Cap auto-zoom bounding box to inner rings**

Find the auto-zoom section (around line 293):

```typescript
    const visibleNodes = nodes.filter((n) => visibleFactions.includes(n.faction));
    if (visibleNodes.length > 0 && !hasBlocknodeZoomedRef.current) {
      hasBlocknodeZoomedRef.current = true;
      let minPx = Infinity, maxPx = -Infinity;
      let minPy = Infinity, maxPy = -Infinity;
      for (const node of visibleNodes) {
```

Replace with:

```typescript
    const visibleNodes = nodes.filter((n) => visibleFactions.includes(n.faction));
    if (visibleNodes.length > 0 && !hasBlocknodeZoomedRef.current) {
      hasBlocknodeZoomedRef.current = true;
      // Only use inner rings (0–2) for the initial zoom calculation.
      // When the testnet has processed many blocks, far-out nodes would shrink
      // the zoom to sub-pixel levels. Inner nodes guarantee a legible initial view.
      const zoomNodes = visibleNodes.filter(n => n.ringIndex <= 2);
      const nodesForZoom = zoomNodes.length > 0 ? zoomNodes : visibleNodes;
      let minPx = Infinity, maxPx = -Infinity;
      let minPy = Infinity, maxPy = -Infinity;
      for (const node of nodesForZoom) {
```

Also add a minimum zoom floor after `fitZoom` is calculated:

```typescript
const MIN_INITIAL_ZOOM = 0.8;
const clampedZoom = Math.max(MIN_INITIAL_ZOOM, fitZoom);
```

And use `clampedZoom` instead of `fitZoom` in the `world.scale.set(...)` and `setZoom(...)` calls.

**Step 3: Add devRevealAll to render effect dependencies**

Find the render effect dependencies (line 324):

```typescript
  }, [appReady, blocknodes, visibleFactions, totalBlocksMined]);
```

First, subscribe to the new store value near the other store subscriptions (around line 35):

```typescript
const devRevealAll = useGameStore((s) => s.devRevealAll);
const setDevRevealAll = useGameStore((s) => s.setDevRevealAll);
```

In the render effect, compute effective visible factions:

```typescript
  useEffect(() => {
    if (!appReady) return;
    // ...existing null checks...

    // In dev mode, D key reveals all 4 factions
    const effectiveVisible = devRevealAll
      ? (["community", "treasury", "founder", "pro-max"] as FactionId[])
      : visibleFactions;

    // Replace all `visibleFactions` references below with `effectiveVisible`
```

Then replace the two usages of `visibleFactions` within the effect body:

- `const isVisible = visibleFactions.includes(node.faction)` → `effectiveVisible.includes(node.faction)`
- `const visibleNodes = nodes.filter((n) => visibleFactions.includes(n.faction))` → `effectiveVisible`

Add to effect deps:

```typescript
  }, [appReady, blocknodes, visibleFactions, totalBlocksMined, devRevealAll]);
```

Also update `updateGridBackground` call to use `effectiveVisible`:

```typescript
updateGridBackground(
  bgRef.current,
  blocknodes,
  effectiveVisible,
  Math.min(30, Math.max(1, totalBlocksMined + 1))
);
```

**Step 4: Add keyboard handler for `D` key (dev only)**

Add a keydown effect in `GalaxyGrid.tsx` after the existing effects:

```typescript
// Dev-only: press D to toggle full galaxy reveal
useEffect(() => {
  if (process.env.NODE_ENV !== "development") return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === "d" || e.key === "D") setDevRevealAll(!devRevealAll);
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [devRevealAll, setDevRevealAll]);
```

**Step 5: Run tests**

```bash
npm run test:run 2>&1 | tail -5
```

Expected: all pass (GalaxyGrid is not unit-tested; the store changes are already tested).

**Step 6: Commit**

```bash
git add src/components/GalaxyGrid.tsx
git commit -m "fix(grid): retry focusRequest when appReady; cap auto-zoom to ring≤2; add D key dev reveal"
```

---

## Task 4: Add homenode ring highlight in `StarNode.ts`

**Files:**

- Modify: `src/components/grid/StarNode.ts`

**Context:**
The story says "my Homenode has a border around it, it is yellow, like the subscription tier I've
chosen." We need to add a ring to `createBlockNode` when the node is owned by the current user.
This requires passing `currentUserId` and `empireColor` as additional parameters.

**Step 1: Update `createBlockNode` signature**

Find the function signature (line 176):

```typescript
export function createBlockNode(node: BlockNode, isVisible: boolean): Container {
```

Change to:

```typescript
export function createBlockNode(
  node: BlockNode,
  isVisible: boolean,
  currentUserId?: string,
  empireColor?: number
): Container {
```

**Step 2: Add the homenode ring**

Find where `claimRing` is drawn (around line 242):

```typescript
// Claim ring — shown when node is owned
if (node.ownerId) {
  const claimRing = new Graphics();
  claimRing.circle(0, 0, baseRadius * 1.2);
  claimRing.stroke({ width: 1, color, alpha: alpha * 0.7 });
  container.addChild(claimRing);
}
```

Add the homenode ring AFTER the claim ring:

```typescript
// Homenode ring — extra bright ring for the current player's own node
if (node.ownerId && currentUserId && node.ownerId === currentUserId && empireColor !== undefined) {
  const homeRing = new Graphics();
  homeRing.circle(0, 0, baseRadius * 1.8);
  homeRing.stroke({ width: 2, color: empireColor, alpha: 0.85 });
  container.addChild(homeRing);
}
```

**Step 3: Update `GalaxyGrid.tsx` to pass the new params**

In `GalaxyGrid.tsx`, subscribe to `empireColor` near the other store subscriptions:

```typescript
const empireColor = useGameStore((s) => s.empireColor);
```

Find the `createBlockNode` call in the render effect (around line 283):

```typescript
const nodeContainer = createBlockNode(node, isVisible);
```

Change to:

```typescript
const nodeContainer = createBlockNode(node, isVisible, currentUserId ?? undefined, empireColor);
```

**Step 4: Run tests**

```bash
npm run test:run 2>&1 | tail -5
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/components/grid/StarNode.ts src/components/GalaxyGrid.tsx
git commit -m "feat(grid): add homenode ring highlight in player's empire color"
```

---

## Task 5: Final verification

**Step 1: Run full test suite**

```bash
npm run test:run 2>&1 | tail -10
```

Expected: 351/351 (or higher) tests pass, 0 failures.

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no errors in project source files.

**Step 3: Smoke-test in browser**

Open `http://localhost:3000` (start server if not running: `npm run dev`), select Community tier.

Verify:

- [ ] Grid renders with community arm visible (upper-left spiral, white nodes)
- [ ] Other 3 arms are hard-fogged (grid lines visible, no node circles, dark fill)
- [ ] Camera starts centered on the ring-0 community homenode
- [ ] Homenode has a bright ring around it (white, empire color)
- [ ] Coordinates `(cx,cy)` are readable above each node
- [ ] Press `D` — all 4 arms reveal (dev mode toggle)
- [ ] Press `D` again — back to community-only view
- [ ] Click ⌂ Home Node button — camera snaps to homenode

**Step 4: Commit final**

```bash
git add .
git commit -m "chore: final verification — faction fog + camera + homenode ring complete"
```

---

## Summary of Changes

| Task | Files                               | What It Does                                                        |
| ---- | ----------------------------------- | ------------------------------------------------------------------- |
| 1    | `gameStore.ts`, `gameStore.test.ts` | Separate claiming from visibility; add revealFaction + devRevealAll |
| 2    | `page.tsx`                          | New user reveals only own faction arm                               |
| 3    | `GalaxyGrid.tsx`                    | Fix focusRequest retry; cap zoom to inner rings; D key toggle       |
| 4    | `StarNode.ts`, `GalaxyGrid.tsx`     | Homenode ring in empire color                                       |
| 5    | —                                   | Verification                                                        |
