# Phase 2 Gate: Open-Source Readiness — Research & Plan

> **Date:** 2026-04-05
> **Status:** Research (append-only, no implementation yet)
> **Scope:** SECURITY.md, .github/ templates, CI/CD, README fixes, merge → main, go public
> **Previous work:** `2026-04-03-wp6-wp7-deploy-opensource-design.md` (LICENSE, README, CONTRIBUTING.md done)

---

## 1. Current State Audit

### What EXISTS (done in prior sessions)
- [x] `LICENSE` — MIT, copyright 2026 ZK Agentic Network
- [x] `CONTRIBUTING.md` — setup, code style, PR conventions
- [x] `README.md` — monorepo structure, quick start, protocol params, domains
- [x] Security hardening — keys rotated, history scrubbed, authors normalized
- [x] Whitepaper v1.0 — published at zkagentic.com/whitepaper
- [x] Monitor — live at zkagentic.ai

### What's MISSING
- [ ] `SECURITY.md` — responsible disclosure policy
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` — bug report template
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` — feature request template  
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` — PR template
- [ ] `.github/CODEOWNERS` — code ownership rules
- [ ] `.github/workflows/ci.yml` — CI/CD (lint + test on PR)
- [ ] `.github/FUNDING.yml` — sponsorship/funding links (optional)

### What needs FIXING
- [ ] `README.md` line 5: "v1.3" → "v1.0"
- [ ] `README.md` line 18: "Whitepaper v1.3" → "Whitepaper v1.0"
- [ ] `README.md` line 2: unstaged terminology fix (star systems → nodes) — needs committing
- [ ] `CONTRIBUTING.md` line 33: "v1.3" → "v1.0"

---

## 2. Competitor Research: SECURITY.md Patterns

### Solana/Agave (`anza-xyz/agave`) — 310 lines
- **Sections:** Vulnerability Reporting, Incident Response (7-step protocol), Bug Bounty
- **Contact:** GitHub Security Advisory (primary), email fallback
- **Bug Bounty:** SOL-denominated tiers (20-25,000 SOL), 12-month lockup, KYC required
- **Notable:** 72-hour response commitment. Most detailed of all 5. Bifurcated issue templates (community vs core-contributor).
- **Governance:** CODEOWNERS (6 teams), PR template, 14 CI workflows
- **Relevance:** Gold standard for structure. Our SOL migration path means eventual compatibility needed.

### Ethereum (`ethereum/go-ethereum`) — ~100-120 lines
- **Sections:** Supported Versions, Audit Reports (4 audits 2017-2020), Vulnerability Reporting
- **Contact:** `bounty@ethereum.org` + PGP key (AE96 ED96...)
- **Bug Bounty:** bounty.ethereum.org (external platform)
- **Notable:** Individual CODEOWNERS (9 people by GitHub handle). 3 issue templates (bug, feature, question).
- **Governance:** CODEOWNERS (29 lines), CONTRIBUTING.md, 2 workflows
- **Relevance:** Template for our structure — medium-length, professional, documents audit history.

### Zcash (`zcash/zcash`) — ~127 lines
- **Sections:** Receiving Disclosures, Sending Disclosures, Counterfeiting Bug Exception
- **Contact:** `security@z.cash` + PGP key
- **Notable:** **Only project with privacy-specific disclosure policy.** Counterfeiting bugs in shielded pools can't be rolled back — may withhold technical details from partners during coordinated disclosure. Partners: Zcash Foundation, Horizen, Komodo, BitcoinABC.
- **Governance:** 3 issue templates (bug, feature, UX), 7 workflows, dependabot configured. No CODEOWNERS.
- **Relevance:** Critical model for our privacy architecture. Our depth-26 SMT has similar counterfeiting risks.

### zkSync Era (`matter-labs/zksync-era`) — 146 lines
- **Sections:** Vulnerabilities, Other Security Issues, PGP Key
- **Contact:** `security@matterlabs.dev` + PGP key, Immunefi bounty
- **Notable:** "Impact-first" approach — prioritizes serious findings even outside bounty scope. Most comprehensive CI/CD of all 5 (43 workflows including secrets_scanner.yaml).
- **Governance:** 2 issue templates, PR template, 43 workflows. No CODEOWNERS.
- **Relevance:** Closest competitor in ZK space. Impact-first approach is good model for pre-bounty projects like ours.

### BNB Chain (`bnb-chain/bsc`) — ~55 lines (smallest)
- **Sections:** Supported Versions, Audit Reports, Vulnerability Disclosure
- **Contact:** Bugcrowd program + `bounty@ethereum.org` (inherited from go-ethereum fork)
- **Notable:** Derivative of go-ethereum. Smallest SECURITY.md. Documents `geth version-check` for self-audit.
- **Governance:** CODEOWNERS (37 lines, 8 people), 3 issue templates, 11 workflows
- **Relevance:** Shows that even a fork-based project adds its own CODEOWNERS and CI.

### Cross-Project Summary

| Feature | Agave | Ethereum | Zcash | zkSync | BNB |
|---------|-------|----------|-------|--------|-----|
| SECURITY.md lines | 310 | ~120 | ~127 | 146 | ~55 |
| PGP key | Yes | Yes | Yes | Yes | No |
| Bug bounty | SOL tiers | External | No | Immunefi | Bugcrowd |
| CODEOWNERS | Yes (6 teams) | Yes (9 people) | No | No | Yes (8 people) |
| Issue templates | 2 | 3 | 3 | 2 | 3 |
| PR template | Yes | No | No | Yes | No |
| CI workflows | 14 | 2 | 7 | 43 | 11 |
| Privacy-specific | No | No | **Yes** | No | No |

**Key insight:** All 5 publish PGP keys with their security contact. Proton Mail provides this automatically — strong alignment with our choice of email provider.

---

## 3. Competitor Research: .github/ Infrastructure

### Common patterns across top blockchain projects

All 5 competitors have:
- **CI/CD workflows** — automated testing on PR
- **Issue templates** — structured bug reports and feature requests
- **Security policy** — SECURITY.md at repo root

Most have:
- **CODEOWNERS** — at least for critical paths (consensus, crypto)
- **PR templates** — checklist format (tests, docs, breaking changes)
- **Dependabot/Renovate** — dependency updates

---

## 4. Design Decisions

### 4.1 SECURITY.md — Approach Options

**Option A: Minimal (Zcash-style)**
- Contact email + PGP key
- "Don't file public tickets for vulnerabilities"
- ~30 lines

**Option B: Comprehensive (Ethereum/BNB-style)**
- Supported versions table
- Audit reports section
- Bug bounty program link
- Vulnerability disclosure process
- Security advisories
- ~60-80 lines

**Option C: Privacy-aware (Zcash + our SMT architecture)**
- Everything from B
- Plus: privacy-specific disclosure policy (SMT counterfeiting risk)
- Plus: .claude/ hash verification security considerations
- ~80-100 lines

**Recommendation: Option B for now, with a privacy addendum from C.**
We're pre-mainnet — no bug bounty budget yet, no professional audit. Be honest about current state while following industry conventions. Add the privacy-specific section once the SMT verification is actually live.

### 4.2 Issue Templates

**Bug report template should include:**
- Environment (OS, Python/Node version, browser)
- Component (chain, game, monitor, marketing)
- Steps to reproduce
- Expected vs actual behavior
- Logs/screenshots

**Feature request template should include:**
- Problem statement
- Proposed solution
- Alternatives considered
- Whitepaper section reference (if applicable)

### 4.3 PR Template

**Checklist format:**
- [ ] Tests added/updated
- [ ] Tests pass locally
- [ ] No secrets committed
- [ ] Whitepaper alignment verified (if protocol change)
- [ ] Design doc reference (if applicable)

### 4.4 CODEOWNERS

```
# Protocol-critical paths
/chain/agentic/params.py          @onetrueclaude-creator
/chain/agentic/consensus/         @onetrueclaude-creator
/chain/agentic/privacy/           @onetrueclaude-creator
/chain/agentic/economics/         @onetrueclaude-creator
/spec/whitepaper.md               @onetrueclaude-creator

# Everything else
*                                 @onetrueclaude-creator
```

For now, single owner (solo founder). CODEOWNERS becomes meaningful when team grows post-token-sale (Phase 5).

### 4.5 CI/CD Workflow

**What to test on PR:**
1. Chain: `python3 -m pytest chain/tests/ -v --timeout=120`
2. Game: `cd apps/game && npm ci && npm run build && npm run test:run`
3. Lint: ESLint for TypeScript, no Python linter yet

**Runner:** GitHub Actions, `ubuntu-latest`

**Concern:** The chain test suite has 700+ tests. Some may be slow or flaky (rate-limited API tests). Need to verify which tests are safe for CI before writing the workflow.

### 4.6 README Fixes

Simple text replacements:
- Line 5: `(v1.3)` → `(v1.0)`
- Line 18: `Whitepaper v1.3` → `Whitepaper v1.0`
- Commit the existing unstaged terminology fix (star systems → nodes)

### 4.7 CONTRIBUTING.md Fix

- Line 33: `(v1.3)` → `(v1.0)`

---

## 5. Execution Order (Recommended)

### Step 1: Fix stale references (5 min)
- Fix README.md v1.3 → v1.0 (2 occurrences)
- Fix CONTRIBUTING.md v1.3 → v1.0 (1 occurrence)
- Commit with the existing README terminology fix
- Single commit: "fix: update whitepaper version references to v1.0"

### Step 2: SECURITY.md (30 min)
- Create SECURITY.md at repo root
- Sections: Supported Versions, Reporting Vulnerabilities, Scope, Audit Status, Contact
- Contact: GitHub Security Advisories (private reporting) — no email needed initially
- Commit: "docs: add SECURITY.md with responsible disclosure policy"

### Step 3: .github/ templates (30 min)
- Create `.github/ISSUE_TEMPLATE/bug_report.md` with YAML frontmatter
- Create `.github/ISSUE_TEMPLATE/feature_request.md` with YAML frontmatter
- Create `.github/PULL_REQUEST_TEMPLATE.md`
- Create `.github/CODEOWNERS`
- Commit: "docs: add GitHub issue/PR templates and CODEOWNERS"

### Step 4: CI/CD workflow (30 min)
- Create `.github/workflows/ci.yml` (draft above — two parallel jobs, chain + game)
- Delete `chain/tests/tests/` duplicate directory first (cleanup)
- Commit cleanup: "chore: remove duplicate tests/tests/ directory"
- Commit workflow: "ci: add GitHub Actions workflow for chain tests and game build"
- Push exodus-dev to trigger first CI run and verify

### Step 5: Final audit before merge (30 min)
- `git log --oneline main..exodus-dev` — review all commits being merged
- Grep for secrets one final time
- Verify .gitignore covers all sensitive files
- Check no absolute paths remain in tracked files

### Step 6: Merge exodus-dev → main (10 min)
- **35 commits** from exodus-dev since main divergence
- Commit range covers: Phase 2 write-through, security hardening, terminology alignment, whitepaper v1.0, CSS fix
- Recommend PR-based merge: `gh pr create --base main --head exodus-dev`
- Push to remote

### Step 7: Make repo public (5 min)
- `gh repo edit onetrueclaude-creator/Exodus --visibility=public`
- Verify: `gh repo view onetrueclaude-creator/Exodus --json visibility`
- Smoke test: clone from fresh location, follow README quick start

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Secrets still in history | Scrubbed with 4 filter-repo passes. Pre-merge grep confirms clean (2026-04-05). |
| CI workflow fails on first run | Test chain suite locally first. Use `--timeout` and skip known flaky tests. |
| No bug bounty budget | Omit from SECURITY.md entirely — don't promise what you can't deliver. |
| CODEOWNERS too restrictive for solo dev | Set @onetrueclaude-creator as default. Loosen when team grows. |
| README outdated after merge | Fix version refs (v1.3 → v1.0) as first action. |

### Pre-Merge Security Audit (completed 2026-04-05)

| Check | Result |
|-------|--------|
| `/Users/toyg` in tracked files | **CLEAN** — zero occurrences |
| `sb_secret_` in tracked files | **CLEAN** — zero occurrences |
| `sb_publishable_` in tracked files | **SAFE** — only in monitor.js/simulator.js (publishable keys are public by design) |
| JWT tokens (`eyJ...`) in tracked files | **CLEAN** — only npm integrity hashes in package-lock.json |
| Hardcoded passwords | **SAFE** — only `devpass` in docker-compose.yml (local dev) and `TestPass123!` in test fixtures |
| `.env` files tracked | **CLEAN** — all .env files gitignored |
| Personal email addresses | **CLEAN** — scrubbed by filter-repo (4 passes, 2026-04-04) |

---

## 7. Open Questions (for user decision)

1. ~~**Contact method for security reports:** GitHub Security Advisories (private) vs. dedicated email?~~
   - **DECIDED:** `security@zkagentic.com` via Proton Mail (E2E encrypted, PGP built-in) + GitHub Security Advisories as secondary channel

2. **Bug bounty mention:** Include a "no bounty yet, planned for Phase 5" note, or omit entirely?
   - Recommendation: Omit — don't mention what you don't have

3. **CI test scope:** Run ALL 700+ chain tests on every PR, or a subset?
   - Recommendation: All tests. If too slow (>10 min), add a `[skip-slow]` label mechanism later.

4. **Merge strategy:** Direct merge or PR-based?
   - Recommendation: PR-based (`gh pr create` from exodus-dev → main) for audit trail

5. **First public PR after going public:** Code identifier refactor (GalaxyGrid → NeuralLattice)?
   - Recommendation: Yes — shows active development and aligns naming with whitepaper

---

## 10. .github/ Template Drafts

### 10.1 Bug Report Template (`.github/ISSUE_TEMPLATE/bug_report.md`)

```yaml
---
name: Bug Report
about: Report a bug in the chain, game UI, monitor, or marketing site
title: "[Bug] "
labels: bug
assignees: ''
---

**Component**
- [ ] Chain (Python testnet — `chain/`)
- [ ] Game UI (Next.js — `apps/game/`)
- [ ] Monitor (zkagentic.ai — `web/monitor/`)
- [ ] Marketing site (zkagentic.com — `web/marketing/`)

**Describe the bug**
A clear description of what the bug is.

**Steps to reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Environment**
- OS: [e.g., macOS 15, Ubuntu 24.04]
- Python version (if chain): [e.g., 3.12]
- Node version (if game): [e.g., 22.x]
- Browser (if UI): [e.g., Chrome 130]

**Screenshots / Logs**
If applicable, add screenshots or paste error logs.
```

### 10.2 Feature Request Template (`.github/ISSUE_TEMPLATE/feature_request.md`)

```yaml
---
name: Feature Request
about: Suggest a new feature or enhancement
title: "[Feature] "
labels: enhancement
assignees: ''
---

**Problem statement**
What problem does this feature solve?

**Proposed solution**
How would you like this to work?

**Alternatives considered**
Any other approaches you've thought about.

**Whitepaper reference**
If this relates to a protocol mechanism, reference the relevant section of the
[whitepaper](spec/whitepaper.md) (e.g., "Section 5.2 — PoAIV threshold").

**Additional context**
Any other context, mockups, or examples.
```

### 10.3 PR Template (`.github/PULL_REQUEST_TEMPLATE.md`)

```markdown
## Summary

<!-- What does this PR do and why? -->

## Changes

<!-- Bullet list of key changes -->

## Checklist

- [ ] Tests added/updated and passing locally
- [ ] No secrets or credentials committed
- [ ] Whitepaper alignment verified (if protocol change)
- [ ] Design doc referenced (if applicable): `docs/plans/...`

## Test output

<!-- Paste relevant test output below -->
```

### 10.4 CODEOWNERS (`.github/CODEOWNERS`)

```
# Protocol-critical paths — require owner review
/chain/agentic/params.py          @onetrueclaude-creator
/chain/agentic/consensus/         @onetrueclaude-creator
/chain/agentic/privacy/           @onetrueclaude-creator
/chain/agentic/economics/         @onetrueclaude-creator
/spec/whitepaper.md               @onetrueclaude-creator

# Default — all other files
*                                 @onetrueclaude-creator
```

### 10.5 CI/CD Workflow (`.github/workflows/ci.yml`)

**Test suite audit results (2026-04-05):**
- Chain: 816 unique tests, ~32s local (est. 1-2 min in CI), no network/env deps
- Game: 384 tests, ~3s, no external deps
- Known issue: `chain/tests/tests/` is a duplicate directory — must `--ignore`
- 6 flaky tests (shared global state) — pass individually, fail in full suite
- 2 skipped tests (rate limit) — skip themselves gracefully
- Python 3.10+ recommended, Node 18+ for Next.js 16

```yaml
name: CI

on:
  pull_request:
    branches: [main, exodus-dev]
  push:
    branches: [main]

jobs:
  chain-tests:
    name: Chain Tests (Python)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: chain/requirements.txt
      - name: Install dependencies
        run: |
          cd chain
          pip install -r requirements.txt
          pip install pytest pytest-timeout
      - name: Run tests
        run: |
          cd chain
          python -m pytest tests/ -v \
            --timeout=120 \
            --ignore=tests/tests \
            --ignore=tests/benchmarks \
            -x -q

  game-build:
    name: Game Build + Tests (Node)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: apps/game/package-lock.json
      - name: Install dependencies
        run: cd apps/game && npm ci
      - name: Build
        run: cd apps/game && npm run build
      - name: Run tests
        run: cd apps/game && npm run test:run
```

**Design notes:**
- Two parallel jobs (chain + game) — no dependencies between them
- `--ignore=tests/tests` excludes the duplicate test directory (816 → correct count)
- `--ignore=tests/benchmarks` excludes 29 benchmark tests (not needed on every PR)
- `--timeout=120` prevents hangs
- `-x` stops at first failure (fast feedback)
- Python 3.12 (latest stable, avoids Supabase SDK deprecation warning)
- Node 22 (LTS, compatible with Next.js 16)
- pip/npm caching for faster reruns
- 6 flaky tests: accept for now — fix shared state as a follow-up PR

**Anomaly to fix:** `chain/tests/tests/` is an accidental duplicate of `chain/tests/`. Should be deleted in a cleanup commit before or after going public. Not blocking for CI (excluded via `--ignore`).

---

## Appendix: Files to Create/Modify

### New Files
| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `SECURITY.md` | Responsible disclosure policy | 60-80 |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template | 40 |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template | 35 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR checklist | 25 |
| `.github/CODEOWNERS` | Code ownership | 10 |
| `.github/workflows/ci.yml` | CI/CD pipeline | 60-80 |

### Modified Files
| File | Change |
|------|--------|
| `README.md` | v1.3 → v1.0 (2 occurrences) + commit unstaged terminology fix |
| `CONTRIBUTING.md` | v1.3 → v1.0 (1 occurrence) |

---

## 8. Email Infrastructure (DECIDED 2026-04-05)

### Provider: Proton Mail Essentials ($6.99/month, $83.88/year)
- **Account:** [admin account]
- **Organization:** ZK Agentic Network
- **Domain:** zkagentic.com (DNS migrated from Dynadot → Cloudflare, pending activation)

### Email Addresses (1 user + 5 aliases)
| Address | Purpose | Appears in |
|---------|---------|-----------|
| `security@zkagentic.com` | Vulnerability disclosure | SECURITY.md, GitHub security policy |
| `legal@zkagentic.com` | Privacy/GDPR/DMCA/terms | Privacy policy, terms of service |
| `support@zkagentic.com` | General user support | Website footer, docs |
| `info@zkagentic.com` | General contact, GitHub org profile | GitHub org, marketing site |
| `press@zkagentic.com` | Media/partnership inquiries | Marketing site contact section |

### Why Proton over Google
- **Brand coherence:** Privacy blockchain + encrypted email (vs. Google whose business model is reading email)
- **PGP built-in:** Competitors (Zcash, Ethereum, zkSync) publish PGP keys — Proton generates and manages this automatically
- **Swiss jurisdiction:** Strong privacy laws, aligns with ZK ethos
- **Marketing asset:** "Our communications are protected by Proton's end-to-end encryption"
- **Cost:** $0.79/month less than Google Workspace Starter

### DNS Setup (in progress)
1. [x] Proton account created
2. [x] Domain verification TXT record: `protonmail-verification=[redacted]`
3. [x] zkagentic.com DNS migrated from Dynadot to Cloudflare (nameserver propagation pending)
4. [ ] Add TXT record in Cloudflare → verify in Proton
5. [ ] Add MX records (Proton's mail servers)
6. [ ] Add SPF TXT record (sender verification)
7. [ ] Add DKIM CNAME record (email signing)
8. [ ] Add DMARC TXT record (delivery policy)
9. [ ] Create 5 email aliases in Proton admin
10. [ ] Export PGP public key for SECURITY.md
11. [ ] Test send/receive from each alias

### Competitor Email Patterns (research)
| Tier | Prefix | Industry Usage | Our Plan |
|------|--------|---------------|----------|
| Must have | `security@` | 6/8 projects | Yes — SECURITY.md primary contact |
| Must have | `legal@` | 6/8 (as legal/privacy/notices) | Yes — future privacy policy |
| Should have | `support@` | 4/8 | Yes — website footer |
| Should have | `info@` | 3/8 | Yes — GitHub org profile |
| Nice to have | `press@` | 2/8 (Ethereum, Chainlink) | Yes — media inquiries |

---

## 9. SECURITY.md Draft Content

Based on competitor analysis (especially Zcash's privacy-aware approach and Ethereum's structure), here is the planned content for SECURITY.md:

### Structure (estimated ~80 lines)

```markdown
# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Testnet (current) | Yes |

We are in active testnet development. All reported vulnerabilities will be
assessed regardless of which component is affected.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

### Primary Channel: Email (encrypted)

Send vulnerability reports to **security@zkagentic.com**. This address is
hosted on Proton Mail with end-to-end encryption enabled by default.

For encrypted submissions, use our PGP public key:

[PGP key block — to be exported from Proton after setup]

Fingerprint: [to be filled after Proton setup]

### Secondary Channel: GitHub Security Advisories

You can also report vulnerabilities through
[GitHub Security Advisories](https://github.com/onetrueclaude-creator/Exodus/security/advisories).
This provides a private channel for coordinated disclosure.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected component (chain, game UI, monitor, marketing site)
- Potential impact assessment
- Any suggested fixes (optional but appreciated)

## Response Timeline

- **Acknowledgment:** Within 72 hours
- **Initial assessment:** Within 1 week
- **Fix timeline:** Depends on severity; critical issues prioritized

## Scope

### In Scope
- Chain consensus and protocol logic (`chain/agentic/`)
- Privacy architecture (SMT, commitment scheme, ZK proofs)
- Token economics (mining, staking, fee model)
- Authentication and authorization (game UI)
- Supabase RLS policies and data exposure
- Smart contract interactions (when deployed)

### Out of Scope
- Social engineering attacks
- Denial of service (we're on testnet)
- Issues in third-party dependencies (report upstream)
- Issues already documented in known limitations (Section 24, whitepaper)

## Audit Status

- **Internal AI-assisted audit:** Complete (95 tests, 5 subsystem reports)
  — see `spec/audit-report/` for findings
- **Professional protocol audit:** Planned for Phase 5 (post-token-sale)
- **Bug bounty program:** Planned for Phase 5

## Disclosure Policy

We follow coordinated disclosure. We ask that you:

1. Allow us reasonable time to fix the issue before public disclosure
2. Do not exploit the vulnerability beyond what's needed to demonstrate it
3. Do not access or modify other users' data

We will credit reporters in our security advisories unless anonymity is
requested.

## Contact

- **Security:** security@zkagentic.com (PGP-encrypted, Proton Mail)
- **General:** info@zkagentic.com
```

### Design Rationale
- **Length (~80 lines):** Between Zcash (127) and BNB (55) — appropriate for a pre-mainnet project
- **Proton + PGP:** Matches Zcash, Ethereum, and zkSync patterns. Automatic with our email provider.
- **Honest about audit status:** We have internal AI audit but no professional audit yet — transparency builds trust
- **No bug bounty:** Omitted entirely (not "coming soon") — don't promise what you can't deliver
- **Privacy section deferred:** Will add Zcash-style counterfeiting bug exception when SMT verification goes live (Phase 3+)
- **72-hour response:** Matches Solana/Agave's commitment — achievable for a solo founder monitoring email
