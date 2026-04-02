# Conclave Vault

Team knowledge base for the Conclave monorepo.
Open the `vault/` folder directly in Obsidian.

---

## The Workflow

Every piece of work follows this loop:

```
1. Capture idea → ideas/
2. Refine into spec → product/features/ or research/
3. Write AI prompt → prompts/YYYY-MM-DD-<task>.md
4. Run agent → make implement FEATURE=vault/product/features/<name>
5. Review output → reviews/YYYY-MM-DD-<task>-retro.md
6. Iterate → back to step 2 or 3
```

---

## Folder Guide

| Folder                      | What goes here                                     |
| --------------------------- | -------------------------------------------------- |
| `ideas/`                    | Raw captures — no structure required, just write   |
| `prompts/`                  | AI prompts ready to run — one file per task        |
| `product/features/`         | Feature specs                                      |
| `product/roadmap/`          | Quarterly and milestone plans                      |
| `product/decisions/`        | Why we made key product calls (ADR format)         |
| `research/competitors/`     | One note per competitor                            |
| `research/market/`          | Market sizing, trends, positioning                 |
| `research/users/`           | Interviews, personas, pain points                  |
| `engineering/architecture/` | System design and technical ADRs                   |
| `engineering/runbooks/`     | Setup guides, operational how-tos                  |
| `reviews/`                  | Post-implementation retrospectives                 |
| `collaborate/clarifying-questions/` | Agent-written questions + engineer-written answers — do not edit question text, only fill in Answer: fields |
| `_templates/`               | Note templates — use via Obsidian Templates plugin |

---

## File Naming

- `ideas/` and `prompts/`: `YYYY-MM-DD-<slug>.md`
- Evergreen content (features, competitors, ADRs): `<slug>.md`

---

## Templates

Use the Obsidian Templates plugin (Cmd/Ctrl+T) to insert templates from `_templates/`:

- `idea.md` — raw idea capture
- `prompt.md` — AI task prompt
- `feature.md` — feature spec
- `adr.md` — architecture / product decision
- `competitor.md` — competitor profile
- `review.md` — post-implementation review

---

## Conventions

- Use **wikilinks** (`[[note-name]]`) to connect notes — not markdown links
- `_index.md` files in each section are Maps of Contents — keep them updated
- The `prompts/` folder is a first-class citizen alongside product and engineering
- `docs/plans/` (outside vault) is for AI-generated implementation plans — do not mix with vault
