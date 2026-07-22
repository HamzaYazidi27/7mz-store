import { Global, Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { BalanceAdapter } from "./adapters/balance.adapter";
import { TelegramStarsAdapter } from "./adapters/telegram-stars.adapter";
import { CryptoAdapter } from "./adapters/crypto.adapter";
import { StripeAdapter } from "./adapters/stripe.adapter";
import { PaypalAdapter } from "./adapters/paypal.adapter";
import { BinancePayAdapter } from "./adapters/binance-pay.adapter";
import { CoinbaseCommerceAdapter } from "./adapters/coinbase-commerce.adapter";

@Global()
@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    BalanceAdapter,
    TelegramStarsAdapter,
    CryptoAdapter,
    StripeAdapter,
    PaypalAdapter,
    BinancePayAdapter,
    CoinbaseCommerceAdapter,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
