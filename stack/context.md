# Layer 2: Context Engineering

**Question:** *What to know while doing*

> **Context engineering is the architecture of computing the precise slice of state required to focus a model's attention budget on a specific decision.**

It governs what information is available to the AI when it performs a task: what files are provided, what documentation is referenced, what examples are shown, what history is preserved, and what knowledge is excluded.

## Properties

- **System-scoped.** Its effects persist across sessions and interactions. It provides continuity that Layer 1 cannot.
- **Declarative.** It defines what information should be available; the linguistic mode is description, specification, schema.
- **Architectural.** Its unit of practice is the information system. Building it requires engineering decisions about storage, retrieval, summarization, and caching.
- **Often asynchronous.** Much of context engineering happens before or between model invocations: indexing documents, computing summaries, updating memory stores.

## Core Concerns

- **Information selection** — what to include and what to leave out
- **Information structure** — how to organize what's provided so the AI can use it efficiently
- **Reference material** — documentation, style guides, examples, prior work
- **Conversation and session history** — what the AI "remembers" from earlier interaction
- **Retrieval** — how information is dynamically pulled in (RAG, file search, tool calls)
- **Exclusion** — what to deliberately keep out of context to avoid confusion or distraction

## Four Fundamental Operations

(Identified by LangChain's Lance Martin across many production agent systems)

1. **Writing context** — saving information outside the working context for later use (note-taking, memory formation, lessons-learned logs)
2. **Selecting context** — pulling specific information into the working context for the current decision (RAG, semantic search, targeted file reads)
3. **Compressing context** — retaining only the tokens required for the current task (summarization, pruning stale outputs, schema-driven compression)
4. **Isolating context** — splitting information across separate agents or processing steps to prevent cross-contamination

## The Deeper Structure

Context is a *compiled view* over a richer stateful system (Google ADK team). The compilation process selects, compresses, and transforms the source into the form the processor needs. Context engineering is the compilation pipeline for AI systems.

The naive approach ("give the model everything") fails for three reasons: cost/latency growth, signal degradation (models attend most to beginning and end of context), and context poisoning (errors compound across decisions).

**The Manus Insight:** The KV-cache hit rate is the single most important metric for a production agent. Stable information (system instructions) should appear first; frequently changing information (current task) should appear last — *stability-ordered context*.

**Memory as context:** What is sometimes called "memory engineering" is a context concern. Memory is a delivery mechanism for context, not a separate layer.

## Boundary

Context engineering is about *what information is present*. If you're deciding which files to attach, you're doing context work. If you're deciding what the AI should *prioritize* across those files, you've moved to **intent**.

## Failure Mode

**Informed incompetence.** The system receives good instructions (Layer 1 is working) but makes decisions based on incomplete, stale, or irrelevant information. It hallucinates facts it should have access to. It contradicts previous decisions because it cannot see them. The human feels like they are working with someone who follows instructions perfectly but has some sort of troublesome amnesia.

## Evaluation Surface

*Did the AI use the right information? Did it miss something it was given? Did it hallucinate something it wasn't?*

## Current Configuration

### Writing Context
- **Auto-memory:** `./ .claude/projects/-Users-toyg-Exodus/memory/MEMORY.md` — persists across conversations (faction placements, protocol params, key files)
- **Compaction files:** `compacted.md` (full transcript), `compacted-summary.md` (LLM summary), `prompts.md` (user prompts only) — survive context window compression
- **Dispatch state:** `.claude/dispatch-state.json` tracks multi-session feature work (phase, step, branch, completed steps)

### Selecting Context
- **Hierarchical navigation:** 28 `seed.md` + 23 `CLAUDE.md` files across the project tree — each directory has purpose descriptor + changelog
- **Root CLAUDE.md:** ~400 lines covering tech stack, architecture, conventions, UX spec, key concepts, commands, change log
- **Vault knowledge base:** `vault/whitepaper.md` (authoritative spec), research docs, product specs, engineering notes
- **Context7 MCP:** Retrieves up-to-date library docs on demand

### Compressing Context
- **PreCompact hook** auto-saves full transcript before context window compression
- **SessionStart hook** injects most recent summary or raw transcript block after compaction
- **Summary protocol:** Agent writes structured summary block to `compacted-summary.md` after auto-compaction

### Isolating Context
- **Subagent dispatch:** Explore, Plan, code-reviewer, silent-failure-hunter agents each get scoped context
- **Git worktrees:** Feature work can be isolated via `isolation: "worktree"` parameter

## Notes

- Stability-ordered: CLAUDE.md + memory load first (stable), task-specific files load last (changing) — aligns with the Manus Insight
- The whitepaper (`vault/whitepaper.md`) is mandatory reading before any feature work — this is the single most important context document
- 2026-03-12: Website aligned to whitepaper v1.2 — all pages (index, tokenomics, staking, roadmap, whitepaper, technology) verified against Section 22 protocol parameters. PDF download updated to v1.2
- 2026-03-12: Critical Supabase project ref fix — wrong URL `inqwwaqiptrmpruxczyy` corrected to `inqwwaqiptrmpxruyczy` across all files (.env.local, waitlist.js, monitor.js, supabase-expert SKILL.md). Memory updated with correct ref. Two deploy repos documented in memory (zkagentic-website for .com, zkagentic-site for .ai).
