# syntax=docker/dockerfile:1
# =============================================================================
# 7MZ Store Mini App — production image (Next.js 16 standalone output)
# Build context is the REPO ROOT:  docker build -f apps/miniapp/Dockerfile .
# NEXT_PUBLIC_* must be present at BUILD time (Next inlines them), so they are
# declared as ARGs and Railway passes the matching service variables in.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# ---- build ------------------------------------------------------------------
FROM base AS build

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DEV_MODE=false
ARG NEXT_PUBLIC_BOT_USERNAME
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_DEV_MODE=$NEXT_PUBLIC_DEV_MODE \
    NEXT_PUBLIC_BOT_USERNAME=$NEXT_PUBLIC_BOT_USERNAME

# Manifests first for layer-cached installs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/miniapp/package.json apps/miniapp/
RUN pnpm install --frozen-lockfile --filter "@7mz/miniapp..."

# Sources
COPY packages/typescript-config ./packages/typescript-config
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/miniapp ./apps/miniapp

RUN pnpm --filter @7mz/shared build \
 && pnpm --filter @7mz/miniapp build

# ---- runtime ------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /repo

# Next standalone bundle (traced monorepo root) + static assets + public files
COPY --from=build /repo/apps/miniapp/.next/standalone ./
COPY --from=build /repo/apps/miniapp/.next/static ./apps/miniapp/.next/static
COPY --from=build /repo/apps/miniapp/public ./apps/miniapp/public

EXPOSE 3000
CMD ["node", "apps/miniapp/server.js"]
