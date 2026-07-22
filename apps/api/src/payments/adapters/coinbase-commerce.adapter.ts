import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { createHmac } from "node:crypto";
import type { PaymentProviderCode } from "@7mz/shared";
import type { Payment } from "../../generated/prisma/client";
import type {
  CreatePaymentResult,
  NormalizedWebhookEvent,
  PaymentProvider,
  WebhookVerifyInput,
} from "../payment-provider.interface";

/**
 * Coinbase Commerce provider — hosted charge pages. Live when
 * COINBASE_COMMERCE_API_KEY is set; webhooks are HMAC-SHA256 verified with
 * COINBASE_COMMERCE_WEBHOOK_SECRET over the raw body.
 */
@Injectable()
export class CoinbaseCommerceAdapter implements PaymentProvider {
  readonly code: PaymentProviderCode = "coinbase_commerce";
  private readonly logger = new Logger(CoinbaseCommerceAdapter.name);
  private readonly baseUrl = "https://api.commerce.coinbase.com";

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | null {
    return this.config.get<string | null>("payments.coinbaseCommerce.apiKey") ?? null;
  }
  private get webhookSecret(): string | null {
    return this.config.get<string | null>("payments.coinbaseCommerce.webhookSecret") ?? null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  isTestMode(): boolean {
    return false;
  }

  async createPayment(
    payment: Payment,
    context: { title: string; description: string; returnUrl: string; cancelUrl: string },
  ): Promise<CreatePaymentResult> {
    if (!this.apiKey) throw new Error("Coinbase Commerce is not configured");

    const { data } = await axios.post(
      `${this.baseUrl}/charges`,
      {
        name: context.title.slice(0, 100),
        description: context.description.slice(0, 200),
        pricing_type: "fixed_price",
        local_price: { amount: Number(payment.amount).toFixed(2), currency: payment.currency },
        metadata: { paymentId: payment.id },
        redirect_url: context.returnUrl,
        cancel_url: context.cancelUrl,
      },
      {
        headers: { "X-CC-Api-Key": this.apiKey, "X-CC-Version": "2018-03-22" },
        timeout: 20_000,
      },
    );

    return {
      providerPaymentId: data.data.id,
      externalUrl: data.data.hosted_url,
      expiresAt: data.data.expires_at ? new Date(data.data.expires_at) : undefined,
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<NormalizedWebhookEvent> {
    if (!this.webhookSecret) {
      return { externalId: null, eventType: "unconfigured", status: "ignored", raw: input.body };
    }

    const signature = input.headers["x-cc-webhook-signature"] as string;
    const raw = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
    const expected = createHmac("sha256", this.webhookSecret).update(raw).digest("hex");
    if (!signature || signature !== expected) {
      return { externalId: null, eventType: "invalid", status: "ignored", raw: input.body };
    }

    const event = (input.body as { event?: { id?: string; type?: string; data?: { metadata?: { paymentId?: string }; id?: string } } }).event;
    const type = event?.type ?? "unknown";
    const status =
      type === "charge:confirmed" || type === "charge:resolved"
        ? "completed"
        : type === "charge:failed" || type === "charge:expired"
          ? "failed"
          : "pending";

    return {
      externalId: event?.id ?? null,
      eventType: type,
      providerPaymentId: event?.data?.id,
      internalPaymentId: event?.data?.metadata?.paymentId,
      status,
      raw: input.body,
    };
  }
}
