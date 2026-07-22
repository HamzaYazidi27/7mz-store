import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TRANSACTION_TYPES, type PaymentProviderCode, type TransactionType } from "@7mz/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../auth/types";
import { PaymentsService } from "../payments/payments.service";
import { WalletService } from "./wallet.service";
import { DepositDto, PromoCodeDto, WithdrawDto } from "./dto/wallet.dto";

@ApiTags("Wallet")
@ApiBearerAuth("access-token")
@Controller("wallet")
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly payments: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Wallet summary: balance, totals, pending deposits" })
  getWallet(@CurrentUser() user: AuthUser) {
    return this.wallet.getWallet(user.id);
  }

  @Get("transactions")
  @ApiOperation({ summary: "Transaction history (cursor paginated, filter by type)" })
  transactions(
    @CurrentUser() user: AuthUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
    @Query("type") type?: string,
  ) {
    const take = limit ? Math.min(Number.parseInt(limit, 10) || 20, 50) : 20;
    const t =
      type && TRANSACTION_TYPES.includes(type as TransactionType)
        ? (type as TransactionType)
        : undefined;
    return this.wallet.listTransactions(user.id, cursor, take, t);
  }

  @Get("deposit-methods")
  @ApiOperation({ summary: "Available deposit payment methods" })
  async depositMethods(@CurrentUser() user: AuthUser) {
    return this.payments.listMethods(0, 0, { includeBalance: false });
  }

  @Post("deposit")
  @ApiOperation({ summary: "Create a wallet top-up payment" })
  deposit(@CurrentUser() user: AuthUser, @Body() dto: DepositDto) {
    return this.payments.createDeposit(
      user.id,
      dto.amount,
      dto.provider as PaymentProviderCode,
      dto.asset,
    );
  }

  @Post("withdraw")
  @ApiOperation({ summary: "Request a withdrawal (holds funds)" })
  withdraw(@CurrentUser() user: AuthUser, @Body() dto: WithdrawDto) {
    return this.wallet.requestWithdrawal(user.id, dto.amount, dto.method, dto.destination);
  }

  @Post("promo")
  @ApiOperation({ summary: "Redeem a promo code for balance credit" })
  promo(@CurrentUser() user: AuthUser, @Body() dto: PromoCodeDto) {
    return this.wallet.redeemPromo(user.id, dto.code);
  }
}
