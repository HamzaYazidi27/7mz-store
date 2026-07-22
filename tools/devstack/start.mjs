#!/usr/bin/env node
/**
 * 7MZ Store — local development stack (no Docker required).
 *
 * Boots an embedded PostgreSQL server (official binaries shipped via npm)
 * and, when available on PATH, a local Redis server. Intended for local
 * development and CI; production uses Docker Compose (postgres + redis).
 *
 * Usage:  node start.mjs            # boots and keeps running
 *         DEVSTACK_PG_PORT=5432 DEVSTACK_DB=sevenmz node start.mjs
 */

import { mkdirSync, existsSync, readFileSync, symlinkSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import EmbeddedPostgres from "embedded-postgres";

/**
 * npm strips symlinks from packages, so @embedded-postgres/linux-x64 ships a
 * `pg-symlinks.json` manifest instead (libpq.so.5 → libpq.so.5.18, …). Its
 * postinstall normally materializes them, but strict installers (pnpm with
 * blocked build scripts, some CI) skip it — so we do it here, idempotently,
 * and export LD_LIBRARY_PATH for every Postgres child process.
 */
function locatePlatformPackage() {
  const require = createRequire(import.meta.url);
  const platformPkg = `@embedded-postgres/${process.platform}-${process.arch}`;
  // Resolve through embedded-postgres's own module scope (pnpm strict layout).
  const scoped = createRequire(require.resolve("embedded-postgres"));
  let dir = path.dirname(scoped.resolve(platformPkg));
  for (let i = 0; i < 4; i += 1) {
    if (existsSync(path.join(dir, "native"))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`Could not locate ${platformPkg} native directory`);
}

function preparePostgresBinaries() {
  const pkgRoot = locatePlatformPackage();
  const manifestPath = path.join(pkgRoot, "native", "pg-symlinks.json");

  if (existsSync(manifestPath)) {
    const links = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const { source, target } of links) {
      const targetAbs = path.join(pkgRoot, ...target.split("/"));
      const sourceRel = path.basename(source); // same directory → relative link
      if (!existsSync(targetAbs)) {
        try {
          symlinkSync(sourceRel, targetAbs);
        } catch {
          /* concurrent create or read-only fs — a later existsSync check covers us */
        }
      }
    }
  }

  const libDir = path.join(pkgRoot, "native", "lib");
  process.env.LD_LIBRARY_PATH = [libDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
  return libDir;
}

const PG_PORT = Number(process.env.DEVSTACK_PG_PORT ?? 5432);
const PG_USER = process.env.DEVSTACK_PG_USER ?? "postgres";
const PG_PASSWORD = process.env.DEVSTACK_PG_PASSWORD ?? "postgres";
const DB_NAME = process.env.DEVSTACK_DB ?? "sevenmz";
const REDIS_PORT = Number(process.env.DEVSTACK_REDIS_PORT ?? 6379);
const DATA_DIR = path.resolve(process.env.DEVSTACK_DATA_DIR ?? "./.data/pg");

async function main() {
  preparePostgresBinaries();
  mkdirSync(path.dirname(DATA_DIR), { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: PG_USER,
    password: PG_PASSWORD,
    port: PG_PORT,
    persistent: true,
  });

  const freshCluster = !existsSync(path.join(DATA_DIR, "PG_VERSION"));
  if (freshCluster) {
    console.log(`[devstack] initializing PostgreSQL cluster at ${DATA_DIR} ...`);
    await pg.initialise();
  }

  console.log(`[devstack] starting PostgreSQL on :${PG_PORT} ...`);
  await pg.start();

  if (freshCluster) {
    console.log(`[devstack] creating database "${DB_NAME}" ...`);
    await pg.createDatabase(DB_NAME);
  }
  console.log(`[devstack] ✅ PostgreSQL ready → postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${DB_NAME}`);

  // ------------------------------------------------------------------ Redis
  let redisProc = null;
  const redisBin = process.env.DEVSTACK_REDIS_BIN ?? findOnPath("redis-server");
  if (redisBin) {
    console.log(`[devstack] starting Redis (${redisBin}) on :${REDIS_PORT} ...`);
    redisProc = spawn(redisBin, ["--port", String(REDIS_PORT), "--save", "", "--appendonly", "no"], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    console.log(`[devstack] ✅ Redis ready → redis://localhost:${REDIS_PORT}`);
  } else {
    console.log("[devstack] ⚠ redis-server not found on PATH — API runs with cache pass-through");
  }

  const shutdown = async (signal) => {
    console.log(`\n[devstack] ${signal} — shutting down ...`);
    if (redisProc) redisProc.kill("SIGTERM");
    await pg.stop().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // Keep the process alive.
  setInterval(() => undefined, 1 << 30);
}

function findOnPath(bin) {
  try {
    return execSync(`command -v ${bin}`, { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error("[devstack] fatal:", err);
  process.exit(1);
});
