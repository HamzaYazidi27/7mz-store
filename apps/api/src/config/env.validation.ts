import { z } from "zod";

/**
 * Environment validation — the API refuses to boot with an invalid
 * configuration. Optional blocks (payments, storage, SMTP) degrade
 * gracefully: their gateways report as unavailable instead of crashing.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // --- Core infrastructure -------------------------------------------------
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  // --- Auth ---------------------------------------------------------------
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15m
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000), // 30d
  /** 32-byte hex key for AES-256-GCM encryption of stock content / secrets. */
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex chars (32 bytes)"),

  // --- Telegram -----------------------------------------------------------
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  /** Dev-only: accept unsigned initData for local testing outside Telegram. */
  AUTH_DEV_BYPASS: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // --- URLs & CORS ----------------------------------------------------------
  MINIAPP_URL: z.string().default("http://localhost:3000"),
  ADMIN_URL: z.string().default("http://localhost:3001"),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),
  /** Comma-separated list of allowed origins; "*" for development. */
  CORS_ORIGINS: z.string().default("*"),

  // --- API docs -------------------------------------------------------------
  SWAGGER_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  // --- Rate limiting ----------------------------------------------------------
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  // --- Storage (Cloudflare R2 / AWS S3 compatible) --------------------------
  STORAGE_DRIVER: z.enum(["r2", "s3", "local"]).default("local"),
  STORAGE_ENDPOINT: z.string().optional(), // R2: https://<account>.r2.cloudflarestorage.com
  STORAGE_REGION: z.string().default("auto"),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),

  // --- Payments: Stripe -----------------------------------------------------
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // --- Payments: PayPal -----------------------------------------------------
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_WEBHOOK_ID: z.string().optional(),

  // --- Payments: Binance Pay -------------------------------------------------
  BINANCE_PAY_API_KEY: z.string().optional(),
  BINANCE_PAY_SECRET: z.string().optional(),

  // --- Payments: Coinbase Commerce -------------------------------------------
  COINBASE_COMMERCE_API_KEY: z.string().optional(),
  COINBASE_COMMERCE_WEBHOOK_SECRET: z.string().optional(),

  // --- Email (SMTP) -----------------------------------------------------------
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // --- Growth defaults ---------------------------------------------------------
  REFERRAL_COMMISSION_PERCENT: z.coerce.number().min(0).max(50).default(5),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment configuration:\n${details}`);
  }
  return result.data;
}
