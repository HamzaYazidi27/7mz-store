# syntax=docker/dockerfile:1
# =============================================================================
# 7MZ Store API — production image
# Multi-stage: workspace build → production runtime with compiled output.
# Build context is the REPO ROOT:  docker build -f apps/api/Dockerfile .
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
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

# Compiled output + schema (for `prisma migrate deploy` at release time)
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
