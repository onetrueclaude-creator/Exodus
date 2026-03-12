# Layer 1: Prompt Engineering

**Question:** *What to do*

> **Prompt engineering is the craft of designing the structural scaffolding that bridges the gap between a model's theoretical capability and its practical output.**

It is the foundation of the stack. It governs the direct instruction given to an AI: the task, the format, the constraints, and the deliverable.

## Properties

- **Session-scoped.** Its effects last for one interaction. Each new session starts from zero unless other layers provide continuity.
- **Imperative.** It tells the system what to do; the linguistic mode is instruction, command, request.
- **Individual.** Its unit of practice is one person interacting with one model. The skill is personal and the value accrues to the practitioner.
- **Synchronous.** The human is present for the entire execution cycle: instruct, observe, evaluate, iterate.

## Core Concerns

- **Task definition** — what specifically needs to be produced
- **Format and structure** — what the output should look like
- **Constraints** — what the output must not do or include
- **Scope** — where the task begins and ends
- **Success criteria** — how you'll know the output is correct

## The Deeper Structure

Prompt engineering is the practice of externalizing cognitive structure. When you write a prompt that says "First analyze the constraints, then generate three options, then evaluate each against the constraints," you are taking a cognitive process that exists in your head and rendering it in a form that another intelligence can follow.

What makes prompt engineering specific to AI is the nature of the recipient. Human collaborators share a vast background of implicit cultural knowledge and can fill in gaps. Models fill in gaps unpredictably, based on patterns in training data rather than shared understanding. This is why prompt engineering requires more precision than human instruction.

**Useful frameworks:** R.A.C.E. (Role, Action, Context, Execute) · C.L.E.A.R. (Concise, Logical, Explicit, Adaptive, Reflective) · C.R.I.S.P. (Concise, Relevant, Impactful, Specific, Precise) · T.A.G. (Task, Audience, Goal)

## Boundary

Prompt engineering ends where the instruction ends. The moment you're deciding *what information the AI should have access to* rather than what it should do with that information, you've moved to **context engineering**. The moment you're defining *why one format serves the goal better than another*, you're approaching **intent**.

## Failure Mode

**Incoherent capability.** The system gives answers that are individually plausible but collectively inconsistent. It produces output that is technically impressive but wrong for the actual use case. The human feels like they are talking to a brilliant entity that cannot understand what they mean.

## Evaluation Surface

*Did the AI do what was asked? Did it follow the format, constraints, and scope?*

## Current Configuration

- **Primary interface:** Claude Code CLI (Opus 4.6) with superpowers plugin system
- **Prompt dispatch:** Skills-based — `/feature`, `/commit`, `/review-pr`, `/brainstorm` expand into structured prompts with checklists
- **Session hooks:** PreCompact (saves transcript), SessionStart (restores context), UserPromptSubmit (logs prompts), Stop (logs completions)
- **Conventions enforced via CLAUDE.md:** TDD, dark crypto aesthetic, DockPanel patterns, PixiJS mutation rules, test mocking requirements
- **Format constraints:** `@/*` path alias, tests co-located in `__tests__/`, components/services/store/types in canonical directories
- **Output mode:** Learning style — implementation paired with `★ Insight` educational blocks

## Notes

- The UX Design Spec in CLAUDE.md acts as a narrative prompt — a user story defining expected behavior for all UI features
- Agent Terminal Menu Structure serves as a structured prompt template for the game's command interface
- Superpowers brainstorming skill fires before creative work, preventing premature implementation
