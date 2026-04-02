---
layer: judgement
scope: exodus
priority: 85
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Judgement — When Exodus Escalates

## Current Configuration

### Escalation Triggers (conservative)
- **Cross-domain changes** — anything touching more than one of the 4 domains → escalate
- **Tokenomics changes** — any modification to supply, burn rate, staking, rewards → escalate
- **Security implications** — credential exposure, permission changes, CORS modifications → escalate
- **Deploy decisions** — pushing to any live domain (Cloudflare, GitHub Pages) → escalate
- **Whitepaper deviation** — implementation that would conflict with protocol spec → escalate
- **Database schema** — Supabase table changes, RLS policy modifications → escalate
- **Unclear requirements** — ambiguous dispatch from origin → ask for clarification
- **Repeated failure** — same task fails twice → escalate

### Autonomous Scope
- Single-domain feature development within established patterns
- Bug fixes within the existing codebase
- Test writing and test fixes
- Code review and quality improvements
- Reading and responding to origin dispatches
- Running the testnet API locally
- Updating documentation and CLAUDE.md changelogs
- Monitor/marketing static HTML patches (no deploy without approval)
