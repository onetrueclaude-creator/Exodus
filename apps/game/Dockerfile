# syntax=docker/dockerfile:1
#
# ZK Agentic Network — Game UI (Next.js 16, output: 'standalone')
# ---------------------------------------------------------------
# BUILD CONTEXT = REPO ROOT (two levels above this file), NOT apps/game.
#
# Why: apps/game is a pnpm-workspace member — pnpm-workspace.yaml + turbo.json
# live at the repo root. Next's standalone file-tracing auto-detects that
# workspace root and NESTS the output as:
#     .next/standalone/apps/game/server.js          (NOT a flat .../server.js)
# The runner stage below is built for that nested layout, so the build MUST run
# with the repo root as context — otherwise Next can't see the workspace markers,
# falls back to a flat .next/standalone/server.js, and the runner's
# `WORKDIR /app/apps/game` + `node server.js` points at a path that doesn't exist
# → boot crash (Cannot find module '/app/apps/game/server.js').
#
# Fly has NO `[build] context` key (flyctl's Build config supports only
# dockerfile / ignorefile / build-target / ...). Set the context via the deploy
# working-directory argument, run from the REPO ROOT:
#     fly deploy . --config apps/game/fly.toml --app zkan-game
# `--config` and the fly.toml `dockerfile = "apps/game/Dockerfile"` are resolved
# relative to that repo-root context; .dockerignore is read from the repo root
# (see the root .dockerignore). See DEPLOY.md §4.
#
# Prisma 7 with the `prisma-client` generator (NOT legacy `prisma-client-js`)
# emits pure TypeScript to apps/game/src/generated/prisma; combined with
# @prisma/adapter-pg there is NO Rust query-engine binary to copy (no
# binaryTargets / openssl concerns). `prisma generate` MUST run before
# `next build` so the client exists and Next's file-tracing bundles it.

# ---- Stage 1: deps ----------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app/apps/game
# Only the manifests first → cache the install layer across source changes.
# apps/game is self-contained (own package-lock.json, imports no workspace pkg),
# so a local `npm ci` here installs everything the build needs.
COPY apps/game/package.json apps/game/package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- Stage 2: build ---------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Copy the WHOLE repo (context = repo root) so Next sees the workspace-root
# markers (pnpm-workspace.yaml / turbo.json) above apps/game and nests the
# standalone output. node_modules / .next / .env are excluded via .dockerignore.
COPY . .
# Overlay the cached install (kept out of the COPY above by .dockerignore).
COPY --from=deps /app/apps/game/node_modules ./apps/game/node_modules
WORKDIR /app/apps/game
# Generate the Prisma client (pure TS, no engine binary) BEFORE next build so
# file-tracing pulls @prisma/client + the generated client into the bundle.
# prisma.config.ts loads dotenv; DATABASE_URL is not needed to *generate*, but a
# dummy keeps any config that reads it happy. No live DB is contacted at build.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate
# Build the standalone server. No live DB / secrets needed to compile; a dummy
# DATABASE_URL + AUTH_SECRET satisfy module-load-time reads during page collection.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    AUTH_SECRET="build-time-placeholder-not-used-at-runtime" \
    npm run build

# ---- Stage 3: runner --------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js binds these; Fly sets PORT, but keep a default for plain `docker run`.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root runtime user.
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

# Nested-monorepo standalone layout (tracing root = repo root):
#     .next/standalone/apps/game/server.js   ← entry (chdir()s to its own dir)
#     .next/standalone/apps/game/.next/...    ← server chunks + required-server-files
#     .next/standalone/apps/game/node_modules ← traced deps (incl @prisma/client, pg)
# Copy the whole standalone tree into /app, so server.js lands at
# /app/apps/game/server.js with its node_modules right beside it.
COPY --from=build --chown=nextjs:nodejs /app/apps/game/.next/standalone ./
# Static assets and public/ are NOT traced into standalone — overlay them into the
# nested app dir, right next to server.js (server.js does process.chdir(__dirname)).
COPY --from=build --chown=nextjs:nodejs /app/apps/game/.next/static ./apps/game/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/game/public ./apps/game/public

USER nextjs
EXPOSE 3000

# server.js lives in the nested app dir and chdir()s to itself on boot.
WORKDIR /app/apps/game
CMD ["node", "server.js"]
