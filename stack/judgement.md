# Layer 4: Judgment Engineering

**Question:** *What to doubt while doing*

> **Judgment engineering is the discipline of designing systems that can recognize when their own operating assumptions, including their intent specifications, have become insufficient, and can either adapt, escalate, or gracefully degrade rather than optimizing confidently in the wrong direction.**

This layer governs how the AI handles uncertainty, risk, edge cases, and the boundaries of its own competence. It requires engineering *restraint* rather than capability — telling the AI when to stop, when to ask, and when to surface its uncertainty.

## Properties

- **Reflexive.** Its object is the system itself — its own assumptions, models, and operating parameters.
- **Epistemic.** It operates on the system's relationship to its own knowledge: what it knows, what it does not know, and what it does not know that it does not know.
- **Dynamic.** Where intent specifications are persistent (updated periodically), judgment operates *continuously* — monitoring, evaluating, and responding in real time.
- **Conservative by default.** When in doubt, reduce autonomy. When assumptions are uncertain, escalate. When metrics and reality diverge, flag the divergence rather than optimizing the metrics.

## Core Concerns

- **Uncertainty protocols** — what the AI should do when it's not sure (ask, flag, choose conservatively, explain its reasoning)
- **Risk awareness** — which types of errors are catastrophic vs. tolerable
- **Edge case handling** — how to behave when the input or situation doesn't match the expected pattern
- **Scope boundaries** — what the AI should refuse to do, even if asked, because it falls outside its competence
- **Confidence calibration** — whether the AI communicates its certainty level honestly
- **Escalation paths** — when to stop and involve a human vs. when to proceed autonomously

## Capabilities

- **Epistemic humility infrastructure** — explicit models of confidence and competence boundaries. Not "how confident is the model in this output" (Layer 1) but "am I operating in a domain where my training and intent specification are reliable guides?"
- **Assumption monitoring** — continuous verification that the environmental conditions assumed by the intent specification still hold
- **Graceful degradation** — when operating outside reliable parameters, reduce autonomy rather than continue with full confidence (narrow scope, increase human review, revert to conservative strategies)
- **Counter-Goodhart mechanisms** — active monitoring for divergence between metrics and the values those metrics represent

## The Deeper Structure

Judgment is what organizations pay for when they hire senior employees. The Dreyfus model describes five stages: novice (follows rules), advanced beginner (recognizes situational elements), competent (sets priorities), proficient (sees the whole situation intuitively), expert (transcends rules). Judgment engineering gives AI access to something analogous to the proficient/expert stages — not by making them "wise," but by giving them structural capacity to recognize when they are operating at an insufficient level of understanding.

**Safety as judgment:** Preventing harmful outputs, avoiding hallucination, maintaining truthfulness — these are judgment concerns, not a separate layer. The categorical question is the same: *when should the AI doubt itself?*

## Boundary

Judgment is about *how to handle what you don't know or aren't sure about*. An AI can have perfect context and clear intent and still make a catastrophic decision if it has no judgment about when its reasoning might be wrong. It is the metacognitive layer.

## Failure Mode

**Confident wrongness at scale.** The system continues to operate with high confidence and efficiency even as its outputs become progressively less aligned with actual needs. It hits every metric. It violates no explicit boundary. And it is steadily drifting into territory where its technically correct actions produce strategically harmful outcomes.

The distinctive marker: the intent specification *was correct when written*. The problem is that what the system should want has changed, and the system cannot detect the change.

A second failure is **brittleness in novel situations**: the system encounters scenarios the specification authors did not anticipate and either applies the nearest existing rule (wildly inappropriate) or freezes entirely.

## Evaluation Surface

*Did the AI handle uncertainty well? Did it flag what it should have? Did it proceed when it should have paused?*

## Current Configuration

### Uncertainty Protocols
- **Whitepaper conflicts:** If implementation diverges from `vault/whitepaper.md`, flag immediately — never silently override protocol specs
- **Unfamiliar code paths:** Read before modifying; understand existing patterns before suggesting changes
- **Test failures:** Diagnose root cause, don't brute-force retry; use systematic-debugging skill
- **Ambiguous requests:** Ask for clarification rather than guessing at user intent

### Risk Categories
- **Catastrophic:** Wallet key exposure, lost blockchain state, corrupted DB migrations, force-push to main
- **High:** Breaking game economics (wrong fee burn %, wrong staking ratios, claim cost miscalculation, Machines sell policy override), UI showing incorrect chain data
- **Medium:** Test regressions, CSS/layout breaks, stale context after compaction
- **Low:** Code style inconsistencies, unused imports, minor refactoring opportunities

### Scope Boundaries (what to refuse or escalate)
- Never generate or guess URLs unless clearly programming-related
- Never commit without explicit user request
- Never skip pre-commit hooks (`--no-verify`)
- Never auto-push or auto-deploy
- Canvas/WebGL code cannot be unit-tested in jsdom — mock PixiJS, don't fight it
- `@solana/wallet-adapter-react` must be mocked in any test rendering ResourceBar

### Confidence Calibration
- Protocol parameters v3: fee burn 50%, staking alpha 40%/beta 60%, hardness 16×ring (uncapped), BASE_CLAIM_COST=10, ANNUAL_INFLATION_CEILING=5%, Machines NEVER sell — all verified in v3 design doc (`docs/plans/2026-03-12-tokenomics-v3-design.md`)
- Claim cost formula: BASE_CLAIM_COST × density × (1/ring), floored at MIN_CLAIM_COST — verified
- BME flow: claim burn → equivalent mint to verifiers (60/40 split) — verified
- Faction corner placements (NW/NE/SE/SW) are verified — use with confidence
- Anything from memory that contradicts current code should trigger re-verification

## Notes

- Past failure: faction placements were initially wrong (cardinals instead of corners) — caught and corrected, now in persistent memory
- The two-tier user model (Hollow DB vs On-chain) is a frequent source of edge cases — always consider both paths
