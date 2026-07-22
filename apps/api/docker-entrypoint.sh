#!/bin/sh
# =============================================================================
# 7MZ Store API — container entrypoint
# Applies pending database migrations, then starts the API. Runs in the app's
# own workspace so Prisma resolves from local node_modules (no pnpm filter).
# =============================================================================
set -e

cd /repo/apps/api

echo "→ Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "→ Starting 7MZ Store API..."
exec node dist/main.js
