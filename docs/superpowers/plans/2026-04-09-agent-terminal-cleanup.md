# Agent Terminal Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the agent terminal: remove 8 obsolete menu items, replace one-shot Secure with ongoing CPU allocation (Mining/Securing per-block presets), add passive CPU regen, increase text sizes.

**Architecture:** Single-file rewrite of AgentChat.tsx AGENT_ACTIONS + menu rendering. Small additions to gameStore.ts (CPU regen in tick, new state fields) and subscription.ts (cpuRegen field). All dead code (border pressure, empire color, mining rate toggles) is removed.

**Tech Stack:** TypeScript, React 19, Zustand 5, Vitest

**Design Spec:** `docs/superpowers/specs/2026-04-09-agent-terminal-cleanup-design.md`

---

### Task 1: Add CPU regen to subscription plans and gameStore

**Files:**
- Modify: `apps/game/src/types/subscription.ts`
- Modify: `apps/game/src/store/gameStore.ts`

- [ ] **Step 1: Add cpuRegen to SubscriptionPlan type and plans**

In `apps/game/src/types/subscription.ts`, add `cpuRegen: number;` field to the `SubscriptionPlan` interface after `startMinerals`:

```typescript
  startMinerals: number;
  cpuRegen: number; // CPU Energy gained per turn (passive income)
```

Add `cpuRegen` values to each plan in `SUBSCRIPTION_PLANS`:
- COMMUNITY: `cpuRegen: 100`
- PROFESSIONAL: `cpuRegen: 200`

- [ ] **Step 2: Add new state fields to gameStore**

In `apps/game/src/store/gameStore.ts`, add to the `GameState` interface after `securedChains`:

```typescript
  // CPU allocation (per-block commitments)
  miningCpuPerBlock: number;
  securingCpuPerBlock: number;
  cpuRegenPerTurn: number;
```

Add to `initialState`:

```typescript
  miningCpuPerBlock: 0,
  securingCpuPerBlock: 0,
  cpuRegenPerTurn: 100, // default: Community tier
```

Add action signatures to the interface:

```typescript
  setCpuAllocation: (mining: number, securing: number) => void;
  setCpuRegen: (regen: number) => void;
```

Add implementations after the existing `setWalletState`:

```typescript
  setCpuAllocation: (mining, securing) => set({ miningCpuPerBlock: mining, securingCpuPerBlock: securing }),
  setCpuRegen: (regen) => set({ cpuRegenPerTurn: regen }),
```

- [ ] **Step 3: Update tick() to apply CPU regen and deduct commitments**

In the `tick()` function in gameStore.ts, replace the energy calculation. Currently:

```typescript
const netEnergy = totalMining - totalCpuCost - nodeMaintenance;
```

Replace the entire tick function body with:

```typescript
tick: () =>
  set((s) => {
    if (!s.currentUserId) return s;

    // CPU regen (passive income per turn)
    const regen = s.cpuRegenPerTurn;

    // CPU deductions (per-block commitments, applied each turn)
    const totalCommitted = s.miningCpuPerBlock + s.securingCpuPerBlock;

    // Owned blocknodes cost NODE_CPU_PER_TURN each
    const ownedNodes = Object.values(s.blocknodes).filter((n) => n.ownerId === s.currentUserId);
    const nodeMaintenance = ownedNodes.length * NODE_CPU_PER_TURN;

    const netEnergy = regen - totalCommitted - nodeMaintenance;

    return {
      turn: s.turn + 1,
      energy: Math.max(0, s.energy + netEnergy),
      minerals: s.minerals + Object.values(s.agents).filter((a) => a.userId === s.currentUserId).length,
      agntcBalance: s.agntcBalance,
    };
  }),
```

This removes the old border pressure cost, agent-based mining/CPU calculations, and border radius growth — all of which are dead code.

- [ ] **Step 4: Update game/page.tsx init to set cpuRegen from subscription plan**

In `apps/game/src/app/game/page.tsx`, in the init code where `useGameStore.setState` is called with `energy`, `agntcBalance`, `minerals`, add `cpuRegenPerTurn`:

Find:
```typescript
useGameStore.setState({
  currentUserId: newUserId,
  energy: plan.startEnergy,
  agntcBalance: plan.startAgntc + 1,
  minerals: plan.startMinerals,
  empireColor: DEV_FACTION_COLOR[newUserFaction],
});
```

Replace with:
```typescript
useGameStore.setState({
  currentUserId: newUserId,
  energy: plan.startEnergy,
  agntcBalance: plan.startAgntc + 1,
  minerals: plan.startMinerals,
  empireColor: DEV_FACTION_COLOR[newUserFaction],
  cpuRegenPerTurn: plan.cpuRegen,
});
```

Note: For dev factions (Founders/Machines) that use PROFESSIONAL tier plan, cpuRegen will be 200.

- [ ] **Step 5: Run TypeScript check**

Run: `cd apps/game && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/types/subscription.ts src/store/gameStore.ts src/app/game/page.tsx
git commit -m "feat(store): add CPU regen, mining/securing per-block state

Add cpuRegen to subscription plans (+100 Community, +200 Pro).
Add miningCpuPerBlock, securingCpuPerBlock, cpuRegenPerTurn to store.
Simplify tick(): regen - commitments - maintenance. Remove dead
border pressure and agent-based mining calculations."
```

---

### Task 2: Clean up AGENT_ACTIONS — remove obsolete items

**Files:**
- Modify: `apps/game/src/components/AgentChat.tsx`

- [ ] **Step 1: Rewrite AGENT_ACTIONS for all 3 tiers**

Replace the entire `AGENT_ACTIONS` record (lines ~26-180) with:

```typescript
const AGENT_ACTIONS: Record<AgentTier, AgentAction[]> = {
  opus: [
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 0, estTime: '~5min', description: 'Claim a node with a new sub-agent', category: 'expansion' },
    { id: 'cpu-allocation', label: 'CPU Allocation', icon: '\u26A1', cpuCost: 0, estTime: '~5s', description: 'Set Mining and Securing CPU per block', category: 'blockchain' },
    { id: 'transact', label: 'Transact', icon: '\u21C4', cpuCost: 0, estTime: '~30s', description: 'Transfer AGNTC to another wallet', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u25A3', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'deep-scan', label: 'Deep Scan', icon: '\u25CE', cpuCost: 6, estTime: '~3min', description: 'Reveal agents in wide radius', category: 'intel' },
    { id: 'diplomatic-msg', label: 'Broadcast', icon: '\u25CE', cpuCost: 3, estTime: '~1min', description: 'Broadcast signal to nearby agents', category: 'social' },
  ],
  sonnet: [
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 0, estTime: '~3min', description: 'Claim a node with a Haiku sub-agent', category: 'expansion' },
    { id: 'cpu-allocation', label: 'CPU Allocation', icon: '\u26A1', cpuCost: 0, estTime: '~5s', description: 'Set Mining and Securing CPU per block', category: 'blockchain' },
    { id: 'transact', label: 'Transact', icon: '\u21C4', cpuCost: 0, estTime: '~30s', description: 'Transfer AGNTC to another wallet', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u25A3', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'scan-local', label: 'Scan Vicinity', icon: '\u25CE', cpuCost: 2, estTime: '~1min', description: 'Reveal nearby agents', category: 'intel' },
    { id: 'send-message', label: 'Send NCP', icon: '\u25A3', cpuCost: 1, estTime: '~30s', description: 'Transmit a neural communication packet', category: 'social' },
  ],
  haiku: [
    { id: 'cpu-allocation', label: 'CPU Allocation', icon: '\u26A1', cpuCost: 0, estTime: '~5s', description: 'Set Mining and Securing CPU per block', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u25A3', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'ping', label: 'Ping', icon: '\u25CE', cpuCost: 1, estTime: '~20s', description: 'Quick scan of surroundings', category: 'intel' },
    { id: 'send-message', label: 'Send NCP', icon: '\u25A3', cpuCost: 0, estTime: '~15s', description: 'Transmit a neural communication packet', category: 'social' },
  ],
};
```

Note: No `subChoices` on any action — the `cpu-allocation` action opens a custom menu level, not sub-choices.

- [ ] **Step 2: Remove obsolete entries from ACTION_RESPONSES**

Delete these keys from `ACTION_RESPONSES`:
- `'set-mining'`
- `'adjust-staked-cpu'`
- `'expand-border'`
- `'fortify'`
- `'empire-color'`
- `'secure'`
- `'write-data'`
- `'read-data'`

Keep: `'deploy'`, `'deep-scan'`, `'scan-local'`, `'ping'`, `'send-message'`, `'diplomatic-msg'`, `'chain-stats'`, `'transact'`, `'report-status'`

- [ ] **Step 3: Remove `economy` and `settings` from CATEGORY_DESIGN**

Delete the `economy` and `settings` entries. Keep: `expansion`, `blockchain`, `intel`, `social`.

- [ ] **Step 4: Clean up performAction handler**

Replace the entire `performAction` function with:

```typescript
const performAction = useCallback((_actionId: string, _choiceId?: string) => {
  // All actions now use direct API calls or custom menu flows
  // No local store toggles needed
}, []);
```

- [ ] **Step 5: Remove unused store selector imports**

Remove these from the component:
```typescript
const setBorderPressure = useGameStore((s) => s.setBorderPressure);
const setMiningRate = useGameStore((s) => s.setMiningRate);
const setEnergyLimit = useGameStore((s) => s.setEnergyLimit);
const setStakedCpu = useGameStore((s) => s.setStakedCpu);
```

- [ ] **Step 6: Update menuLevel type**

Replace:
```typescript
const [menuLevel, setMenuLevel] = useState<'top' | 'blockchain' | 'network-params' | 'settings' | 'secure-flow' | 'transact-flow' | null>(null);
```
with:
```typescript
const [menuLevel, setMenuLevel] = useState<'top' | 'blockchain' | 'cpu-allocation' | 'transact-flow' | null>(null);
```

Remove `secureConfig` state:
```typescript
const [secureConfig, setSecureConfig] = useState<{ cycles: number } | null>(null);
```

- [ ] **Step 7: Verify TypeScript compiles (may have errors from removed menu level references — those are fixed in Task 3)**

Run: `cd apps/game && npx tsc --noEmit`
Note: May show errors for removed menu level references in JSX — Task 3 fixes those.

- [ ] **Step 8: Commit**

```bash
git add src/components/AgentChat.tsx
git commit -m "feat(terminal): remove 8 obsolete menu items, clean AGENT_ACTIONS

Remove: secure subChoices, write-data, read-data, mining rate,
securing rate, extend reach, fortify, empire color. Keep: deploy,
cpu-allocation, transact, chain-stats, status, scan, NCP."
```

---

### Task 3: Replace secure-flow + network-params + settings with cpu-allocation UI

**Files:**
- Modify: `apps/game/src/components/AgentChat.tsx`

- [ ] **Step 1: Add CPU allocation state**

After the `transactAmount` state declaration, add:

```typescript
const [miningCpu, setMiningCpu] = useState(0);
const [securingCpu, setSecuringCpu] = useState(0);
```

Add store selectors:

```typescript
const cpuRegenPerTurn = useGameStore((s) => s.cpuRegenPerTurn);
const miningCpuPerBlock = useGameStore((s) => s.miningCpuPerBlock);
const securingCpuPerBlock = useGameStore((s) => s.securingCpuPerBlock);
```

Initialize the local state from store when cpu-allocation menu opens (handle in the blockchain sub-menu button click).

- [ ] **Step 2: Replace the blockchain sub-menu content**

Find the `{menuLevel === 'blockchain' && (` block. Replace its contents with:

```tsx
{menuLevel === 'blockchain' && (
  <>
    <div className="text-[11px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
      BLOCKCHAIN PROTOCOLS
    </div>

    {/* CPU Allocation */}
    <button
      onClick={() => { setMenuLevel('cpu-allocation'); setMiningCpu(miningCpuPerBlock); setSecuringCpu(securingCpuPerBlock); }}
      disabled={processing}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-yellow-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u26A1'}</span>
        <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
          CPU Allocation
        </span>
      </div>
      <span className="text-[11px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
        {'\u203A'}
      </span>
    </button>

    {/* Transact */}
    <button
      onClick={() => { setMenuLevel('transact-flow'); setTransactRecipient(''); setTransactAmount(''); }}
      disabled={processing}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-yellow-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u25C6'}</span>
        <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
          Transact
        </span>
      </div>
      <span className="text-[11px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
        {'\u203A'}
      </span>
    </button>

    {/* Chain Stats */}
    {(() => {
      const statsAction = actions.find(a => a.id === 'chain-stats');
      if (!statsAction) return null;
      return (
        <button
          onClick={() => { setMenuLevel(null); selectAction(statsAction); }}
          disabled={processing}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-accent-cyan opacity-50 group-hover:opacity-90 transition-opacity">{'\u25A3'}</span>
            <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
              Chain Stats
            </span>
          </div>
        </button>
      );
    })()}

    <button onClick={() => setMenuLevel(null)} className="w-full px-3 py-2 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
      {'\u2190'} back
    </button>
  </>
)}
```

- [ ] **Step 3: Add CPU allocation menu level**

Delete the entire `{menuLevel === 'secure-flow' && secureConfig === null && (` block.
Delete the entire `{menuLevel === 'secure-flow' && secureConfig !== null && (` block.
Delete the entire `{menuLevel === 'network-params' && (` block.
Delete the entire `{menuLevel === 'settings' && (` block.

Insert the cpu-allocation menu level in their place:

```tsx
{/* ── CPU Allocation: Mining + Securing ── */}
{menuLevel === 'cpu-allocation' && (
  <>
    <div className="text-[11px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
      CPU ALLOCATION — PER BLOCK
    </div>

    {/* Mining Operations */}
    <div className="px-3 py-2">
      <div className="text-[12px] text-yellow-400 font-semibold mb-2" style={{ fontFamily: "'Fira Code', monospace" }}>
        Mining Operations
      </div>
      <div className="text-[11px] text-text-muted/50 mb-2">CPU per block → earns AGNTC from block subsidy</div>
      <div className="flex gap-1.5 flex-wrap">
        {[0, 50, 100, 200, 500].map(val => (
          <button
            key={`mine-${val}`}
            onClick={() => setMiningCpu(val)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-mono transition-all ${
              miningCpu === val
                ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/40'
                : 'bg-white/[0.03] text-text-muted border border-card-border hover:text-text-primary'
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    </div>

    <div className="h-px bg-card-border/30 mx-3" />

    {/* Securing Operations */}
    <div className="px-3 py-2">
      <div className="text-[12px] text-emerald-400 font-semibold mb-2" style={{ fontFamily: "'Fira Code', monospace" }}>
        Securing Operations
      </div>
      <div className="text-[11px] text-text-muted/50 mb-2">CPU per block → earns AGNTC from fee pool</div>
      <div className="flex gap-1.5 flex-wrap">
        {[0, 50, 100, 200, 500].map(val => (
          <button
            key={`sec-${val}`}
            onClick={() => setSecuringCpu(val)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-mono transition-all ${
              securingCpu === val
                ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/40'
                : 'bg-white/[0.03] text-text-muted border border-card-border hover:text-text-primary'
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    </div>

    <div className="h-px bg-card-border/30 mx-3" />

    {/* Summary */}
    <div className="px-3 py-2 space-y-1">
      <div className="flex justify-between text-[12px] font-mono">
        <span className="text-text-muted">Total committed</span>
        <span className="text-text-primary">{miningCpu + securingCpu} CPU/block</span>
      </div>
      <div className="flex justify-between text-[12px] font-mono">
        <span className="text-text-muted">CPU regen</span>
        <span className="text-green-400">+{cpuRegenPerTurn}/turn</span>
      </div>
      {miningCpu + securingCpu > cpuRegenPerTurn && (
        <div className="flex justify-between text-[12px] font-mono">
          <span className="text-text-muted">Depleted in</span>
          <span className="text-red-400">~{Math.ceil(energy / (miningCpu + securingCpu - cpuRegenPerTurn))} turns</span>
        </div>
      )}
      {miningCpu + securingCpu > 0 && miningCpu + securingCpu <= cpuRegenPerTurn && (
        <div className="text-[11px] text-green-400/70">Sustainable — regen covers commitment</div>
      )}
    </div>

    <div className="flex gap-2 px-3 pt-1 pb-2">
      <button onClick={() => setMenuLevel('blockchain')} className="px-3 py-1.5 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
        {'\u2190'} back
      </button>
      <button
        onClick={() => {
          useGameStore.getState().setCpuAllocation(miningCpu, securingCpu);
          addMsg('agent', `CPU allocation updated.\nMining: ${miningCpu} CPU/block\nSecuring: ${securingCpu} CPU/block\nTotal: ${miningCpu + securingCpu}/block (regen: +${cpuRegenPerTurn}/turn)`);
          setMenuLevel(null);
        }}
        disabled={processing}
        className="flex-1 px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 hover:border-accent-cyan/40 disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        Apply
      </button>
    </div>
  </>
)}
```

- [ ] **Step 4: Handle cpu-allocation in selectAction**

In `selectAction`, add a handler for `cpu-allocation` that opens the blockchain sub-menu then the allocation panel:

```typescript
if (action.id === 'cpu-allocation') {
  setMenuLevel('cpu-allocation');
  setMiningCpu(miningCpuPerBlock);
  setSecuringCpu(securingCpuPerBlock);
  return;
}
```

- [ ] **Step 5: Remove the top-level menu buttons for network-params and settings**

In the `{menuLevel === null && !deployStep && !msgStep && (` block (the top-level menu), find and remove:
- The "Network Parameters" category button (the one that sets `menuLevel('network-params')`)
- The "Settings" category button (the one that sets `menuLevel('settings')`)

These categories no longer exist. Only `blockchain`, `expansion`, `intel`, and `social` remain.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd apps/game && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/components/AgentChat.tsx
git commit -m "feat(terminal): add CPU allocation UI, remove dead menu sections

Replace secure-flow with cpu-allocation (Mining/Securing presets).
Delete network-params and settings sub-menus entirely.
Show total committed, regen rate, and depletion estimate."
```

---

### Task 4: Increase text sizes globally in AgentChat

**Files:**
- Modify: `apps/game/src/components/AgentChat.tsx`

- [ ] **Step 1: Bulk text size increases**

Use find-and-replace across the file for these patterns:

| Find | Replace | Context |
|------|---------|---------|
| `text-[9px]` in category headers | `text-[11px]` | `tracking-[0.15em]` sections |
| `text-[10px]` in button icons | `text-[12px]` | icon spans |
| `text-[11px]` in button labels | `text-[13px]` | menu item text |
| `text-[9px]` in cost/time labels | `text-[11px]` | cpu cost spans |
| `text-[10px]` in back buttons | `text-[12px]` | `← back` buttons |
| `text-[11px]` in chat messages | `text-[13px]` | message content |
| `text-[10px]` in system messages | `text-[12px]` | system role messages |

**Important:** Do NOT blindly replace all instances — some `text-[9px]` are in non-terminal contexts (like `DebugOverlay`). Only change sizes within AgentChat.tsx.

- [ ] **Step 2: Verify visually that text is readable**

Run the dev server and open the terminal. Text should be noticeably larger.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgentChat.tsx
git commit -m "style(terminal): increase text sizes for readability

Menu labels 11→13px, icons 10→12px, headers 9→11px,
chat messages 11→13px, system messages 10→12px."
```

---

### Task 5: Update tests and verify

**Files:**
- Modify: `apps/game/src/__tests__/gameStore.test.ts`

- [ ] **Step 1: Add test for CPU regen in tick()**

Add to gameStore.test.ts:

```typescript
describe("gameStore — CPU regen and allocation", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({ currentUserId: "user-001", energy: 1000, cpuRegenPerTurn: 100 });
  });

  it("tick adds cpuRegenPerTurn to energy", () => {
    useGameStore.getState().tick();
    expect(useGameStore.getState().energy).toBe(1100); // 1000 + 100 regen
  });

  it("tick deducts mining + securing commitments from energy", () => {
    useGameStore.getState().setCpuAllocation(50, 30);
    useGameStore.getState().tick();
    // 1000 + 100 regen - 50 mining - 30 securing = 1020
    expect(useGameStore.getState().energy).toBe(1020);
  });

  it("energy does not go below 0", () => {
    useGameStore.setState({ energy: 10, cpuRegenPerTurn: 0 });
    useGameStore.getState().setCpuAllocation(500, 500);
    useGameStore.getState().tick();
    expect(useGameStore.getState().energy).toBe(0);
  });

  it("setCpuAllocation updates both fields", () => {
    useGameStore.getState().setCpuAllocation(200, 100);
    const s = useGameStore.getState();
    expect(s.miningCpuPerBlock).toBe(200);
    expect(s.securingCpuPerBlock).toBe(100);
  });
});
```

- [ ] **Step 2: Run full test suite**

Run: `cd apps/game && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Run build**

Run: `cd apps/game && npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/gameStore.test.ts
git commit -m "test: add CPU regen and allocation tests"
```
