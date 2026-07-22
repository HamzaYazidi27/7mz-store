import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomBytes } from "node:crypto";
import type { PaymentProviderCode } from "@7mz/shared";
import type { Payment } from "../../generated/prisma/client";
import type {
  CreatePaymentResult,
  NormalizedWebhookEvent,
  PaymentProvider,
  WebhookVerifyInput,
} from "../payment-provider.interface";

/**
 * Crypto provider — generic HTTP-based crypto checkout.
 *
 * The architecture is provider-agnostic: point CRYPTO_API_URL/KEY at any
 * hosted crypto gateway (NOWPayments, Cryptomus, a TON payment service, …).
 * When credentials are absent it runs in "test mode": it deterministically
 * derives a demo deposit address + amount so the full checkout → pending →
 * confirmation flow is exercisable end-to-end without live keys. Swapping in
 * real credentials switches to live invoice creation with no code changes.
 */
@Injectable()
export class CryptoAdapter implements PaymentProvider {
  readonly code: PaymentProviderCode = "crypto";

  constructor(private readonly config: ConfigService) {}

  private get apiUrl(): string | null {
    return process.env.CRYPTO_API_URL ?? null;
  }
  private get apiKey(): string | null {
    return process.env.CRYPTO_API_KEY ?? null;
  }
  private get webhookSecret(): string | null {
    return process.env.CRYPTO_WEBHOOK_SECRET ?? null;
  }

  isConfigured(): boolean {
    // Always available: falls back to test-mode invoices when keys are absent.
    return true;
  }

  isTestMode(): boolean {
    return !this.apiUrl || !this.apiKey;
  }

  /** Supported crypto assets and their demo-address shapes. */
  static readonly ASSETS: Record<string, { label: string; prefix: () => string; scheme: string }> = {
    USDT: { label: "USDT (TRC-20)", prefix: () => `T${randomBytes(16).toString("hex").toUpperCase().slice(0, 33)}`, scheme: "tron" },
    BTC: { label: "Bitcoin", prefix: () => `bc1q${randomBytes(20).toString("hex").slice(0, 38)}`, scheme: "bitcoin" },
    LTC: { label: "Litecoin", prefix: () => `ltc1q${randomBytes(20).toString("hex").slice(0, 38)}`, scheme: "litecoin" },
  };

  async createPayment(payment: Payment): Promise<CreatePaymentResult> {
    // The requested asset is stamped on the payment before we're called.
    const asset = (payment.cryptoCurrency ?? process.env.CRYPTO_DEFAULT_ASSET ?? "USDT").toUpperCase();
    const currency = CryptoAdapter.ASSETS[asset] ? asset : "USDT";
    const expiresAt = new Date(Date.now() + 30 * 60_000);

    if (this.isTestMode()) {
      // Deterministic demo invoice — no external call. Exercises the full
      // checkout → pending → confirmation flow without live keys.
      const address = CryptoAdapter.ASSETS[currency]!.prefix();
      const amount = Number(payment.amount).toFixed(2);
      const scheme = CryptoAdapter.ASSETS[currency]!.scheme;
      return {
        providerPaymentId: `test_${payment.id}`,
        crypto: {
          currency,
          amount,
          address,
          qrData: `${scheme}:${address}?amount=${amount}`,
        },
        expiresAt,
      };
    }

    // Live mode: create a hosted crypto invoice.
    const { default: axios } = await import("axios");
    const { data } = await axios.post(
      `${this.apiUrl}/invoices`,
      {
        amount: Number(payment.amount),
        currency: payment.currency,
        pay_currency: currency,
        order_id: payment.id,
        callback_url: `${this.config.get("urls.api")}/api/v1/payments/webhook/crypto`,
      },
      { headers: { Authorization: `Bearer ${this.apiKey}` }, timeout: 20_000 },
    );

    return {
      providerPaymentId: String(data.id ?? data.invoice_id ?? payment.id),
      externalUrl: data.invoice_url ?? data.url ?? undefined,
      crypto: data.pay_address
        ? {
            currency: data.pay_currency ?? currency,
            amount: String(data.pay_amount ?? payment.amount),
            address: data.pay_address,
            qrData: `${(data.pay_currency ?? currency).toLowerCase()}:${data.pay_address}?amount=${data.pay_amount}`,
          }
        : undefined,
      expiresAt,
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<NormalizedWebhookEvent> {
    const body = (input.body ?? {}) as Record<string, unknown>;

    // Signature check when a secret is configured (HMAC over the raw body).
    if (this.webhookSecret) {
      const signature =
        (input.headers["x-signature"] as string) ||
        (input.headers["x-nowpayments-sig"] as string) ||
        "";
      const expected = createHmac("sha256", this.webhookSecret)
        .update(typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8"))
        .digest("hex");
      if (!signature || signature !== expected) {
        return { externalId: null, eventType: "invalid", status: "ignored", raw: input.body };
      }
    }

    const status = String(body.payment_status ?? body.status ?? "").toLowerCase();
    const mapped =
      status === "finished" || status === "confirmed" || status === "paid"
        ? "completed"
        : status === "failed" || status === "expired"
          ? "failed"
          : "pending";

    return {
      externalId: (body.payment_id as string) ?? (body.id as string) ?? null,
      eventType: status || "update",
      providerPaymentId: (body.order_id as string) ?? (body.payment_id as string) ?? undefined,
      internalPaymentId: (body.order_id as string) ?? undefined,
      status: mapped,
      raw: input.body,
    };
  }
}
