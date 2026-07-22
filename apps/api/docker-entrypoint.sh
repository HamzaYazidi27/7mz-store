#!/bin/sh
# =============================================================================
# 7MZ Store API — container entrypoint
# Applies pending database migrations and seeds initial data (idempotent —
# only populates an empty database), then starts the API. Runs in the app's
# own workspace so Prisma resolves from local node_modules (no pnpm filter).
# =============================================================================
set -e

cd /repo/apps/api

echo "→ Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "→ Seeding initial data (skips if already populated)..."
node_modules/.bin/tsx prisma/seed.ts || echo "⚠ seed step skipped/failed (non-fatal) — continuing"

echo "→ Starting 7MZ Store API..."
exec node dist/main.js
