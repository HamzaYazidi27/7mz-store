import { Injectable } from "@nestjs/common";
import type { PaymentProviderCode } from "@7mz/shared";
import type { Payment } from "../../generated/prisma/client";
import type { CreatePaymentResult, PaymentProvider } from "../payment-provider.interface";

/**
 * Wallet-balance provider. Always "configured", never uses webhooks — a
 * balance payment settles instantly and the PaymentsService debits the ledger
 * inside the same transaction as order finalization.
 */
@Injectable()
export class BalanceAdapter implements PaymentProvider {
  readonly code: PaymentProviderCode = "balance";

  isConfigured(): boolean {
    return true;
  }

  isTestMode(): boolean {
    return false;
  }

  async createPayment(_payment: Payment): Promise<CreatePaymentResult> {
    return { settledImmediately: true };
  }
}
