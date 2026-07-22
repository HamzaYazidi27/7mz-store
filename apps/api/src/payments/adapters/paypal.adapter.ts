import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import type { PaymentProviderCode } from "@7mz/shared";
import type { Payment } from "../../generated/prisma/client";
import type {
  CreatePaymentResult,
  NormalizedWebhookEvent,
  PaymentProvider,
  WebhookVerifyInput,
} from "../payment-provider.interface";

/**
 * PayPal provider — Orders v2 API with hosted approval links. Live when
 * PAYPAL_CLIENT_ID/SECRET are set; PAYPAL_ENV selects sandbox vs live base URL.
 */
@Injectable()
export class PaypalAdapter implements PaymentProvider {
  readonly code: PaymentProviderCode = "paypal";
  private readonly logger = new Logger(PaypalAdapter.name);

  constructor(private readonly config: ConfigService) {}

  private get clientId(): string | null {
    return this.config.get<string | null>("payments.paypal.clientId") ?? null;
  }
  private get clientSecret(): string | null {
    return this.config.get<string | null>("payments.paypal.clientSecret") ?? null;
  }
  private get baseUrl(): string {
    return this.config.get("payments.paypal.env") === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  isTestMode(): boolean {
    return this.config.get("payments.paypal.env") !== "live";
  }

  private async accessToken(): Promise<string> {
    const { data } = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        auth: { username: this.clientId!, password: this.clientSecret! },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15_000,
      },
    );
    return data.access_token as string;
  }

  async createPayment(
    payment: Payment,
    context: { title: string; returnUrl: string; cancelUrl: string },
  ): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) throw new Error("PayPal is not configured");
    const token = await this.accessToken();

    const { data } = await axios.post(
      `${this.baseUrl}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: payment.id,
            custom_id: payment.id,
            description: context.title.slice(0, 127),
            amount: { currency_code: payment.currency, value: Number(payment.amount).toFixed(2) },
          },
        ],
        application_context: {
          return_url: context.returnUrl,
          cancel_url: context.cancelUrl,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 20_000 },
    );

    const approve = (data.links as { rel: string; href: string }[])?.find(
      (l) => l.rel === "approve" || l.rel === "payer-action",
    );

    return {
      providerPaymentId: data.id as string,
      externalUrl: approve?.href,
      expiresAt: new Date(Date.now() + 3 * 3_600_000),
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<NormalizedWebhookEvent> {
    // PayPal webhook verification uses the transmission headers + webhook id.
    // We verify via the verify-webhook-signature API when a webhook id is set.
    const body = (input.body ?? {}) as {
      id?: string;
      event_type?: string;
      resource?: { id?: string; custom_id?: string; supplementary_data?: unknown; status?: string };
    };
    const webhookId = this.config.get<string | null>("payments.paypal.webhookId");

    let verified = !webhookId; // if no webhook id configured, accept (dev)
    if (webhookId && this.isConfigured()) {
      try {
        const token = await this.accessToken();
        const { data } = await axios.post(
          `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
          {
            auth_algo: input.headers["paypal-auth-algo"],
            cert_url: input.headers["paypal-cert-url"],
            transmission_id: input.headers["paypal-transmission-id"],
            transmission_sig: input.headers["paypal-transmission-sig"],
            transmission_time: input.headers["paypal-transmission-time"],
            webhook_id: webhookId,
            webhook_event: input.body,
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 15_000 },
        );
        verified = data.verification_status === "SUCCESS";
      } catch (err) {
        this.logger.warn(`PayPal webhook verify failed: ${(err as Error).message}`);
        verified = false;
      }
    }

    if (!verified) {
      return { externalId: body.id ?? null, eventType: "invalid", status: "ignored", raw: input.body };
    }

    const completed =
      body.event_type === "CHECKOUT.ORDER.APPROVED" ||
      body.event_type === "PAYMENT.CAPTURE.COMPLETED";

    return {
      externalId: body.id ?? null,
      eventType: body.event_type ?? "unknown",
      providerPaymentId: body.resource?.id,
      internalPaymentId: body.resource?.custom_id,
      status: completed ? "completed" : "pending",
      raw: input.body,
    };
  }
}
