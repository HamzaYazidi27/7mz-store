import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 CLI configuration — the runtime client connects through the
 * PrismaPg driver adapter (see src/prisma/prisma.service.ts); this file
 * gives the CLI (migrate / studio / db push) its connection and seed command.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
