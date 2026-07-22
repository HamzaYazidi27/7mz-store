import type { PaymentProviderCode } from "@7mz/shared";
import type { Payment } from "../generated/prisma/client";

/**
 * Normalized result of creating a payment with a provider.
 * The order/wallet services translate this into a PaymentIntentDto.
 */
export interface CreatePaymentResult {
  /** Provider-side id (charge id, invoice id, etc.), if any. */
  providerPaymentId?: string;
  /** Hosted checkout / invoice URL (Stripe, PayPal, Coinbase, Binance). */
  externalUrl?: string;
  /** Telegram Stars invoice link for WebApp.openInvoice(). */
  telegramInvoiceUrl?: string;
  /** Opaque payload echoed back by the provider (e.g. Telegram invoice payload). */
  payload?: string;
  /** Crypto payment details, when the provider is crypto. */
  crypto?: {
    currency: string;
    amount: string;
    address: string;
    qrData: string;
  };
  /** When the payment/invoice expires. */
  expiresAt?: Date;
  /**
   * True when the payment is already settled at creation time (e.g. paying
   * from wallet balance) — the caller finalizes the order immediately.
   */
  settledImmediately?: boolean;
}

/** Parsed, verified webhook event ready for the payments service to apply. */
export interface NormalizedWebhookEvent {
  /** Provider event id, for idempotency. */
  externalId: string | null;
  eventType: string;
  /** The provider payment id this event refers to (to locate our Payment row). */
  providerPaymentId?: string;
  /** Our internal payment id, when the provider echoes our payload/metadata. */
  internalPaymentId?: string;
  status: "completed" | "failed" | "expired" | "pending" | "ignored";
  /** Raw payload, stored for audit. */
  raw: unknown;
}

export interface WebhookVerifyInput {
  rawBody: Buffer | string;
  headers: Record<string, string | string[] | undefined>;
  /** Parsed JSON body, when available. */
  body?: unknown;
}

/**
 * PaymentProvider — the adapter contract every gateway implements.
 * Adapters are pure integration boundaries: they never touch the database.
 * The PaymentsService owns persistence, delivery, and wallet effects.
 */
export interface PaymentProvider {
  readonly code: PaymentProviderCode;

  /** True when the provider has the credentials it needs to operate. */
  isConfigured(): boolean;

  /** Whether the provider is currently running against test/sandbox APIs. */
  isTestMode(): boolean;

  /**
   * Create a payment for an already-persisted Payment row.
   * `context` carries the human-facing description and return URLs.
   */
  createPayment(
    payment: Payment,
    context: {
      title: string;
      description: string;
      returnUrl: string;
      cancelUrl: string;
    },
  ): Promise<CreatePaymentResult>;

  /**
   * Verify and normalize an inbound webhook. Adapters that don't use webhooks
   * (balance) may throw NotImplemented — the controller won't route to them.
   */
  verifyWebhook?(input: WebhookVerifyInput): Promise<NormalizedWebhookEvent>;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
