# syntax=docker/dockerfile:1
# =============================================================================
# 7MZ Store API — production image
# Multi-stage: workspace build → production runtime with compiled output.
# Build context is the REPO ROOT:  docker build -f apps/api/Dockerfile .
# Debian slim (not Alpine) — most reliable base for Prisma's engines/OpenSSL.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
# openssl + ca-certificates: required by Prisma; curl for healthchecks
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ---- build ------------------------------------------------------------------
FROM base AS build

# Manifests first for layer-cached installs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "@7mz/api..."

# Sources
COPY packages/typescript-config ./packages/typescript-config
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @7mz/shared build \
 && pnpm --filter @7mz/api db:generate \
 && pnpm --filter @7mz/api build

# ---- runtime ------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

# Production-only workspace install. We keep the pnpm workspace layout in the
# final image (instead of `pnpm deploy`) because it is the most reliable path
# for workspace:* dependencies; the size tradeoff is acceptable for this API.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter "@7mz/api..."

# Regenerate the Prisma client in the runtime image so its engine matches this
# platform exactly, then bring in compiled output, schema, and the entrypoint.
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
RUN pnpm --filter @7mz/api db:generate

COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

WORKDIR /repo/apps/api
EXPOSE 4000
# Entrypoint applies pending migrations, then starts the server.
CMD ["./docker-entrypoint.sh"]
