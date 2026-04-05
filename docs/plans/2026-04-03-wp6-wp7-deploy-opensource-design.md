# WP6 + WP7: Deploy & Open-Source — Design

> **Date:** 2026-04-03
> **Status:** Draft
> **Scope:** Phase 2 gate completion — deploy marketing site, API docs, open-source prep

---

## Context

Phase 2 WP1-5 complete. E2E write-through pipeline verified. Monitor deployed with synced_at fix. Two gate items remain:
- API docs publicly accessible
- Testnet code open-sourced on GitHub

Plus the marketing site CNAME fix needs deploying.

## Current State

### Marketing Deploy Pipeline
- **Source:** `web/marketing/` in monorepo (pre-built static site, no build step)
- **Target:** `onetrueclaude-creator/zkagentic-website` (separate public repo, GitHub Pages)
- **Sync:** Manual — copy files from monorepo to deploy repo, push
- **CNAME:** Already correct in both places (`zkagentic.com`)
- **Gap:** Monorepo has newer content than deploy repo (last deploy repo commit: 2026-03-12)

### Open-Source Readiness (audit results)
- **LICENSE:** MISSING — needs creating
- **README:** STALE — doesn't document monorepo structure or chain setup
- **Secrets:** CLEAN — no hardcoded secrets, .env properly gitignored, history scrubbed
- **API docs:** `/docs` gated by ENVIRONMENT var (enabled in dev, disabled in prod)
- **Supabase anon key:** Safe (public by design, RLS protects data)
- **.gitignore:** Comprehensive
- **TODO.md:** Has 6 backlog items — mark as roadmap

## Plan

### WP6: Deploy Marketing Site (30 min)

1. Clone the deploy repo: `git clone git@github.com:onetrueclaude-creator/zkagentic-website.git /tmp/zkagentic-website-deploy/`
2. Sync: `rsync -av --delete --exclude='.git' web/marketing/ /tmp/zkagentic-website-deploy/`
3. Commit + push: deploys automatically via GitHub Pages
4. Verify: `curl -sI https://zkagentic.com` returns 200

### WP7: Open-Source Prep (2-3 hours)

#### 7.1: LICENSE file
- Create `LICENSE` at repo root
- **Recommend: MIT** (maximizes adoption, standard for blockchain projects)

#### 7.2: README rewrite
Complete rewrite covering:
- Project description (1 paragraph)
- Architecture diagram (ASCII)
- Monorepo structure table
- Quick start (3 commands: chain, game, monitor)
- Full setup (Supabase, PostgreSQL, env vars)
- Testing (chain pytest, game vitest, E2E playwright)
- Deployment (marketing: GitHub Pages, monitor: Cloudflare Pages)
- Links (whitepaper, live testnet, docs)

#### 7.3: API docs static export
- Start miner locally
- Fetch `/docs` HTML and save as `docs/api/index.html`
- Or: add `/api/docs` redirect on the marketing site pointing to the Swagger JSON

#### 7.4: CONTRIBUTING.md
Short (1 page):
- How to run locally
- PR conventions
- Code style (refer to CLAUDE.md)
- Test requirements

#### 7.5: SECURITY.md
- RLS policy explanation
- No hardcoded secrets policy
- Responsible disclosure contact

#### 7.6: Clean TODO.md → GitHub Issues
- Convert backlog items to GitHub Issues
- Replace TODO.md with link to Issues

#### 7.7: Make repo public
- `gh repo edit onetrueclaude-creator/Exodus --visibility=public`
- Verify no secrets exposed (already audited)

## Gate Verification

After completion:
- [ ] zkagentic.com serves updated marketing content
- [ ] API docs accessible (either static HTML or dev-mode `/docs`)
- [ ] Repo is public on GitHub with LICENSE + README
- [ ] Phase 2 gate: all 5 criteria met
