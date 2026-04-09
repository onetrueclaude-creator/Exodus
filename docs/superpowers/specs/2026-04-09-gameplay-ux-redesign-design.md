# Gameplay UX Redesign — Design Spec

> **Date:** 2026-04-09
> **Status:** Approved
> **Scope:** Simplify game layout. Move dock to left. Remove obstructing panels. All actions via terminal only. Cell click = info tooltip only.

---

## Context

First local playtest revealed multiple UX problems: the right dock panel overlaps with node info popups, clicking grid cells triggers mining actions, "My Agents" dropdown obstructs the grid, and too many panels compete for screen space. The fix is to simplify radically.

---

## Layout: Three Zones

```
┌─────────────────────────────────────────────────┐
│  ResourceBar (top strip, always visible)         │
├──┬──────────────────────────────────────────────┤
│D │                                               │
│O │         Neural Lattice Grid                   │
│C │         (full remaining space)                │
│K │                                               │
│  │    [floating tooltip near clicked cell]        │
│R │                                               │
│A │                                               │
│I │                                               │
│L │                                               │
├──┤                                               │
│  │  TabNav: Network | Account                    │
└──┴──────────────────────────────────────────────┘
     ^-- When dock item clicked, a panel slides
         out from the left rail (width: 320px)
```

### Zone 1: Dock Rail (left edge, 40px wide)
- Vertical strip of icon buttons
- Items: Terminal, Chat, Stats, TimeRewind (remove Secured Nodes and Deploy — both accessible from Terminal)
- Clicking an icon toggles a 320px panel sliding out from the rail
- Esc or clicking the same icon closes the panel
- Only one panel open at a time

### Zone 2: Grid (remaining space)
- Full-width PixiJS canvas
- ResourceBar overlaid at the top
- TabNavigation overlaid at the bottom (or top, below ResourceBar)
- Zoom controls overlaid at bottom-center
- No permanent sidebars

### Zone 3: Floating Tooltip (ephemeral)
- Appears near the clicked cell (offset so it doesn't cover the cell)
- Shows: faction name, coordinates, density, owner (or "unclaimed")
- Dismissed by clicking elsewhere, Esc, or clicking another cell
- **No action buttons** — purely informational
- Small, minimal, non-obstructive (max 150px wide)

---

## What to Remove

| Component | File | Why |
|-----------|------|-----|
| QuickActionMenu | `src/components/QuickActionMenu.tsx` | Actions should only be in terminal. This adds click-to-mine. |
| AgentPanel | `src/components/AgentPanel.tsx` | Left sidebar detail panel — replaced by floating tooltip |
| AgentDropdown | `src/components/AgentDropdown.tsx` | "My Agents" dropdown — obstructs grid, not useful yet |
| AgentProfilePopup | `src/components/AgentProfilePopup.tsx` | Right-side popup — replaced by floating tooltip |
| Secured Nodes dock item | In DockPanel.tsx | Empty state "No secured nodes yet" — remove from dock, accessible from Account tab |
| Deploy dock item | In DockPanel.tsx | Deploy is accessible from Terminal menu — no need for separate dock item |

## What to Keep

| Component | Change |
|-----------|--------|
| ResourceBar | No change — stays at top |
| TabNavigation | No change — Network + Account |
| DockPanel | Move from right to left. Reduce dock items to: Terminal, Chat, Stats, TimeRewind |
| AgentChat (terminal) | No change — this is THE interaction point |
| NetworkChatRoom | No change — accessible from dock |
| TimechainStats | No change — accessible from dock |
| AccountView | No change — accessible from Account tab |
| LatticeGrid | Remove left sidebar rendering, remove AgentDropdown, remove QuickActionMenu. Add floating tooltip on cell click. |

---

## Interaction Model

### Clicking a Grid Cell
1. Small tooltip appears near the cell
2. Shows: faction, `(cx, cy)`, density %, owner or "unclaimed"
3. No action buttons
4. Click elsewhere to dismiss

### All Player Actions
Every action happens through the **Agent Terminal** (dock panel → Terminal):
- **Mine Block**: Terminal menu → Blockchain Protocols → Mine (calls POST /api/mine)
- **Secure**: Terminal menu → Blockchain Protocols → Secure
- **Transact**: Terminal menu → Blockchain Protocols → Transact
- **Deploy Agent**: Terminal menu → Deploy Agent
- **Teleport**: Terminal menu → Teleport Homenode (future)
- **Stats**: Terminal menu → Chain Stats

### Grid Click Does NOT:
- Open a sidebar
- Show action buttons
- Trigger mining
- Deploy agents
- Open any panel

---

## DockPanel Changes

### Move from right to left

Current:
```
dock rail: absolute right-0, w-10
panel: absolute right-12, w-80
```

New:
```
dock rail: absolute left-0, w-10
panel: absolute left-12, w-80
```

### Reduce dock items

Remove:
- `nodes` (Secured Nodes) — available in Account tab
- `deploy` (Deploy Agent) — available in Terminal menu

Keep:
- `terminal` — Agent Terminal (primary interaction)
- `chat` — Network Chat
- `stats` — Chain Stats (TimechainStats)
- `timeRewind` — Time Rewind

---

## Floating Tooltip Component

New component: `CellTooltip.tsx`

```typescript
interface CellTooltipProps {
  cx: number;
  cy: number;
  faction: FactionId;
  density: number;
  owner: string | null;  // username or null
  screenX: number;       // pixel position for tooltip placement
  screenY: number;
  onClose: () => void;
}
```

- Renders as a small `position: absolute` div near the clicked cell
- Dark glass background, faction-colored border
- Auto-positions to avoid going off-screen (prefer right+below, fallback left+above)
- Max width 150px

---

## Files to Change

| File | Action |
|------|--------|
| `src/components/DockPanel.tsx` | Move to left side, remove nodes+deploy items |
| `src/components/LatticeGrid.tsx` | Remove sidebar rendering, add tooltip state |
| `src/app/game/page.tsx` | Remove QuickActionMenu, AgentPanel, AgentDropdown, AgentProfilePopup imports and rendering. Add CellTooltip. |
| `src/components/CellTooltip.tsx` | **NEW** — floating info tooltip |
| `src/components/QuickActionMenu.tsx` | **DELETE** |
| `src/components/AgentPanel.tsx` | **DELETE** |
| `src/components/AgentDropdown.tsx` | **DELETE** |
| `src/components/AgentProfilePopup.tsx` | **DELETE** |

---

## Verification

1. Dock rail on the left, panels slide right
2. Clicking a cell shows ONLY a tooltip (no sidebar, no actions)
3. No "My Agents" dropdown visible
4. No QuickActionMenu visible
5. Terminal opens from dock and contains all player actions
6. Grid takes full remaining width
7. No overlapping panels
