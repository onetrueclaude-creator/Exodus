# Meta-Function: Harness Engineering

**Question:** *Where and how to do*

Harness engineering is **not a layer** — it governs the infrastructure, tooling, and execution environment in which the stack operates. It is the platform on which all cognitive concerns are implemented.

If evaluation asks "how do we know it's working?", the harness asks "where does all of this actually run?"

## Why It's Not a Layer

Harness engineering doesn't change *what* the AI thinks about — it changes *where* the AI thinks. Switching from Cursor to Claude Code doesn't alter your prompt, context, intent, judgment, or coherence concerns. It alters what tools are available, how context gets loaded, and how evaluation gets executed. These are real engineering decisions, but they are infrastructure decisions, not cognitive ones.

**Analogy:** The relationship between harness and the stack is the same as between a kitchen and a recipe. The recipe (the layers) defines what you're making. The kitchen (the harness) determines what equipment you have to make it with.

## What It Governs

- **Execution platforms** — What IDE, CLI tool, API, or orchestration framework runs the AI interaction? (Cursor, Codex, VS Code + Copilot, Claude Code, custom API pipelines, LangChain, etc.)
- **Tool integration** — What external tools does the AI have access to? File systems, databases, web search, code execution, deployment pipelines.
- **Orchestration** — How are multi-step tasks structured? Sequential agents, parallel workers, supervisor patterns, human-in-the-loop checkpoints.
- **Session management** — How is conversation history maintained? How are long tasks segmented? How do context windows get managed across interactions?
- **CI/CD and automation** — How do evaluation criteria get executed automatically? Test runners, linting pipelines, pre-commit hooks, deployment gates.
- **Configuration and reproducibility** — Can a working stack configuration be saved, shared, and reused? Project rules, system prompts, template libraries.

## Relationship to Evaluation

Evaluation runs *through* the harness. When you set up a test suite:
- The **tests themselves** are evaluation engineering (what to check, what criteria to use, what thresholds matter)
- The **test runner**, the CI pipeline, the logging framework — those are the **harness**

Evaluation defines the *what* of observation; the harness provides the *where* of execution. They are tightly coupled in practice, even though they are categorically distinct.

## Boundaries — What Collapses Into Harness

Several proposed "layers" actually collapse into harness engineering:

- **Tool / Function Engineering** — deciding what tools the AI can access is an infrastructure concern
- **Workflow / Orchestration Engineering** — multi-agent systems, swarms, sequential pipelines, supervisor patterns are execution architectures

These are real concerns, but they don't introduce a question that isn't already asked by an existing layer or meta-function.

## Harness Intervention

The user sets up and adjusts the harness, typically at the beginning of a project and when capabilities need to change. Choosing a new tool, integrating a new data source, or setting up a test pipeline — these are harness interventions that affect what's possible across all layers.

## Current Configuration

### Execution Platform
- **Claude Code CLI** (Opus 4.6) — primary development interface
- **Superpowers plugin** — skills, hooks, agents, commands extending Claude Code
- **Voice module** — speech-to-terminal input via `/voice` command

### Tool Integrations
- **MCP servers:** Context7 (library docs), Playwright (browser automation)
- **Git:** Full git workflow with hooks (pre-commit, session start/stop)
- **Docker Compose:** PostgreSQL 16 for local dev
- **Prisma 7:** ORM + migrations (`npx prisma migrate dev`, `npx prisma generate`)
- **FastAPI backend:** Agentic Chain testnet at `localhost:8080`

### Orchestration Patterns
- **Subagent dispatch:** Explore (research), Plan (architecture), code-reviewer, silent-failure-hunter, feature-dev agents
- **Parallel agents:** Up to 3 Explore agents in parallel during plan phase; up to 4 Playwright beta-tester agents for E2E
- **Sequential workflows:** Brainstorm → Plan → Implement → Review → Verify → Commit
- **Multi-session features:** Dispatch state JSON tracks phase/step/branch across sessions

### Session Management
- **Compaction pipeline:** PreCompact hook saves transcript → agent writes summary → SessionStart restores on resume
- **Memory persistence:** Auto-memory directory survives across conversations
- **Dispatch state:** `.claude/dispatch-state.json` for multi-session continuity

### CI/CD and Automation
- **Pre-commit hooks:** Enforced on every commit (never `--no-verify`)
- **Test commands:** `npm run test:run` (unit), `npm run test:e2e` (E2E)
- **Build:** `npm run build` (Next.js standalone output)
- **Website deploy:** Static HTML at `zkagentic-deploy/`, served via `serve.py` on port 8888, GitHub Pages

### Configuration and Reproducibility
- **CLAUDE.md:** Root project instructions (checked into git)
- **seed.md network:** 28 files providing per-directory purpose and navigation
- **`.claude/settings.json`:** Permission settings, auto-allowed paths
- **Skills directory:** `.claude/skills/` — reusable prompt templates for domain experts

## Notes

- The harness is unusually rich for a single-developer project — superpowers plugin, voice input, hierarchical memory, multi-agent dispatch
- Static website deploy (no build system) is a deliberate simplicity choice that may need revisiting as the site grows
