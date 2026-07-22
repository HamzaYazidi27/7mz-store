import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PAYMENT_PROVIDER_LABELS,
  type PaymentIntentDto,
  type PaymentMethodDto,
  type PaymentProviderCode,
} from "@7mz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { DeliveryService } from "../delivery/delivery.service";
import { Prisma } from "../generated/prisma/client";
import type { Order, Payment } from "../generated/prisma/client";
import type {
  NormalizedWebhookEvent,
  PaymentProvider,
  WebhookVerifyInput,
} from "./payment-provider.interface";
import { BalanceAdapter } from "./adapters/balance.adapter";
import { TelegramStarsAdapter } from "./adapters/telegram-stars.adapter";
import { CryptoAdapter } from "./adapters/crypto.adapter";
import { StripeAdapter } from "./adapters/stripe.adapter";
import { PaypalAdapter } from "./adapters/paypal.adapter";
import { BinancePayAdapter } from "./adapters/binance-pay.adapter";
import { CoinbaseCommerceAdapter } from "./adapters/coinbase-commerce.adapter";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Map<PaymentProviderCode, PaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly wallet: WalletService,
    private readonly delivery: DeliveryService,
    private readonly events: EventEmitter2,
    balance: BalanceAdapter,
    stars: TelegramStarsAdapter,
    crypto: CryptoAdapter,
    stripe: StripeAdapter,
    paypal: PaypalAdapter,
    binance: BinancePayAdapter,
    coinbase: CoinbaseCommerceAdapter,
  ) {
    this.providers = new Map<PaymentProviderCode, PaymentProvider>([
      [balance.code, balance],
      [stars.code, stars],
      [crypto.code, crypto],
      [stripe.code, stripe],
      [paypal.code, paypal],
      [binance.code, binance],
      [coinbase.code, coinbase],
    ]);
  }

  getProvider(code: PaymentProviderCode): PaymentProvider {
    const provider = this.providers.get(code);
    if (!provider) throw new BadRequestException(`Unknown payment provider: ${code}`);
    return provider;
  }

  // --------------------------------------------------------------- methods

  /**
   * Enabled payment methods for checkout/deposit. Cross-references the
   * PaymentGateway table (admin toggles) with each adapter's configured state.
   */
  async listMethods(
    balance: number,
    total: number,
    opts: { includeBalance: boolean },
  ): Promise<PaymentMethodDto[]> {
    const gateways = await this.prisma.paymentGateway.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: "asc" },
    });

    const methods: PaymentMethodDto[] = [];
    for (const gw of gateways) {
      const code = gw.provider as PaymentProviderCode;
      const provider = this.providers.get(code);
      if (!provider) continue;
      if (code === "balance" && !opts.includeBalance) continue;

      const configured = provider.isConfigured();
      let available = configured;
      let unavailableReason: string | undefined;

      if (code === "balance") {
        available = balance >= total;
        if (!available) unavailableReason = "Insufficient balance";
      } else if (!configured) {
        unavailableReason = "Not configured";
      }

      methods.push({
        provider: code,
        displayName: gw.displayName || PAYMENT_PROVIDER_LABELS[code],
        description: gw.description,
        icon: gw.icon,
        isTestMode: provider.isTestMode(),
        feePercent: gw.feePercent.toFixed(2),
        minAmount: gw.minAmount.toFixed(2),
        maxAmount: gw.maxAmount ? gw.maxAmount.toFixed(2) : null,
        available,
        unavailableReason,
      });
    }
    return methods;
  }

  // --------------------------------------------------- create (order/deposit)

  private intentFromResult(
    payment: Payment,
    result: Awaited<ReturnType<PaymentProvider["createPayment"]>>,
  ): PaymentIntentDto {
    return {
      paymentId: payment.id,
      provider: payment.provider as PaymentProviderCode,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      externalUrl: result.externalUrl ?? null,
      telegramInvoiceUrl: result.telegramInvoiceUrl ?? null,
      crypto: result.crypto ?? null,
      expiresAt: result.expiresAt?.toISOString() ?? null,
    };
  }

  /** Creates and initiates a payment for an order (called by OrdersService). */
  async createOrderPayment(
    order: Order,
    providerCode: PaymentProviderCode,
    asset?: string,
  ): Promise<PaymentIntentDto> {
    const provider = this.getProvider(providerCode);
    if (!provider.isConfigured()) {
      throw new ServiceUnavailableException(`${providerCode} is not available`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        purpose: "ORDER",
        provider: providerCode,
        status: "PENDING",
        amount: order.total,
        currency: order.currency,
        cryptoCurrency: providerCode === "crypto" && asset ? asset.toUpperCase() : null,
      },
    });

    const result = await provider.createPayment(payment, {
      title: `7MZ Order ${order.orderNumber}`,
      description: `Payment for order ${order.orderNumber}`,
      returnUrl: `${this.miniappUrl}/orders/${order.id}?paid=1`,
      cancelUrl: `${this.miniappUrl}/orders/${order.id}?cancelled=1`,
    });

    await this.persistIntent(payment.id, result);

    if (result.settledImmediately) {
      await this.finalizePayment(payment.id);
      const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      return this.intentFromResult(fresh, result);
    }

    const updated = await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return this.intentFromResult(updated, result);
  }

  /** Creates and initiates a wallet deposit payment. */
  async createDeposit(
    userId: string,
    amount: number,
    providerCode: PaymentProviderCode,
    asset?: string,
  ): Promise<PaymentIntentDto> {
    if (providerCode === "balance") {
      throw new BadRequestException("Cannot deposit using balance");
    }
    const provider = this.getProvider(providerCode);
    if (!provider.isConfigured()) {
      throw new ServiceUnavailableException(`${providerCode} is not available`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        purpose: "DEPOSIT",
        provider: providerCode,
        status: "PENDING",
        amount,
        currency: "USD",
        cryptoCurrency: providerCode === "crypto" && asset ? asset.toUpperCase() : null,
      },
    });

    const result = await provider.createPayment(payment, {
      title: "7MZ Wallet Top-up",
      description: `Deposit $${amount.toFixed(2)} to your 7MZ balance`,
      returnUrl: `${this.miniappUrl}/balance?deposited=1`,
      cancelUrl: `${this.miniappUrl}/balance?cancelled=1`,
    });

    await this.persistIntent(payment.id, result);
    const updated = await this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return this.intentFromResult(updated, result);
  }

  private async persistIntent(
    paymentId: string,
    result: Awaited<ReturnType<PaymentProvider["createPayment"]>>,
  ): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: result.settledImmediately ? "PENDING" : "PENDING",
        providerPaymentId: result.providerPaymentId ?? null,
        externalUrl: result.externalUrl ?? null,
        payload: result.payload ?? null,
        expiresAt: result.expiresAt ?? null,
        cryptoCurrency: result.crypto?.currency ?? null,
        cryptoAmount: result.crypto ? new Prisma.Decimal(result.crypto.amount) : null,
        cryptoAddress: result.crypto?.address ?? null,
      },
    });
  }

  // ------------------------------------------------------------- finalize

  /**
   * Finalizes a payment: idempotent. For ORDER payments it fulfills the order
   * (delivery), debits wallet when paid from balance, and marks the order
   * COMPLETED. For DEPOSIT payments it credits the wallet. Emits domain events
   * for growth/notifications. Safe to call multiple times (webhook retries).
   */
  async finalizePayment(paymentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException("Payment not found");
      if (payment.status === "COMPLETED") return; // idempotent

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED", confirmedAt: new Date() },
      });

      if (payment.purpose === "DEPOSIT") {
        await this.wallet.applyLedger(tx, {
          userId: payment.userId,
          type: "DEPOSIT",
          amount: Number(payment.amount),
          description: `Wallet deposit via ${PAYMENT_PROVIDER_LABELS[payment.provider as PaymentProviderCode]}`,
          reference: payment.id,
          paymentId: payment.id,
        });
        this.events.emit("deposit.completed", { userId: payment.userId, amount: Number(payment.amount) });
        return;
      }

      // ORDER payment
      if (!payment.orderId) return;
      const order = await tx.order.findUnique({ where: { id: payment.orderId } });
      if (!order || order.status === "COMPLETED") return;

      // Pay from wallet balance if that was the method.
      if (payment.provider === "balance") {
        await this.wallet.applyLedger(tx, {
          userId: order.userId,
          type: "PURCHASE",
          amount: -Number(order.total),
          description: `Purchase · order ${order.orderNumber}`,
          reference: order.orderNumber,
          orderId: order.id,
          paymentId: payment.id,
        });
      }

      // Fulfill (reserve + mark sold + link) inside the same transaction.
      await this.delivery.fulfillOrder(tx, order.id);

      await tx.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    });

    // Post-commit side effects (non-transactional).
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (payment?.purpose === "ORDER" && payment.order) {
      this.events.emit("order.completed", {
        orderId: payment.order.id,
        userId: payment.userId,
        total: Number(payment.order.total),
        orderNumber: payment.order.orderNumber,
      });
    }
  }

  async failPayment(paymentId: string, reason: string): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: { notIn: ["COMPLETED", "REFUNDED"] } },
      data: { status: "FAILED", failureReason: reason },
    });
  }

  // -------------------------------------------------------------- webhooks

  async handleWebhook(providerCode: PaymentProviderCode, input: WebhookVerifyInput): Promise<void> {
    const provider = this.getProvider(providerCode);
    if (!provider.verifyWebhook) {
      this.logger.warn(`No webhook handler for ${providerCode}`);
      return;
    }

    const event = await provider.verifyWebhook(input);
    if (event.status === "ignored") return;

    // Idempotency: dedupe by (provider, externalId).
    if (event.externalId) {
      const existing = await this.prisma.webhookEvent.findUnique({
        where: { provider_externalId: { provider: providerCode, externalId: event.externalId } },
      });
      if (existing?.processedAt) return;
    }

    await this.prisma.webhookEvent.upsert({
      where: {
        provider_externalId: {
          provider: providerCode,
          externalId: event.externalId ?? `${providerCode}-${Date.now()}`,
        },
      },
      create: {
        provider: providerCode,
        externalId: event.externalId,
        eventType: event.eventType,
        payload: event.raw as object,
      },
      update: { eventType: event.eventType },
    });

    const payment = await this.locatePayment(event);
    if (!payment) {
      this.logger.warn(`Webhook ${providerCode}/${event.eventType}: payment not found`);
      return;
    }

    if (event.status === "completed") {
      await this.finalizePayment(payment.id);
    } else if (event.status === "failed" || event.status === "expired") {
      await this.failPayment(payment.id, event.eventType);
    } else if (event.status === "pending") {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "CONFIRMING" },
      });
    }

    if (event.externalId) {
      await this.prisma.webhookEvent.updateMany({
        where: { provider: providerCode, externalId: event.externalId },
        data: { processedAt: new Date() },
      });
    }
  }

  private async locatePayment(event: NormalizedWebhookEvent) {
    if (event.internalPaymentId) {
      const byId = await this.prisma.payment.findUnique({ where: { id: event.internalPaymentId } });
      if (byId) return byId;
    }
    if (event.providerPaymentId) {
      return this.prisma.payment.findFirst({
        where: { providerPaymentId: event.providerPaymentId },
      });
    }
    return null;
  }

  private get miniappUrl(): string {
    return this.config.get<string>("urls.miniapp") ?? "";
  }
}
