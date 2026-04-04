---
name: security-hardening
description: Pre-release security audit and remediation — credential rotation, history scrubbing, identity normalization, open-source readiness
priority: 90
last_read: 2026-04-04T12:00:00Z
read_count: 1
---

# Security Hardening — Open-Source Readiness

## When This Skill Activates

- Before making a private repo public
- After a credential leak is discovered
- Before any force-push or history rewrite
- When rotating API keys, tokens, or secrets
- Periodic security audit (quarterly or before major releases)

---

## Pre-Release Audit Checklist

Run this full checklist before making any repo public. Every item must pass.

### 1. Secrets in Tracked Files

```bash
# Search all tracked files for credential patterns
git grep -i "password\|secret\|api_key\|private_key\|token" -- "*.py" "*.js" "*.ts" "*.json" "*.sh" "*.yml"
git grep "eyJ" -- "*.py" "*.js" "*.ts"          # JWT tokens
git grep "sk_\|pk_\|sb_secret" -- "*.py" "*.js"  # API secret keys
git grep "GOCSPX\|AIza" -- "*"                    # Google secrets
```

**Rule:** No real credentials in tracked files. Environment variables only (`os.environ.get()`).

### 2. Secrets in Git History

```bash
# Search ALL history (including all branches and tags)
git log --all --oneline -S "<secret_pattern>"
```

**Common patterns to search:**
- Full JWT tokens and segments (header, payload, signature separately)
- API keys, OAuth secrets, service keys
- Connection strings with embedded passwords
- Base64-encoded credentials

**Gotcha:** Secrets may be split across multiple lines (Python string concatenation, JSON multiline). Search for segments, not just full strings. See "Iterative Scrubbing" below.

### 3. Personal Information

```bash
# In tracked files
git grep "Users/\|/home/" -- "*"           # Home directory paths
git grep "@192\.168\.\|@10\.\|@172\." -- "*"  # Local network emails/IPs

# In git history
git log --all --oneline -S "Users/<username>"
git log --all --format="%ae" | sort -u      # Author emails
git log --all --format="%ce" | sort -u      # Committer emails
```

### 4. .gitignore Completeness

Verify these are ignored:
- `.env`, `.env.local`, `.env.*.local`
- `node_modules/`, `.next/`, `.turbo/`, `.wrangler/`
- Database files (`*.db`, `*.sqlite`)
- Auth files (`.chain_auth`, `*.pem`, `*.key`)
- IDE files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)

```bash
# Verify nothing sensitive is tracked
git ls-files "*.env" "*/.env" "*.pem" "*.key" "*.db"
```

### 5. Stale Branches

```bash
git branch -a   # List all branches
```

Stale branches may contain secrets that were cleaned from main. Delete before scrubbing history — filter-repo only rewrites reachable refs.

### 6. File Listing Sanity

```bash
git ls-files | grep -i "credential\|secret\|\.env\|\.pem\|\.key\|password"
```

---

## Credential Rotation Procedure

### Zero-Downtime Key Rotation

**Order matters.** Never revoke before replacing.

```
1. Generate new key in provider dashboard
2. Update ALL consumers (code, env files, deployed services)
3. Verify each consumer works with new key
4. THEN revoke/disable old key
5. Verify nothing broke after revocation
```

### Supabase Key Rotation (Specific)

Dashboard: `https://supabase.com/dashboard/project/<ref>/settings/api-keys`

1. Create new publishable + secret keys on the **API Keys** tab (NOT `/legacy`)
2. Update `chain/.env`: `SUPABASE_SERVICE_ROLE_KEY=sb_secret_...`
3. Update JS files: `SUPABASE_ANON_KEY = 'sb_publishable_...'`
4. Deploy updated JS (e.g., `wrangler pages deploy`)
5. Verify: `python3 -c "from supabase import create_client; ..."` + curl production JS
6. Disable legacy keys on `/settings/api-keys/legacy`

---

## Git History Scrubbing

### Tool: git filter-repo

```bash
pip3 install git-filter-repo
```

### Iterative Scrubbing (CRITICAL PATTERN)

A single pass WILL miss secrets stored in multiple formats. Always verify and re-run.

**Pass 1: Full strings + paths**
```bash
cat > /tmp/replacements.txt << 'EOF'
<full_secret_string>==>***REDACTED***
/Users/<username>/<repo>/==>./
EOF
python3 -m git_filter_repo --replace-text /tmp/replacements.txt --force
```

**Verify:**
```bash
git log --all --oneline -S "<secret_pattern>" | wc -l
# Must be 0. If not, investigate:
git show <sha> | grep "<pattern>"   # See the format
```

**Pass 2: Segments (for multi-line secrets)**
```bash
# JWT stored as Python multi-line string needs segment replacement
cat > /tmp/replacements2.txt << 'EOF'
<jwt_header>==>***REDACTED***
<jwt_payload>==>***REDACTED***
<jwt_signature>==>***REDACTED***
EOF
rm -f .git/filter-repo/already_ran
python3 -m git_filter_repo --replace-text /tmp/replacements2.txt --force
```

**Pass 3: Author identity rewrite**
```bash
# .mailmap only affects display. filter-repo --mailmap rewrites commit objects.
cat > .mailmap << 'EOF'
Canonical Name <canonical@email> <old@email1>
Canonical Name <canonical@email> <old@email2>
EOF
rm -f .git/filter-repo/already_ran
python3 -m git_filter_repo --mailmap .mailmap --force
git rm .mailmap && git commit -m "chore: remove .mailmap after author rewrite"
```

### After filter-repo

filter-repo removes the `origin` remote (safety feature).

```bash
git remote add origin <url>
# New commits after filter-repo need explicit identity:
GIT_COMMITTER_NAME="Name" GIT_COMMITTER_EMAIL="email" \
  git commit --amend --no-edit --author="Name <email>"
git push --force origin <branch1> <branch2>
```

---

## Post-Scrub Verification

Run the full audit checklist again after every scrubbing pass. Pay special attention to:

1. `git log --all -S` with `--all` flag (catches remote refs still pointing to old commits)
2. Author/committer fields: `git log --format="%ae"` (not `%aE` — raw, not mailmap-adjusted)
3. Remote refs may still reference pre-rewrite commits until force-pushed

---

## .claude/ Folder — What to Commit vs Gitignore

Industry standard (Facebook/Meta, Ethereum Foundation, Vercel, Grafana, Solana Foundation): `.claude/` IS committed to public repos. It defines project context for all contributors.

### Commit (shared project context)

| Path | Purpose |
|------|---------|
| `CLAUDE.md` (root + subdirs) | Project instructions, conventions, architecture |
| `.claude/settings.json` | Permissions, hooks, plugins |
| `.claude/skills/` | Domain knowledge, capabilities, procedures |
| `.claude/layers/` | Orchestrator identity stack |
| `.claude/SEED.md` | Project identity and lineage |
| `.claude/MANIFEST.md` | Canonical structure blueprint |
| `.claude/commands/` | Slash command definitions |
| `.claude/rules/` | Behavioral governance |
| `.claude/agents/` | Role definitions and dispatch templates |
| `.claude/internals/comms-cursor.md` | Communication sync state |
| `.claude/priorities.md` | File priority registry |
| `.claude/hooks/*.sh` | Hook scripts (automation) |

### Gitignore (session-local, conversation content)

```gitignore
# Claude session-local state (never commit)
.claude/dispatch-state.json
.claude/scheduled_tasks.lock
.claude/journal.md
**/.claude/journal.md
**/inbox.md
**/outbox.md

# Session transcripts and prompt logs
user-prompts.md
prompts.md
compacted.md
compacted-summary.md

# Personal overrides (auto-gitignored by Claude Code)
.claude/settings.local.json
CLAUDE.local.md
```

### Why This Split

- **Committed files** = capability definitions, permissions, project knowledge. Static. Safe. Like `.eslintrc` or `.editorconfig`.
- **Gitignored files** = conversation content, dispatch messages, work logs, session state. Dynamic. Potentially sensitive. Like `.bash_history`.

### Red Flags in Public Repos

Before making public, verify no session content leaked into tracked files:

```bash
# Check for dispatch messages or conversation content
git ls-files | xargs grep -l "MSG-\|DISPATCH-\|[A] \[20" 2>/dev/null
# Check for journal entries with session timestamps
git grep "Session started\|Session ended\|What was accomplished" -- "*.md"
```

---

## .gitignore Completeness Checklist

Every professional project commits `.gitignore`. Verify these categories are covered:

### Environment & Secrets
```gitignore
.env
.env.local
.env.*.local
*.pem
*.key
```

### Build Artifacts & Dependencies
```gitignore
node_modules/
.next/
.turbo/
.wrangler/
dist/
out/
__pycache__/
*.pyc
```

### Database & State Files
```gitignore
*.db
*.sqlite
*.db-journal
*.db-wal
.chain_auth
```

### IDE & OS
```gitignore
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
```

### AI Tool Session State
```gitignore
# Claude Code
.claude/dispatch-state.json
.claude/scheduled_tasks.lock
.claude/journal.md
**/.claude/journal.md
**/inbox.md
**/outbox.md
user-prompts.md
prompts.md
compacted.md
compacted-summary.md

# Cursor (session state only — .cursor/rules/ is committed)
.cursorignore

# Aider
.aider.chat.history.md
.aider.tags.cache.v3/
```

### Verification
```bash
# Nothing sensitive tracked
git ls-files "*.env" "*/.env" "*.pem" "*.key" "*.db" "*.sqlite"
# Should return empty
```

---

## Professional Repo Standards (Ethereum/Solana Grade)

Based on research of go-ethereum, Solana/Agave, Cosmos SDK, Bitcoin Core, Facebook/React:

### Repository Hygiene
- **No `.mailmap` in final repo** unless you have 100+ contributors
- **Author identity:** Use GitHub noreply or consistent email across all commits
- **No hardcoded paths** — all paths relative to repo root
- **No provider-specific secrets** in any tracked file, ever
- **`.gitignore` comprehensive** — covers env, deps, build, IDE, OS, AI state
- **Stale branches deleted** — only main + active development branches
- **`.claude/` committed** — skills, settings, rules (industry standard as of 2026)
- **Session state gitignored** — journals, mailboxes, dispatches, transcripts

### Credential Management
- Secrets in `.env` files only (never in code)
- `.env` files in `.gitignore` (never tracked)
- Environment variables read via `os.environ.get()` or `process.env.`
- Public keys (anon, publishable) OK in client-side code if RLS protects data
- Secret keys (service_role, admin) ONLY in server-side env vars

### Pre-Public Checklist (Executive Summary)
1. `git grep` for secrets in tracked files → must be zero
2. `git log --all -S` for secrets in history → must be zero (use filter-repo)
3. `git log --format="%ae" --all | sort -u` → only canonical identities
4. `git branch -a` → only main + active dev branches
5. `git ls-files "*.env"` → must be empty
6. `.gitignore` covers all categories above
7. Session state (journals, mailboxes, transcripts) gitignored
8. README, LICENSE, CONTRIBUTING present

---

## Quick Reference

| What | Where |
|------|-------|
| Supabase keys dashboard | `supabase.com/dashboard/project/<ref>/settings/api-keys` |
| Chain miner secret key | `chain/.env` → `SUPABASE_SERVICE_ROLE_KEY` |
| Monitor publishable key | `web/monitor/js/monitor.js` + `simulator.js` |
| Git filter-repo stale marker | `.git/filter-repo/already_ran` (delete before re-run) |
| Cloudflare deploy (monitor) | `wrangler pages deploy . --project-name=zkagentic-site --branch=main` |
| Force push after rewrite | `git push --force origin exodus-dev main` |
| Industry .claude/ reference | Meta, Ethereum, Vercel, Grafana, Solana all commit `.claude/` |
