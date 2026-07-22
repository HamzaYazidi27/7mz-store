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
 * Telegram Stars provider.
 *
 * Uses the Bot API `createInvoiceLink` with currency "XTR" (Stars). The Mini
 * App opens the returned link with `WebApp.openInvoice()`. Settlement arrives
 * via the bot's `successful_payment` update, which the bot webhook forwards to
 * our payments webhook as a normalized event carrying our invoice payload.
 *
 * Star pricing: 1 USD ≈ STARS_PER_USD stars (configurable). Amounts are whole
 * stars, sent as a single labeled price.
 */
@Injectable()
export class TelegramStarsAdapter implements PaymentProvider {
  readonly code: PaymentProviderCode = "telegram_stars";
  private readonly logger = new Logger(TelegramStarsAdapter.name);
  private readonly starsPerUsd: number;

  constructor(private readonly config: ConfigService) {
    // Default heuristic; operators can tune via env if Telegram's rate shifts.
    this.starsPerUsd = Number(process.env.TELEGRAM_STARS_PER_USD ?? 50);
  }

  private get botToken(): string | null {
    return this.config.get<string | null>("telegram.botToken") ?? null;
  }

  isConfigured(): boolean {
    return !!this.botToken;
  }

  isTestMode(): boolean {
    // Stars run against Telegram's real ledger; there is no separate sandbox.
    return false;
  }

  usdToStars(usd: number): number {
    return Math.max(1, Math.round(usd * this.starsPerUsd));
  }

  async createPayment(
    payment: Payment,
    context: { title: string; description: string },
  ): Promise<CreatePaymentResult> {
    if (!this.botToken) {
      throw new Error("Telegram bot token not configured");
    }

    const stars = this.usdToStars(Number(payment.amount));
    const { data } = await axios.post(
      `https://api.telegram.org/bot${this.botToken}/createInvoiceLink`,
      {
        title: context.title.slice(0, 32),
        description: context.description.slice(0, 255),
        payload: payment.id, // echoed back in successful_payment
        currency: "XTR",
        prices: [{ label: context.title.slice(0, 32), amount: stars }],
      },
      { timeout: 15_000 },
    );

    if (!data?.ok || !data?.result) {
      throw new Error(`Telegram createInvoiceLink failed: ${JSON.stringify(data)}`);
    }

    return {
      telegramInvoiceUrl: data.result as string,
      payload: payment.id,
      providerPaymentId: payment.id,
    };
  }

  /**
   * The bot's update handler posts successful_payment events to our webhook.
   * We expect a body of shape { payload, telegram_payment_charge_id }.
   */
  async verifyWebhook(input: WebhookVerifyInput): Promise<NormalizedWebhookEvent> {
    const body = (input.body ?? {}) as {
      payload?: string;
      telegram_payment_charge_id?: string;
      status?: string;
    };

    return {
      externalId: body.telegram_payment_charge_id ?? null,
      eventType: "successful_payment",
      internalPaymentId: body.payload,
      providerPaymentId: body.payload,
      status: body.status === "failed" ? "failed" : "completed",
      raw: input.body,
    };
  }
}
