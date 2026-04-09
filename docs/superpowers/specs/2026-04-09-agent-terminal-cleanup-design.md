# Agent Terminal Cleanup — Design Spec

> **Date:** 2026-04-09
> **Status:** Approved
> **Scope:** Replace one-shot Secure/Mining with ongoing CPU allocation slider. Remove obsolete menu items. Increase text sizes.

---

## Core Economic Model

Mining and Securing are **independent ongoing CPU commitments per block**. The player sets each one separately from preset choices:

- **Mining:** CPU/block → new AGNTC from block subsidy (diminishes with hardness)
- **Securing:** CPU/block → AGNTC from transaction fee pool (grows with usage)
- **Both deduct from total CPU Energy pool** — player can overdraw (shown as "blocks until depleted")
- **Early game:** Mining yields more (high subsidy, low fees)
- **Late game:** Securing yields more (subsidy exhausted, fees accumulate)

This replaces the old one-shot `POST /api/secure` flow and the local-only Mining Rate/Securing Rate toggles.

### CPU Regeneration (passive income)

Players gain CPU Energy passively each turn to sustain ongoing operations:

| Faction | Regen/turn | Starting CPU | Max sustainable commit/block |
|---------|-----------|-------------|----------------------------|
| Community | +100 | 1,000 | 100 |
| Professional | +200 | 5,000 | 200 |
| Founders | +200 | 5,000 | 200 |
| Machines | +200 | 5,000 | 200 |

- No hard cap — players can commit more than regen (burns reserves, strategic choice)
- When CPU reaches 0, ongoing operations stop until regen refills
- The CPU allocation UI shows "blocks until depleted" when commitment exceeds regen
- Regen applies every turn tick (10s interval in the store's turn timer)

---

## Final Menu Structure

### Opus
```
DEPLOY
  Deploy Agent — claim a node with sub-agent

BLOCKCHAIN PROTOCOLS (sub-menu)
  CPU Allocation → Mining + Securing per-block commitments
  Transact — AGNTC wallet-to-wallet transfer
  Chain Stats — live blockchain statistics

INTEL
  Status Report — agent state summary
  Deep Scan — reveal agents in wide radius

SOCIAL
  Broadcast — signal to all nearby agents
```

### Sonnet
```
BLOCKCHAIN PROTOCOLS
  CPU Allocation
  Transact
  Chain Stats

DEPLOY
  Deploy Agent (Haiku sub-agents only)

INTEL
  Status Report
  Scan Vicinity

SOCIAL
  Send NCP
```

### Haiku
```
BLOCKCHAIN PROTOCOLS
  CPU Allocation
  Chain Stats

INTEL
  Status Report
  Ping

SOCIAL
  Send NCP
```

---

## CPU Allocation UI (replaces Secure + Mining Rate)

New `menuLevel: 'cpu-allocation'` in AgentChat.

Renders two independent preset selectors with estimated yields:

```
CPU ALLOCATION — PER BLOCK

  Mining Operations
  CPU per block: [0] [50] [100] [200] [500]
  Est. reward: ~0.004 AGNTC/block

  Securing Operations
  CPU per block: [0] [50] [100] [200] [500]
  Est. reward: ~0.001 AGNTC/block

  Total CPU committed: 150/block
  Available CPU Energy: 1,000
  Blocks until depleted: ~6

  [Apply]  [← back]
```

- Preset choices: `[0, 50, 100, 200, 500]` CPU per block for each
- Default: Mining 0, Securing 0 (player must actively choose to commit CPU)
- Total committed = mining + securing per block
- Depletion = available CPU / total committed (shows how many blocks before CPU runs out)
- Estimated rewards fetched from chain or computed locally using density + hardness
- On Apply: update store state (`miningCpuPerBlock`, `securingCpuPerBlock`) — chain sync picks up

For Phase 3 (testnet demo), this updates local store state. Chain integration for ongoing allocation is Phase 4.

---

## Items to Remove

### From AGENT_ACTIONS (all 3 tiers)
- `secure` (with all subChoices) — replaced by CPU Allocation
- `write-data` — NCP / Broadcast covers this
- `read-data` — Chain Stats covers this
- `adjust-staked-cpu` — replaced by CPU Allocation
- `set-mining` — replaced by CPU Allocation
- `expand-border` — borders removed
- `fortify` — borders removed
- `empire-color` — borders removed

### From performAction handler
- `set-mining` case
- `adjust-staked-cpu` case
- `expand-border` / `fortify` case
- `empire-color` case

### From ACTION_RESPONSES
- `set-mining`, `adjust-staked-cpu`, `expand-border`, `fortify`, `empire-color`, `secure`, `write-data`, `read-data`

### From CATEGORY_DESIGN
- `economy` category
- `settings` category

### Menu levels to remove
- `secure-flow` — replaced by `cpu-allocation`
- `network-params` — all items removed
- `settings` — all items removed

### Unused store references in AgentChat
- `setBorderPressure` — no longer called
- `setMiningRate` — no longer called
- `setEnergyLimit` — no longer called
- `setStakedCpu` — no longer called

---

## Text Size Increases

| Element | Old | New |
|---------|-----|-----|
| Menu item labels | `text-[11px]` | `text-[13px]` |
| Menu item descriptions | `text-[9px]` | `text-[11px]` |
| Category headers | `text-[9px]` | `text-[11px]` |
| Chat messages (agent/user) | `text-[11px]` | `text-[13px]` |
| Sub-choice labels | `text-[11px]` | `text-[13px]` |
| System messages | `text-[10px]` | `text-[12px]` |
| Confirm panel text | `text-[11px]` | `text-[13px]` |
| Header agent name | `text-[11px]` | `text-[13px]` |

---

## Files to Change

- `apps/game/src/components/AgentChat.tsx` — all menu changes, new CPU allocation UI, text sizes
- `apps/game/src/store/gameStore.ts` — add `miningCpuPerBlock`, `securingCpuPerBlock`, `cpuRegenPerTurn` state fields + setter action. Update `tick()` to apply CPU regen and deduct ongoing commitments.
- `apps/game/src/types/subscription.ts` — add `cpuRegen` field to `SubscriptionPlan`

---

## Verification

1. Only Deploy, CPU Allocation, Transact, Chain Stats, Status Report, Scan, NCP remain
2. No border/color/mining-rate/securing-rate options visible
3. CPU Allocation slider renders and updates
4. Text is noticeably larger and more readable
5. All existing tests pass (or updated for removed items)
