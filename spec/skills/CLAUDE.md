# Change Log — spec/skills/

> **Archived stub (2026-07-09):** the persona-skill system logged below was superseded — live skills moved to `.claude/skills/` (local-only), including the supabase-expert and chain-protocol coverage the Pending list asked for. This log is historical.
> Tracks what skills exist, what's been added/modified, and what's planned.
> Read `seed.md` first.

---

## 2026-02-25 — Hierarchical memory system added

**Added:** `seed.md` + this `CLAUDE.md`.

**Why:** Consistent Claude navigation.

---

## 2026-02-25 — competitor-expert skill created

**Added:** `competitor-expert/skill-description.md` — deep reference file with hierarchical research tree pointing to all 4 competitor research files in `spec/research/competitors/`.
**Added:** `.claude/commands/skills/competitor-expert.md` — slash command that activates the Competitor Expert persona.

**Why:** Reusable persona skill for competitive analysis against ZkAgentic's design.

---

## 2026-02-24 — Skill library established

**Added:** 10 expert persona skills (ai-integration, backend, frontend, game-design, monorepo, pixijs, state, testing, ui-design, web3).

**Why:** Specialized domain knowledge for each layer of the ZK Agentic Network stack.

---

## Pending

- [ ] Create `ultimate-writer` skill for whitepaper/research writing
- [ ] Create `supabase-expert` skill (was planned in supabase-middleware-sync feature)
- [ ] Create `chain-protocol-expert` skill for Agentic Chain protocol questions
