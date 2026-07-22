import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import type { PaymentProviderCode } from "@7mz/shared";
import type { Payment } from "../../generated/prisma/client";
import type {
  CreatePaymentResult,
  NormalizedWebhookEvent,
  PaymentProvider,
  WebhookVerifyInput,
} from "../payment-provider.interface";

/**
 * Stripe provider — hosted Checkout Sessions. Runs live the moment
 * STRIPE_SECRET_KEY is present; webhook signature is verified with
 * STRIPE_WEBHOOK_SECRET. Amounts are USD, converted to cents.
 */
@Injectable()
export class StripeAdapter implements PaymentProvider {
  readonly code: PaymentProviderCode = "stripe";
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string | null>("payments.stripe.secretKey");
    // Pin to the SDK's bundled API version to stay in lockstep with its types.
    this.stripe = key ? new Stripe(key) : null;
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  isTestMode(): boolean {
    const key = this.config.get<string | null>("payments.stripe.secretKey");
    return !!key && key.startsWith("sk_test_");
  }

  async createPayment(
    payment: Payment,
    context: { title: string; description: string; returnUrl: string; cancelUrl: string },
  ): Promise<CreatePaymentResult> {
    if (!this.stripe) throw new Error("Stripe is not configured");

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: payment.currency.toLowerCase(),
            unit_amount: Math.round(Number(payment.amount) * 100),
            product_data: { name: context.title, description: context.description.slice(0, 200) },
          },
        },
      ],
      client_reference_id: payment.id,
      metadata: { paymentId: payment.id },
      success_url: context.returnUrl,
      cancel_url: context.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    return {
      providerPaymentId: session.id,
      externalUrl: session.url ?? undefined,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<NormalizedWebhookEvent> {
    const secret = this.config.get<string | null>("payments.stripe.webhookSecret");
    if (!this.stripe || !secret) {
      return { externalId: null, eventType: "unconfigured", status: "ignored", raw: input.body };
    }

    const signature = input.headers["stripe-signature"] as string;
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(input.rawBody, signature, secret);
    } catch (err) {
      this.logger.warn(`Stripe signature verification failed: ${(err as Error).message}`);
      return { externalId: null, eventType: "invalid", status: "ignored", raw: input.body };
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        externalId: event.id,
        eventType: event.type,
        providerPaymentId: session.id,
        internalPaymentId: (session.metadata?.paymentId as string) ?? session.client_reference_id ?? undefined,
        status: session.payment_status === "paid" ? "completed" : "pending",
        raw: event,
      };
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        externalId: event.id,
        eventType: event.type,
        providerPaymentId: session.id,
        internalPaymentId: (session.metadata?.paymentId as string) ?? undefined,
        status: "expired",
        raw: event,
      };
    }

    return { externalId: event.id, eventType: event.type, status: "ignored", raw: event };
  }
}
