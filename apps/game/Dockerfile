# syntax=docker/dockerfile:1
#
# ZK Agentic Network — Game UI (Next.js 16, output: 'standalone')
# ---------------------------------------------------------------
# Build context MUST be apps/game (this directory). apps/game is a SELF-CONTAINED
# npm project: it has its own package-lock.json and imports NO workspace package
# (packages/lattice-core is unused). So we do NOT need the monorepo root to build.
#
#   docker build -t zkan-game apps/game        # context = apps/game
#   (Fly does this for you via apps/game/fly.toml: build.dockerfile = "Dockerfile")
#
# Prisma 7 with the `prisma-client` generator (NOT the legacy `prisma-client-js`)
# emits pure TypeScript to src/generated/prisma; combined with @prisma/adapter-pg
# there is NO Rust query-engine binary to copy (no binaryTargets / openssl concerns).
# `prisma generate` MUST run before `next build` so the client exists and Next's
# file-tracing bundles it into .next/standalone.
#
# IMPORTANT — monorepo standalone layout: because workspace-root markers
# (pnpm-workspace.yaml / turbo.json) live above this dir, Next nests the standalone
# output as .next/standalone/apps/game/ (server.js is there, not at the root).
# This Dockerfile copies the whole standalone tree and overlays static/public into
# that nested path, then runs from it. (Verified empirically — boots, serves 200.)

# ---- Stage 1: deps ----------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Only the manifests first → cache the install layer across source changes.
COPY package.json package-lock.json ./
# Deterministic install from the lockfile.
RUN npm ci --no-audit --no-fund

# ---- Stage 2: build ---------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
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
# server.js binds this; Fly sets PORT, but default for plain `docker run`.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root runtime user.
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

# The standalone bundle ships its own minimal node_modules (incl. @prisma/client,
# pg, the driver adapter) — no `npm install` needed in this stage.
# Nested monorepo layout: everything lives under .next/standalone/apps/game/.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public/ are NOT in the standalone tree — overlay them into the
# nested app dir, right next to server.js (server.js does process.chdir(__dirname)).
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./apps/game/.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./apps/game/public

USER nextjs
EXPOSE 3000

# server.js lives in the nested app dir and chdir()s to itself on boot.
WORKDIR /app/apps/game
CMD ["node", "server.js"]
