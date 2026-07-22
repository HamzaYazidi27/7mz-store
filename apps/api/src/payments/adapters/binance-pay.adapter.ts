import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
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
 * Binance Pay provider — merchant order creation with the official
 * HMAC-SHA512 request signing. Live when BINANCE_PAY_API_KEY/SECRET are set.
 */
@Injectable()
export class BinancePayAdapter implements PaymentProvider {
  readonly code: PaymentProviderCode = "binance_pay";
  private readonly logger = new Logger(BinancePayAdapter.name);
  private readonly baseUrl = "https://bpay.binanceapi.com";

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | null {
    return this.config.get<string | null>("payments.binancePay.apiKey") ?? null;
  }
  private get secret(): string | null {
    return this.config.get<string | null>("payments.binancePay.secret") ?? null;
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.secret;
  }

  isTestMode(): boolean {
    return false; // Binance Pay has no separate sandbox for this flow
  }

  private sign(payload: string, timestamp: string, nonce: string): string {
    return createHmac("sha512", this.secret!)
      .update(`${timestamp}\n${nonce}\n${payload}\n`)
      .digest("hex")
      .toUpperCase();
  }

  async createPayment(
    payment: Payment,
    context: { title: string; returnUrl: string; cancelUrl: string },
  ): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) throw new Error("Binance Pay is not configured");

    const body = {
      env: { terminalType: "WEB" },
      merchantTradeNo: payment.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32),
      orderAmount: Number(payment.amount).toFixed(2),
      currency: "USDT",
      goods: {
        goodsType: "02",
        goodsCategory: "Z000",
        referenceGoodsId: payment.id,
        goodsName: context.title.slice(0, 256),
      },
      returnUrl: context.returnUrl,
      cancelUrl: context.cancelUrl,
      webhookUrl: `${this.config.get("urls.api")}/api/v1/payments/webhook/binance_pay`,
    };

    const payload = JSON.stringify(body);
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString("hex");

    const { data } = await axios.post(`${this.baseUrl}/binancepay/openapi/v3/order`, payload, {
      headers: {
        "content-type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": this.apiKey!,
        "BinancePay-Signature": this.sign(payload, timestamp, nonce),
      },
      timeout: 20_000,
    });

    if (data.status !== "SUCCESS") {
      throw new Error(`Binance Pay order failed: ${data.errorMessage ?? data.code}`);
    }

    return {
      providerPaymentId: data.data.prepayId,
      externalUrl: data.data.checkoutUrl,
      payload: data.data.prepayId,
      expiresAt: new Date(Date.now() + 60 * 60_000),
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<NormalizedWebhookEvent> {
    const body = (input.body ?? {}) as { bizStatus?: string; data?: string };
    // Binance sends bizStatus PAY_SUCCESS / PAY_CLOSED with a JSON `data` string.
    let inner: { merchantTradeNo?: string; prepayId?: string } = {};
    try {
      inner = body.data ? JSON.parse(body.data) : {};
    } catch {
      /* ignore parse errors */
    }

    const status =
      body.bizStatus === "PAY_SUCCESS"
        ? "completed"
        : body.bizStatus === "PAY_CLOSED"
          ? "failed"
          : "pending";

    return {
      externalId: inner.prepayId ?? null,
      eventType: body.bizStatus ?? "unknown",
      providerPaymentId: inner.prepayId,
      internalPaymentId: inner.merchantTradeNo,
      status,
      raw: input.body,
    };
  }
}
