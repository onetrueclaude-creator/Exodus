# Deploy — ZK Agentic Network on Fly.io

Turnkey operator runbook for deploying the **game** (Next.js) and the **chain**
(FastAPI testnet) to Fly.io, with **Cloudflare for DNS only**.

> Secrets in this doc are referred to by **name only**. Never commit secret values.
> Set every secret with `fly secrets set NAME=value --app <app>` (encrypted at rest,
> injected as env at runtime). Anything in a `fly.toml` `[env]` block is **public** —
> only non-secret config lives there.

---

## 1. Architecture

```
                          Internet (HTTPS, port 443)
                                   │
                    ┌──────────────┴───────────────┐
                    │  Cloudflare DNS (proxied)     │
                    │  zkagenticnetwork.com  CNAME →│
                    │  <game-app>.fly.dev           │
                    └──────────────┬───────────────┘
                                   │  443 → Fly edge → game internal:3000
                    ┌──────────────▼───────────────┐
                    │  Fly app: GAME  (Next.js)     │   PUBLIC
                    │  apps/game/Dockerfile         │   min_machines_running=1
                    │  server.js (standalone)       │   force_https
                    │                               │
                    │  Browser → /api/chain proxy   │  (client NEVER calls chain
                    │  (server-side fetch)          │   directly; BASE_URL=/api/chain)
                    └──────────────┬───────────────┘
                                   │  TESTNET_API (server-only env)
                                   │  http://<chain-app>.internal:8080
                                   │  Fly PRIVATE 6PN network — no public route
                    ┌──────────────▼───────────────┐
                    │  Fly app: CHAIN (FastAPI)     │   PRIVATE-ONLY
                    │  chain/Dockerfile             │   exactly 1 machine, no autoscale
                    │  uvicorn + in-process miner    │   min/max = 1, no http_service
                    │  SQLite on mounted volume      │   /app/data (volume: chain_data)
                    └────────────────────────────────┘
```

**Invariants (do not violate):**

- **One Fly org, same region** for both apps — `.internal` DNS and 6PN private
  networking only work between apps in the same org; same region keeps it fast.
- **Chain is private-only.** `chain/fly.toml` has **no `[http_service]`** → Fly gives
  it no public IP. It is reachable only at `http://<chain-app>.internal:8080`. The
  game's server proxy (`/api/chain/[...path]`) forwards there using the server-only
  `TESTNET_API` env. The browser uses the relative `/api/chain` path and never sees
  the chain address.
- **Chain is a hard single worker.** Module-global state + an in-process asyncio
  miner mean exactly one always-on machine: `min_machines_running=1`, no autoscale,
  no auto-stop. A second machine would fork chain state.
- **Chain state lives on a volume** (`chain_data` → `/app/data`). Without it the
  SQLite DB is wiped on every restart/redeploy.

---

## 2. Prerequisites

- `flyctl` installed and logged in: `fly auth login`. Confirm the org: `fly orgs list`.
- A Cloudflare zone for `zkagenticnetwork.com` (DNS managed at Cloudflare).
- A Postgres database for the game (Fly Postgres, Supabase, Neon, etc.) → its
  connection string becomes `DATABASE_URL`.
- Supabase project (the chain syncs state snapshots there) → URL + service-role key.
- Google OAuth client (see §7) for the game's Google login.

Pick app names now and use them consistently below (examples used here):
`zkan-chain` (chain) and `zkan-game` (game). Set them in the two `fly.toml` files
(the `app = "..."` line, currently marked `<-- CHANGE ME`) or let `fly launch` set them.

---

## 3. Deploy the CHAIN first

The game needs the chain's `.internal` address, so bring the chain up first.

```bash
cd chain

# 3a. Create/register the app WITHOUT deploying (so we can attach a volume + secrets).
#     Accept Fly's detection of the Dockerfile; decline any DB/Redis it offers.
fly launch --no-deploy --copy-config --name zkan-chain --region iad
#     --copy-config keeps chain/fly.toml (single-machine, private-only, volume).
#     If `fly launch` rewrites fly.toml, re-check: NO [http_service], [mounts] present.

# 3b. Create the persistent volume (same region as the app). Do this ONCE.
fly volumes create chain_data --size 1 --region iad --app zkan-chain

# 3c. Set chain secrets (NAMES only shown; supply your real values).
fly secrets set --app zkan-chain \
  ADMIN_TOKEN=...                 \  # random high-entropy token; MUST equal the game's CHAIN_ADMIN_TOKEN
  SUPABASE_URL=...                \  # Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY=...      # Supabase service-role key (server-only, never client)
#     Non-secret config is already in chain/fly.toml [env]:
#       ENVIRONMENT=production, DB_PATH=/app/data/testnet_state.db, PORT=8080
#     ALLOWED_ORIGINS is optional (CORS only; game proxies server-side). For
#     defence-in-depth set it as a secret/env to the public game origin:
fly secrets set --app zkan-chain ALLOWED_ORIGINS=https://zkagenticnetwork.com

# 3d. Deploy.
fly deploy --app zkan-chain

# 3e. Pin to exactly ONE machine (no autoscaling). Verify.
fly scale count 1 --app zkan-chain
fly status --app zkan-chain          # expect exactly 1 machine, started, in <region>

# 3f. First-boot genesis: on a FRESH volume the DB does not exist, so genesis runs
#     automatically on boot (see chain/CLAUDE.md "Genesis runs fresh on first boot").
#     Verify the chain is alive over the private net from the game later (§5),
#     or via SSH now:
fly ssh console --app zkan-chain -C "python3 -c \"import urllib.request,sys; \
  print(urllib.request.urlopen('http://localhost:8080/api/status').read().decode())\""
```

The chain's private address is now `zkan-chain.internal` (port 8080). Note it for §4.

---

## 4. Deploy the GAME

```bash
# 4a-4c (register / secrets / migrate) don't build, so run them from apps/game
# for convenience. 4d (fly deploy) BUILDS and must use the REPO ROOT as context
# (apps/game is a pnpm-workspace member → Next nests the standalone output;
# building from apps/game crashes on boot) — it cd's back out first.
cd apps/game

# 4a. Register the app in the SAME org/region as the chain (do not deploy yet).
fly launch --no-deploy --copy-config --name zkan-game --region iad

# 4b. Set game secrets (NAMES only; supply real values).
fly secrets set --app zkan-game \
  DATABASE_URL=...               \  # Postgres connection string (e.g. postgres://...sslmode=require)
  AUTH_SECRET=...                \  # NextAuth session secret: `openssl rand -base64 32`
  AUTH_GOOGLE_ID=...             \  # Google OAuth client ID
  AUTH_GOOGLE_SECRET=...         \  # Google OAuth client secret
  CHAIN_ADMIN_TOKEN=...          \  # MUST EQUAL the chain's ADMIN_TOKEN (admin chain calls)
  FOUNDER_EMAILS=...             \  # comma-separated emails granted FOUNDER role
  TESTNET_API=http://zkan-chain.internal:8080   # server-only; the chain's PRIVATE address
#     Non-secret config is in apps/game/fly.toml [env]: PORT=3000, NODE_ENV=production,
#     AUTH_TRUST_HOST=true (required behind Fly's proxy — see §8). If you prefer,
#     set AUTH_URL=https://zkagenticnetwork.com as a secret instead of AUTH_TRUST_HOST.

# 4c. Run database migrations against the production DB (one-off, from your machine
#     using the SAME DATABASE_URL value you set above):
DATABASE_URL='<prod-url>' npx prisma migrate deploy
#     (Prisma 7 + prisma-client generator + @prisma/adapter-pg — no engine binary.
#      `migrate deploy` applies committed migrations; it does not generate new ones.)

# 4d. Deploy. BUILD CONTEXT = REPO ROOT: cd back out, then point flyctl at the
#     game config. (`fly deploy .` makes the repo root the Docker context so Next
#     sees pnpm-workspace.yaml/turbo.json and nests the standalone output, which
#     is what apps/game/Dockerfile expects.)
cd ..
fly deploy . --config apps/game/fly.toml --app zkan-game

# 4e. Smoke test the public app.
fly status --app zkan-game
curl -I https://zkan-game.fly.dev/        # expect HTTP 200 (landing page)
```

---

## 5. Verify game ↔ chain over the private network

```bash
# From inside the GAME machine, reach the chain over .internal (proves the wiring):
fly ssh console --app zkan-game -C "node -e \"fetch('http://zkan-chain.internal:8080/api/status') \
  .then(r=>r.text()).then(t=>console.log(t)).catch(e=>{console.error(e);process.exit(1)})\""
# Expect the chain's JSON status. Then exercise the public proxy path:
curl -s https://zkan-game.fly.dev/api/chain/status   # game proxy → chain → JSON
```

If the proxy returns chain data, the architecture is wired correctly.

---

## 6. Cloudflare DNS (DNS only)

Point the apex / chosen hostname at the **game** app (the chain has no DNS — it's
private). First get a cert on Fly, then add the Cloudflare record.

```bash
fly certs add zkagenticnetwork.com --app zkan-game
fly certs show zkagenticnetwork.com --app zkan-game   # shows the DNS challenge / target
```

In the Cloudflare dashboard for the `zkagenticnetwork.com` zone:

1. Add a **CNAME**: `zkagenticnetwork.com` (or `@`) → `zkan-game.fly.dev`.
   - For an apex CNAME, Cloudflare CNAME-flattening handles it.
   - Add `www` → `zkan-game.fly.dev` too if you want www.
2. Set proxy status to **Proxied (orange cloud)** — DNS + Cloudflare edge. Fly's own
   TLS terminates after; `force_https` is on. (If cert validation stalls behind the
   proxy, temporarily switch to **DNS only / grey cloud** until `fly certs show`
   reports the cert is issued, then re-enable proxy.)
3. Add any `_acme-challenge` / verification record `fly certs show` asks for.
4. Re-run `fly certs show zkagenticnetwork.com --app zkan-game` until it reads
   **Issued**. Then `curl -I https://zkagenticnetwork.com/` → expect 200.

---

## 7. Google OAuth redirect URI

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 client:

- **Authorized redirect URI:**
  `https://zkagenticnetwork.com/api/auth/callback/google`
- **Authorized JavaScript origin:** `https://zkagenticnetwork.com`

The client ID/secret are the `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` secrets (§4b).
If you also test via the raw Fly hostname, add
`https://zkan-game.fly.dev/api/auth/callback/google` as a second redirect URI.

---

## 8. Secrets & config reference

**Game (`zkan-game`)** — secrets via `fly secrets set`:

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Postgres connection string (Prisma) |
| `AUTH_SECRET` | NextAuth v5 session/JWT secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `TESTNET_API` | **Server-only.** Chain private URL: `http://zkan-chain.internal:8080` |
| `CHAIN_ADMIN_TOKEN` | Token for admin chain calls — **must equal chain `ADMIN_TOKEN`** |
| `FOUNDER_EMAILS` | Comma-separated emails granted the FOUNDER role |

Game non-secret config (already in `apps/game/fly.toml [env]`): `PORT=3000`,
`NODE_ENV=production`, `AUTH_TRUST_HOST=true`.

> **`AUTH_TRUST_HOST`** is required: NextAuth v5 runs behind Fly's proxy and throws
> `UntrustedHost` on every `/api/auth/*` call without it (observed in standalone logs
> during verification). Alternative: set `AUTH_URL=https://zkagenticnetwork.com` secret.

**Chain (`zkan-chain`)** — secrets via `fly secrets set`:

| Name | Purpose |
|------|---------|
| `ADMIN_TOKEN` | Gates `/api/reset` + `/api/automine` — **must equal game `CHAIN_ADMIN_TOKEN`** |
| `SUPABASE_URL` | Supabase project URL (state-snapshot sync) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only) |
| `ALLOWED_ORIGINS` | CORS origins; set to `https://zkagenticnetwork.com` (defence-in-depth) |

Chain non-secret config (already in `chain/fly.toml [env]`): `ENVIRONMENT=production`,
`DB_PATH=/app/data/testnet_state.db`, `PORT=8080`.

---

## 9. Chain state reset (first boot & re-genesis)

- **Fresh volume:** no DB file exists → **genesis runs automatically on first boot**.
  Nothing to do. (Ref: `chain/CLAUDE.md` → "Genesis runs fresh on first boot".)
- **Stale/incompatible state on the volume** (e.g. an older protocol revision left a
  DB): reset before serving. Two ways:

  ```bash
  # A) Wipe the volume's DB file, then restart (genesis rebuilds it):
  fly ssh console --app zkan-chain -C "rm -f /app/data/testnet_state.db /app/data/testnet_state.db-*"
  fly apps restart zkan-chain

  # B) Admin endpoint (no SSH) — uses the ADMIN_TOKEN you set:
  fly ssh console --app zkan-chain -C "python3 -c \"import urllib.request as u; \
    req=u.Request('http://localhost:8080/api/reset', method='POST', \
    headers={'Authorization':'Bearer <ADMIN_TOKEN>'}); print(u.urlopen(req).read().decode())\""
  ```

  This is lossless beyond the testnet's own data (nothing on mainnet / marketing /
  docs depends on it). Participants with prior claims re-onboard from scratch.

---

## 10. ⚠️ What you (the operator) MUST verify

These could **not** be verified in the build environment (no `docker`, no `flyctl`)
and depend on live infra / secrets. Check each before declaring the deploy done:

1. **`docker build` of the game image actually completes on Fly's builder.** The
   Node build + `npm run build` standalone output were verified locally and the
   standalone server boots and serves HTTP 200 — but the *Docker image build itself*
   was not run here. Watch the first `fly deploy . --config apps/game/fly.toml
   --app zkan-game` (repo-root context) build logs.
2. **Monorepo standalone layout copied correctly.** The Dockerfile copies
   `.next/standalone` (nested as `apps/game/server.js`) and overlays static/public
   into the nested dir. If Next changes its nesting, the `COPY` paths in
   `apps/game/Dockerfile` may need adjusting. Confirm the container starts and
   `/` returns 200.
3. **Prisma client bundling.** The generated client (pure TS via `prisma-client`
   generator) is compiled into `.next/server`; `@prisma/client` + `pg` are traced
   into the standalone `node_modules`. Confirm no `PrismaClient`/module-not-found
   errors at runtime in `fly logs --app zkan-game`.
4. **`prisma migrate deploy` succeeded** against the prod `DATABASE_URL` and the
   schema is live (Users/Accounts/Sessions tables exist).
5. **`.internal` reachability** (§5) — game machine can reach
   `http://zkan-chain.internal:8080`. Same org + same region required.
6. **Exactly one chain machine** (`fly status --app zkan-chain` → 1 machine) and the
   volume is attached (`fly volumes list --app zkan-chain`).
7. **Chain is NOT publicly reachable** — `fly ips list --app zkan-chain` should show
   no public IP; an external `curl https://zkan-chain.fly.dev/api/status` must NOT
   return chain data.
8. **Google OAuth round-trip** works end-to-end on `https://zkagenticnetwork.com`
   (login → `/onboard`), and **`AUTH_TRUST_HOST`/`AUTH_URL`** removed the
   `UntrustedHost` error.
9. **`CHAIN_ADMIN_TOKEN` (game) == `ADMIN_TOKEN` (chain)** — admin-gated chain
   actions from the game succeed.
10. **Cloudflare proxy + Fly cert** coexist (cert shows *Issued*; HTTPS works with
    the orange cloud on).
11. **Chain block production** — after boot, the in-process miner advances blocks
    (`/api/status` block height increases over time).
```

---

## Quick command index

```bash
# Chain
cd chain && fly launch --no-deploy --copy-config --name zkan-chain --region iad
fly volumes create chain_data --size 1 --region iad --app zkan-chain
fly secrets set --app zkan-chain ADMIN_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ALLOWED_ORIGINS=https://zkagenticnetwork.com
fly deploy --app zkan-chain && fly scale count 1 --app zkan-chain

# Game  (register/secrets/migrate from apps/game; DEPLOY from the REPO ROOT)
cd apps/game && fly launch --no-deploy --copy-config --name zkan-game --region iad
fly secrets set --app zkan-game DATABASE_URL=... AUTH_SECRET=... AUTH_GOOGLE_ID=... AUTH_GOOGLE_SECRET=... CHAIN_ADMIN_TOKEN=... FOUNDER_EMAILS=... TESTNET_API=http://zkan-chain.internal:8080
DATABASE_URL='<prod-url>' npx prisma migrate deploy
cd .. && fly deploy . --config apps/game/fly.toml --app zkan-game   # context = REPO ROOT
fly certs add zkagenticnetwork.com --app zkan-game
```
