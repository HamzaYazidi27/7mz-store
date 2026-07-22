import type { Env } from "./env.validation";

/**
 * Nested application configuration derived from validated env vars.
 * Access via ConfigService: `config.get("auth.accessTtl", { infer: true })`.
 */
export function configuration() {
  const env = process.env as unknown as Env;

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    port: Number(env.PORT),

    database: {
      url: env.DATABASE_URL,
    },

    redis: {
      url: env.REDIS_URL,
    },

    auth: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: Number(env.JWT_ACCESS_TTL_SECONDS),
      refreshTtl: Number(env.JWT_REFRESH_TTL_SECONDS),
      devBypass: Boolean(env.AUTH_DEV_BYPASS) && env.NODE_ENV !== "production",
    },

    encryption: {
      key: env.ENCRYPTION_KEY,
    },

    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN ?? null,
      botUsername: env.TELEGRAM_BOT_USERNAME ?? null,
    },

    urls: {
      miniapp: env.MINIAPP_URL,
      admin: env.ADMIN_URL,
      api: env.API_PUBLIC_URL,
    },

    cors: {
      origins:
        env.CORS_ORIGINS === "*"
          ? true
          : env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
    },

    swagger: {
      enabled: Boolean(env.SWAGGER_ENABLED),
    },

    throttle: {
      ttl: Number(env.THROTTLE_TTL_SECONDS) * 1000,
      limit: Number(env.THROTTLE_LIMIT),
    },

    storage: {
      driver: env.STORAGE_DRIVER,
      endpoint: env.STORAGE_ENDPOINT ?? null,
      region: env.STORAGE_REGION,
      bucket: env.STORAGE_BUCKET ?? null,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? null,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? null,
      publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL ?? null,
    },

    payments: {
      stripe: {
        secretKey: env.STRIPE_SECRET_KEY ?? null,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? null,
      },
      paypal: {
        clientId: env.PAYPAL_CLIENT_ID ?? null,
        clientSecret: env.PAYPAL_CLIENT_SECRET ?? null,
        env: env.PAYPAL_ENV,
        webhookId: env.PAYPAL_WEBHOOK_ID ?? null,
      },
      binancePay: {
        apiKey: env.BINANCE_PAY_API_KEY ?? null,
        secret: env.BINANCE_PAY_SECRET ?? null,
      },
      coinbaseCommerce: {
        apiKey: env.COINBASE_COMMERCE_API_KEY ?? null,
        webhookSecret: env.COINBASE_COMMERCE_WEBHOOK_SECRET ?? null,
      },
    },

    mail: {
      host: env.SMTP_HOST ?? null,
      port: env.SMTP_PORT ?? 587,
      user: env.SMTP_USER ?? null,
      password: env.SMTP_PASSWORD ?? null,
      from: env.SMTP_FROM ?? "7MZ Store <no-reply@7mz.store>",
    },

    growth: {
      referralCommissionPercent: Number(env.REFERRAL_COMMISSION_PERCENT),
    },
  };
}

export type AppConfig = ReturnType<typeof configuration>;
