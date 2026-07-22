# syntax=docker/dockerfile:1
# =============================================================================
# 7MZ Store Admin — production image (Next.js 16 standalone)
# Build context is the REPO ROOT:  docker build -f apps/admin/Dockerfile .
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
ARG NEXT_PUBLIC_BOT_USERNAME
ARG NEXT_PUBLIC_DEV_MODE=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_BOT_USERNAME=$NEXT_PUBLIC_BOT_USERNAME \
    NEXT_PUBLIC_DEV_MODE=$NEXT_PUBLIC_DEV_MODE

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile --filter "@7mz/admin..."

COPY packages/typescript-config ./packages/typescript-config
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/admin ./apps/admin

RUN pnpm --filter @7mz/shared build \
 && pnpm --filter @7mz/admin build

# ---- runtime ------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0
WORKDIR /repo

COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public

EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
