# Layer 5: Coherence Engineering

**Question:** *What to become while doing*

> **Coherence engineering is the discipline of ensuring that a multi-agent ecosystem produces emergent behavior consistent with the overarching purpose of the system, even when individual agents are operating correctly within their own scope.**

It governs the AI's consistency of identity, behavior, and principle across time and across tasks. This is the most abstract layer and the one most often neglected.

## Properties

- **Ecosystem-scoped.** Its object is the network of relationships between agents, not any individual agent.
- **Emergent-focused.** It monitors and shapes system-level properties that arise from agent interactions.
- **Governance-oriented.** It requires mechanisms analogous to organizational governance: shared protocols, coordination structures, conflict resolution processes, and system-level monitoring.
- **Fundamentally plural.** Unlike the previous four layers (which can be practiced for a single agent in isolation), coherence engineering exists only in the context of multiple interacting agents.

## Core Concerns

- **Behavioral consistency** — same situations produce same reasoning patterns
- **Identity stability** — the AI maintains a recognizable "character" in how it works, communicates, and makes decisions
- **Principle persistence** — stated values and guidelines carry across sessions and tasks, not just within a single interaction
- **Architectural philosophy** — a consistent approach to design decisions, code structure, communication style, and problem-solving methodology
- **Cumulative learning** — how interactions build on each other rather than starting from zero each time
- **Brand and voice** — in user-facing applications, the AI's tone and personality remain stable

## Practical Mechanisms

- **Inter-agent alignment verification** — do the intent specifications of different agents create contradictions when they interact?
- **Emergent behavior monitoring** — what patterns arise from the collective action of many agents? Requires metrics at the *system* level, not the agent level
- **Coordination protocols** — how agents communicate about shared resources, competing priorities, and overlapping domains
- **Ecosystem-level intent** — specifications above individual agents, providing constraints that govern how agents interact with each other — the "constitution" of the multi-agent system

## The Deeper Structure

Coherence engineering draws from three intellectual traditions:

1. **Systems theory** (Donella Meadows) — the behavior of a complex system cannot be fully predicted from its components. Small changes in system structure (feedback loops, information flows, rules) can produce large changes in emergent behavior.
2. **Organizational theory** (Edgar Schein) — organizational culture is an emergent property from repeated interactions and collective sense-making. When many AI agents interact over time, they develop something analogous to culture.
3. **Governance theory** — autonomy and coordination must be balanced through structural mechanisms, like constitutional governance establishing a framework within which autonomous actors make decisions.

**Persona as coherence:** What is sometimes called "persona engineering" or "role engineering" is a coherence concern. Persona is the surface; coherence is the structure beneath it.

## The Fractal Property

The stack is fractal (identified by Nate Jones). The same five-layer structure applies at every scale:
- **Individual level:** personal AI tools working together
- **Team level:** shared AI tools serving team objectives
- **Organizational level:** enterprise AI governance ensuring hundreds of deployments produce coherent outcomes

## Boundary

Coherence is about *who the AI is across time*. It is the only layer that is inherently longitudinal — it cannot be evaluated within a single interaction. An AI can demonstrate perfect prompt-following, context-use, intent-alignment, and judgment within one conversation and still fail at coherence if it behaves differently in the next conversation under the same conditions.

## Failure Mode

**Emergent misalignment.** The system as a whole drifts in a direction that no individual agent chose and no individual agent can detect. Auditing any single agent shows correct behavior. The problem exists only at the system level.

Common manifestations:
- **Architectural drift** — the codebase evolves in an unplanned direction through many small agent-generated changes
- **Resource conflicts** — multiple agents compete for the same resources without coordination
- **Contradictory actions** — one agent's optimization undermines another's
- **Value fragmentation** — different agents embody subtly different interpretations of the same values

## Evaluation Surface

*Is the AI's behavior consistent with its behavior on similar tasks? Is its identity stable?*

## Current Configuration

### Behavioral Consistency
- **Stellaris metaphor** is the governing design language — galaxy, empire, star system, jump points, CPU Energy, etc.
- **Dark crypto aesthetic** with cyan/purple accents — every UI component must follow this
- **Subscription tier theming:** Community = yellowish-orange, Professional = cyan blue, Max = purple
- **Code patterns:** DockPanel for sidebars, Zustand for state, ChainService interface for blockchain access

### Identity Stability
- The project presents as a serious blockchain protocol with game mechanics — not a toy or demo
- Whitepaper is academic in tone; UI is Stellaris-cinematic; code is pragmatic TypeScript
- Agent personas (Opus/Sonnet/Haiku) map to real Claude model tiers — maintain this correspondence

### Coordination Protocols
- **Subagent types** have defined scopes: Explore (read-only research), Plan (architecture), code-reviewer (quality), feature-dev agents (implementation)
- **Dispatch state** (`.claude/dispatch-state.json`) coordinates multi-session feature work
- **Git worktrees** isolate concurrent feature development

### Ecosystem Governance
- **CLAUDE.md** is the constitution — all agents read it, all must follow it
- **seed.md files** provide local governance per directory — purpose, architecture, navigation
- **Memory system** provides cross-session continuity for verified facts
- **Change Log** in CLAUDE.md tracks architectural decisions chronologically

### Cumulative Learning
- Auto-memory captures verified patterns (faction placements, protocol params)
- Compaction pipeline preserves conversation history across context limits
- Change Log entries accumulate project evolution

## Notes

- The fractal property applies here: the same stack structure could govern individual agent sessions, team workflows, and the overall project
- Architectural drift risk: many small changes to the galaxy grid, game economics, and UI have accumulated — the Change Log helps but periodic coherence audits would help more
- 2026-03-12: Website (`zkagentic-deploy/`) aligned to whitepaper v1.2 — tokenomics v3 (BME, city model, governance), 2-tier staking (Community/Professional, Max removed), 5-phase roadmap, dual staking formula, updated slashing
- 2026-03-12: Two-website separation enforced — zkagentic.com (marketing, GitHub Pages) and zkagentic.ai (testnet monitor, Cloudflare Pages) are independent repos with independent deploy pipelines. Mobile hamburger menu + pointer-events fix applied to all 6 HTML pages. Waitlist switched from OAuth to email form for simplicity and mobile compatibility.
- 2026-03-28: Monitor (zkagentic.ai) and game terminal (zkagenticnetwork.com) now share the same public API (`api.zkagentic.ai`) and Supabase backend. Subgrid simulator tab on monitor uses same Realtime subscription pattern as dashboard. Three-surface architecture solidified: marketing site (.com), monitor (.ai), game (network.com), all backed by one API + one Supabase project.
