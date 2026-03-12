# Meta-Function: Evaluation Engineering

**Question:** *How to know while doing*

Evaluation engineering is **not a layer** — it does not introduce a new domain of concern. Instead, it is a parallel function that observes, measures, and corrects every layer of the stack, continuously and often autonomously.

While the five layers tell you *what to configure*, evaluation tells you *whether it's working*.

## Why It's Not a Layer

Each layer answers a "what" question. Evaluation answers a "how" question that operates across all domains simultaneously. If you remove a layer, you lose an entire dimension of AI behavior. If you remove evaluation, the layers still function — you just can't see whether they're functioning well.

## What It Governs

- **Observation** — Can you see what the AI is doing at each layer? Are prompts logged, context tracked, intent violations visible, judgment calls recorded, coherence drift detectable?
- **Measurement** — Do you have criteria for success at each layer? Not just "does the output look good" but specific, testable conditions: test suites, assertion libraries, quality rubrics, behavioral benchmarks.
- **Correction loops** — When evaluation detects a failure, what happens?

## Two Correction Paths

### Path 1: Autonomous Correction (Tight Loop)

The AI receives evaluation feedback directly and iterates without human involvement:

Tests fail → error logs feed back to the agent → the agent retries → tests run again

This is the tight loop that makes agentic coding possible. The human sets up the evaluation criteria; the AI does the iteration.

### Path 2: Human-in-the-Loop Correction (Diagnostic)

Evaluation surfaces findings to the user, who decides which layer to intervene at and how. This is the diagnostic path: evaluation tells you *where the stack is breaking*, and you re-enter at that specific layer to fix it.

Both paths are essential. Autonomous correction handles the volume (hundreds of small iterations per task). Human correction handles the judgment (moments when the evaluation criteria themselves need to change).

## Per-Layer Evaluation Questions

| Layer | What Evaluation Asks |
|-------|---------------------|
| **Prompt** | Did the AI do what was asked? Did it follow the format, constraints, and scope? |
| **Context** | Did the AI use the right information? Did it miss something it was given? Did it hallucinate something it wasn't? |
| **Intent** | Did the AI optimize for the right things? Did it make the tradeoffs you intended? |
| **Judgment** | Did the AI handle uncertainty well? Did it flag what it should have? Did it proceed when it should have paused? |
| **Coherence** | Is the AI's behavior consistent with its behavior on similar tasks? Is its identity stable? |

## Key Insight

Most people only evaluate at the prompt layer ("did I get the output I wanted?"). Failures at any layer propagate upward. Evaluation must be able to locate *which layer failed*, not just that the output is wrong.

## The Diagnostic Loop (User Interaction Model)

1. **Evaluation detects a problem** — either autonomously (tests fail) or through human review (the output doesn't seem right)
2. **Diagnosis identifies which layer failed** — Was the instruction unclear (prompt)? Was information missing (context)? Were the wrong tradeoffs made (intent)? Was a risk ignored (judgment)? Is the behavior inconsistent (coherence)?
3. **Re-entry happens at the specific layer** — Often the fix is adding a file to context, clarifying a priority, or defining an uncertainty protocol — not changing the prompt at all

The resulting skill is **mode fluency**: recognizing which layer is failing and intervening at the right level.

## Current Configuration

### Test Suites
- **Unit tests:** Vitest 4 + React Testing Library — `npm test` (watch) / `npm run test:run` (CI)
- **E2E tests:** Playwright — `npm run test:e2e`, includes 4 parallel faction beta-tester agents
- **Test seeding:** `npm run e2e:seed` seeds test user, `npm run e2e:gaps` reports coverage gaps

### Observation Mechanisms
- **Git status** at session start (injected by gitStatus hook)
- **Compaction transcript** captures full interaction history
- **Prompt logging** (`prompts.md`) tracks all user requests
- **Stop logging** captures completion events

### Autonomous Correction (Tight Loop)
- TDD workflow: write failing test → implement → verify (enforced by superpowers:test-driven-development skill)
- Pre-commit hooks run on every commit attempt — failures must be fixed, never skipped
- Systematic debugging skill fires before proposing fixes for any failure

### Human-in-the-Loop Correction (Diagnostic)
- Code review agents (pr-review-toolkit) run before PR creation
- Verification-before-completion skill requires evidence before claiming success
- Learning mode output provides `★ Insight` blocks so user can evaluate reasoning

### Per-Layer Evaluation (Project-Specific)
| Layer | How We Evaluate |
|-------|----------------|
| Prompt | Did the skill/command produce the expected output format? |
| Context | Did the agent use whitepaper specs? Did it check CLAUDE.md conventions? |
| Intent | Did the implementation match the UX Design Spec narrative? |
| Judgment | Did the agent flag whitepaper conflicts? Did it ask before destructive ops? |
| Coherence | Does the UI maintain Stellaris aesthetic? Is the Zustand/DockPanel pattern consistent? |

## Notes

- 22 Playwright E2E tests + 593 unit tests as of last major checkpoint
- The e2e:gaps script is an underused diagnostic — could be run more regularly to catch coverage drift
