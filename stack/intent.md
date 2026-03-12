# Layer 3: Intent Engineering

**Question:** *What to want while doing*

> **Intent engineering is the discipline of making what humans know (goals, values, tradeoffs, decision boundaries) explicit, structured, and machine-actionable.**

This is the emerging layer of focus in AI-Human engineering circles. It governs the goals, priorities, and tradeoffs that guide the AI's decisions when the prompt alone doesn't determine the answer.

## Properties

- **Organization-scoped.** Its effects extend across all agents and all interactions within a domain.
- **Normative.** It defines what *should* happen; the linguistic mode is values, priorities, boundaries, hierarchies.
- **Translational.** Its core practice is converting human-readable organizational knowledge into agent-actionable specifications, bridging strategists and engineers.
- **Persistent but evolving.** Intent specifications must be maintained as living documents. Organizations change, markets shift.

## Core Concerns

- **Goals** — what the work is ultimately trying to achieve, beyond the immediate deliverable
- **Priorities** — when two good options conflict, which one wins
- **Tradeoffs** — what you're willing to sacrifice and what you're not
- **Definition of success** — not just "does it work" but "does it work in the way that matters"
- **Alignment with broader objectives** — how this task serves the larger project, user, or system

## Structure of Intent Specifications

- **Goal hierarchies** — the ranked ordering of objectives when they conflict
- **Decision boundaries** — what the agent can decide autonomously, what requires human approval, what must never be decided by an agent
- **Value decomposition** — high-level values decomposed into observable, actionable behaviors (e.g. "customer obsession" → specific agent-actionable rules)
- **Escalation logic** — conditions under which an agent should stop operating autonomously, not because the task is technically difficult, but because the decision exceeds its authority

## The Deeper Structure

Intent engineering is the practice of making tacit knowledge explicit (Nonaka, 1995). For most of organizational history, tacit-to-explicit conversion was optional because human employees acquire it through social learning. AI agents cannot acquire knowledge through social learning — they need it in structured, machine-actionable form.

This forces organizations to become more self-aware: encoding "what we actually value" reveals that many organizations do not know what they actually value, or that different parts hold incompatible values never reconciled.

## Boundary

Intent engineering is about *what matters and why*. It resolves ambiguity between valid options. A prompt says "refactor this function." Intent says "we value readability over cleverness, and this codebase is maintained by junior developers."

## Failure Mode

**Misaligned optimization** — the "Klarna Pattern." The system performs its specified task extremely well while simultaneously undermining the organization's actual goals. Metrics improve. Dashboards are green. And somewhere outside the measurement frame, value is being destroyed.

This failure is invisible to Layers 1 and 2, because the prompts are working and the context is complete. The system is doing exactly what it was told, with exactly the right information. Nobody told it *what matters*.

A second characteristic failure is **decision paralysis at scale**: when an agent encounters a tradeoff with no encoded resolution, it either makes an arbitrary choice, escalates everything (defeating autonomy), or silently optimizes for whichever objective is more computationally tractable.

## Evaluation Surface

*Did the AI optimize for the right things? Did it make the tradeoffs you intended?*

## Current Configuration

### Goals
1. Build a Stellaris-inspired gamified social media dApp on the Agentic Chain
2. Blockchain is source of truth for game state; PostgreSQL is auth cache only
3. Ship a playable testnet experience — real economics, real consensus, real agent interactions
4. Machines Faction operates as autonomous protocol treasury — never sells, no voting power, permanent accumulator
5. Token economics self-balance via BME + fee burn + hardness curve — minimal governance intervention needed

### Priority Hierarchy (when goals conflict)
1. **Whitepaper alignment** — protocol mechanics must match the spec
2. **Correctness** — game state integrity over UX polish
3. **Security** — no OWASP top 10 vulnerabilities, safe wallet handling
4. **Simplicity** — minimum complexity for current task; no premature abstraction
5. **User experience** — dark crypto aesthetic, responsive, Stellaris feel

### Tradeoffs (accepted)
- DB is a cache, not source of truth — accept eventual consistency with chain
- Two-tier users (Hollow DB vs On-chain) — accept complexity for onboarding ease
- Static HTML website (`zkagentic-deploy/`) — accept no build system for deployment simplicity
- BME tokenomics with inflation ceiling — accept complexity for self-balancing economics
- Machines Faction never sells — accept permanent supply lock for market stability
- City real estate model (inner expensive, outer cheap) — accept early-adopter advantage for natural economic gravity

### Decision Boundaries
- **Agent decides:** Code implementation, test structure, file organization, refactoring scope
- **Human decides:** Feature prioritization, subscription pricing, tokenomics parameters, blockchain architecture, deployment targets
- **Human decides (governance):** Inflation ceiling rate, emergency Machines treasury unlock, claim cost base parameters
- **Never auto-decide:** Git push, PR creation, destructive operations, external API calls

### Escalation Logic
- Unclear requirements → ask before implementing
- Multiple valid architectural approaches → present options with tradeoffs
- Changes affecting shared state (push, deploy, DB migration) → always confirm

## Notes

- The 4-faction model (Community NW, Machines NE, Founders SE, Professional SW) is a core design decision that permeates UI, tokenomics, and galaxy grid
- Subscription tiers (Community/Pro/Max) map directly to agent capabilities — this is a monetization-gameplay coupling that must stay aligned
