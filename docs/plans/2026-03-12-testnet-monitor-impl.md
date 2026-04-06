# Testnet Monitor Dashboard — Implementation Plan


**Goal:** Build a public real-time blockchain monitoring dashboard for zkagentic.ai

**Architecture:** Single-page static HTML reading from Supabase Realtime (chain_status, agents tables). Glass-card stat layout with hero block height, live/stale/offline indicator, and embedded Streamlit tokenomics simulator tab. Deployed to existing Cloudflare Pages.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS CDN client (@supabase/supabase-js@2), existing compiled Tailwind CSS

**Design doc:** `docs/plans/2026-03-12-testnet-monitor-design.md`

---

### Task 1: Add Anonymous Read RLS Policies

**Context:** The dashboard is public (no login). Supabase anon key maps to `anon` role which currently has no read access to `chain_status` or `agents`.

**Step 1: Run SQL in Supabase Dashboard → SQL Editor**

```sql
-- Allow anonymous reads on chain_status (singleton row, public data)
CREATE POLICY "public can read chain_status"
  ON public.chain_status FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous reads on agents (node count, aggregate staking data)
CREATE POLICY "public can read agents"
  ON public.agents FOR SELECT
  TO anon
  USING (true);
```

**Step 2: Verify in Supabase Dashboard → Table Editor**

- Switch to "anon" role in the table viewer
- Confirm `chain_status` rows are visible
- Confirm `agents` rows are visible

**Step 3: Update local migration file for reference**

File: `supabase/migrations/20260312000002_monitor_rls.sql`

Save the same SQL above so the migration history stays consistent.

**Step 4: Commit**

```bash
git add supabase/migrations/20260312000002_monitor_rls.sql
git commit -m "feat(db): add anon read policies for testnet monitor dashboard"
```

---

### Task 2: Create Dashboard HTML

**Files:**
- Create: `ZkAgentic/projects/web/zkagentic-monitor/index.html`
- Reference: `ZkAgentic/projects/web/zkagentic-deploy/staking.html` (for CSS classes and structure)

**Step 1: Create the directory**

```bash
mkdir -p ZkAgentic/projects/web/zkagentic-monitor/js
mkdir -p ZkAgentic/projects/web/zkagentic-monitor/logos
```

**Step 2: Copy shared assets from the .com site**

```bash
cp ZkAgentic/projects/web/zkagentic-deploy/logos/icon.svg ZkAgentic/projects/web/zkagentic-monitor/logos/
cp ZkAgentic/projects/web/zkagentic-deploy/logos/logo-mini.svg ZkAgentic/projects/web/zkagentic-monitor/logos/
cp ZkAgentic/projects/web/zkagentic-deploy/favicon.ico ZkAgentic/projects/web/zkagentic-monitor/
cp ZkAgentic/projects/web/zkagentic-deploy/_next/static/chunks/35eb57da504c74ac.css ZkAgentic/projects/web/zkagentic-monitor/styles.css
```

**Step 3: Write index.html**

Structure (all safe DOM — no innerHTML):
- `<head>`: meta tags, link to `styles.css`, inline `<style>` for dashboard-specific rules
- Header: logo + "ZK Agentic Chain — Testnet Monitor" + live dot `<span id="live-dot">`
- Hero section: `<div id="hero-block">` (block height), `<div id="hero-subtitle">` (epoch + state root)
- Stat card grid (2 rows, 3+2 columns):
  - Row 1: Mining (`id="card-mining"`), Network (`id="card-network"`), Block Production (`id="card-blocks"`)
  - Row 2: Staking (`id="card-staking"`), Epoch (`id="card-epoch"`)
- Tab bar: Dashboard (active) | Tokenomics Simulator
- Simulator container: `<div id="simulator-container" style="display:none">` with iframe
- Footer status bar: `<span id="last-updated">` + `<span id="testnet-status">`
- Scripts: Supabase CDN + `js/monitor.js`

**Inline CSS additions** (beyond existing Tailwind):
```css
.hero-number { font-size: 5rem; font-family: monospace; font-weight: 700; color: white; }
.pill-header { display: inline-block; padding: 2px 12px; border: 1px solid #22d3ee; border-radius: 9999px; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: #22d3ee; margin-bottom: 0.75rem; }
.stat-value { font-size: 1.5rem; font-family: monospace; font-weight: 600; color: white; }
.stat-label { font-size: 0.75rem; text-transform: uppercase; color: #9ca3af; }
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.card-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.tab-active { border-bottom: 2px solid #22d3ee; color: #22d3ee; }
.tab-inactive { color: #9ca3af; }
.dot-live { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; display: inline-block; }
.dot-stale { background: #eab308; }
.dot-offline { background: #ef4444; }
@media (max-width: 768px) { .card-grid, .card-grid-2 { grid-template-columns: 1fr; } .hero-number { font-size: 3rem; } }
```

**Step 4: Verify locally**

```bash
cd ZkAgentic/projects/web/zkagentic-monitor && python3 -m http.server 8889
```

Open `http://localhost:8889` — should see the layout with placeholder values.

**Step 5: Commit**

```bash
git add -f ZkAgentic/projects/web/zkagentic-monitor/
git commit -m "feat(monitor): dashboard HTML layout with stat cards and tab nav"
```

---

### Task 3: Create monitor.js — Supabase Client + Realtime

**Files:**
- Create: `ZkAgentic/projects/web/zkagentic-monitor/js/monitor.js`
- Reference: `ZkAgentic/projects/web/zkagentic-deploy/js/waitlist.js` (for Supabase client pattern)

**Step 1: Write monitor.js**

The script must:

1. Initialize Supabase client (CDN, anon key — same as waitlist.js)
2. `fetchChainStatus()` — query `chain_status` table (`.single()`), update DOM:
   - `#hero-block` → `blocks_processed` (formatted with commas)
   - `#hero-subtitle` → `Epoch Ring {epoch_ring} · State: {state_root.slice(0,10)}...`
   - `#card-mining` → `total_mined` AGNTC
   - `#card-blocks` → `next_block_in` seconds countdown
   - `#last-updated` → "Last updated: just now"
3. `fetchAgents()` — query `agents` table, compute aggregates:
   - `#card-network` → agent count + total_claims from chain_status
   - `#card-staking` → sum of `staked_cpu`
   - `#card-epoch` → epoch_ring, hardness (16 * epoch_ring), progress
4. `subscribeRealtime()` — subscribe to `chain_status` changes:
   - On update → call `updateChainStatus(payload.new)`
   - Reset heartbeat timer
5. Heartbeat logic:
   - `lastUpdateTime` variable, checked every 10s
   - Update `#live-dot` class and `#testnet-status` text based on staleness
6. Tab switching:
   - `switchTab('dashboard')` / `switchTab('simulator')` — toggle visibility
   - Lazy-load simulator iframe `src` only when tab is first activated
7. All DOM updates via `textContent` — no innerHTML (security hook)

**Step 2: Verify locally**

Open `http://localhost:8889` — should see real data from Supabase populating the cards. Console should show Realtime subscription connected.

**Step 3: Commit**

```bash
git add -f ZkAgentic/projects/web/zkagentic-monitor/js/monitor.js
git commit -m "feat(monitor): Supabase Realtime client with live/stale/offline indicator"
```

---

### Task 4: Deploy to Cloudflare Pages

**Context:** zkagentic.ai already points to Cloudflare Pages via `zkagentic-site.pages.dev`. We need to update the Cloudflare Pages project to serve from the new monitor directory, or push to the existing repo.

**Step 1: Check existing Cloudflare Pages setup**

Determine whether the `zkagentic-site` Cloudflare Pages project pulls from the `zkagentic-site` GitHub repo. If so, push the monitor files there.

**Step 2: Push monitor files to the deployment repo**

Option A (if Cloudflare Pages pulls from `zkagentic-site` repo):
```bash
cd /tmp && rm -rf zkagentic-site-deploy && mkdir zkagentic-site-deploy
cp -r ZkAgentic/projects/web/zkagentic-monitor/* /tmp/zkagentic-site-deploy/
echo "zkagentic.ai" > /tmp/zkagentic-site-deploy/CNAME
# Add .nojekyll, .gitignore, README.md, LICENSE (same pattern as .com repo)
cd /tmp/zkagentic-site-deploy && git init && git remote add origin https://github.com/onetrueclaude-creator/zkagentic-site.git
git add -A && git commit -m "deploy: testnet monitor dashboard for zkagentic.ai"
git push origin main --force
```

Option B (if Cloudflare Pages uses direct upload):
Use `wrangler pages deploy` or the Cloudflare dashboard to upload the files.

**Step 3: Verify deployment**

```bash
curl -s https://zkagentic.ai | head -20
```

Should show the monitor dashboard HTML.

**Step 4: Commit deployment config**

```bash
git commit -m "deploy: testnet monitor live on zkagentic.ai"
```

---

### Task 5: Test End-to-End

**Step 1: Open https://zkagentic.ai in browser**

Verify:
- [ ] Hero block height shows real number from Supabase
- [ ] Stat cards populated with real data
- [ ] Live indicator shows green dot (if testnet running) or appropriate status
- [ ] "Last updated: Xs ago" increments correctly
- [ ] Tokenomics Simulator tab loads Streamlit iframe
- [ ] Dashboard tab switches back correctly
- [ ] Mobile responsive — cards stack on narrow viewport
- [ ] No console errors

**Step 2: Test staleness**

- Wait 2+ minutes without testnet producing blocks
- Live dot should transition to yellow "STALE"
- "Last updated" should show minutes

**Step 3: Hotfix any issues found**

Fix in source → copy to deploy repo → push → verify.
