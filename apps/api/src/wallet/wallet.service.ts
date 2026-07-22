import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CursorPaginated,
  TransactionDto,
  TransactionType,
  WalletDto,
} from "@7mz/shared";
import { CryptoService } from "../crypto/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "../generated/prisma/client";
import type { Transaction } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;

function toTransactionDto(t: Transaction): TransactionDto {
  return {
    id: t.id,
    type: t.type as TransactionType,
    amount: t.amount.toFixed(2),
    balanceAfter: t.balanceAfter.toFixed(2),
    currency: t.currency,
    description: t.description,
    reference: t.reference,
    createdAt: t.createdAt.toISOString(),
  };
}

/**
 * WalletService — the money ledger. Every balance change flows through
 * `applyLedger`, which writes an immutable Transaction row with before/after
 * snapshots and updates the user's balance atomically. Balance reads use a
 * row lock to prevent double-spend under concurrency.
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Applies a signed amount to a user's balance inside a transaction and
   * records the ledger entry. Positive = credit, negative = debit.
   * Throws if a debit would overdraw the balance.
   */
  async applyLedger(
    tx: Tx,
    params: {
      userId: string;
      type: TransactionType;
      amount: number; // signed
      description: string;
      reference?: string;
      paymentId?: string;
      orderId?: string;
      allowNegative?: boolean;
    },
  ): Promise<{ balanceAfter: number }> {
    // Lock the user row for the duration of the transaction.
    const rows = await tx.$queryRaw<{ balance: Prisma.Decimal }[]>`
      SELECT balance FROM "User" WHERE id = ${params.userId} FOR UPDATE
    `;
    if (rows.length === 0) throw new BadRequestException("User not found");

    const before = Number(rows[0]!.balance);
    const after = Math.round((before + params.amount) * 100) / 100;

    if (after < 0 && !params.allowNegative) {
      throw new BadRequestException("Insufficient balance");
    }

    await tx.user.update({ where: { id: params.userId }, data: { balance: after } });

    await tx.transaction.create({
      data: {
        userId: params.userId,
        type: params.type,
        amount: params.amount,
        balanceBefore: before,
        balanceAfter: after,
        description: params.description,
        reference: params.reference ?? null,
        paymentId: params.paymentId ?? null,
        orderId: params.orderId ?? null,
      },
    });

    return { balanceAfter: after };
  }

  async getWallet(userId: string): Promise<WalletDto> {
    const [user, deposited, spent, pending] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.transaction.aggregate({
        where: { userId, type: "DEPOSIT" },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: "PURCHASE" },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { userId, purpose: "DEPOSIT", status: { in: ["PENDING", "CONFIRMING"] } },
      }),
    ]);

    return {
      balance: user.balance.toFixed(2),
      currency: "USD",
      pendingDeposits: pending,
      totalDeposited: (deposited._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      totalSpent: Math.abs(Number(spent._sum.amount ?? 0)).toFixed(2),
    };
  }

  async listTransactions(
    userId: string,
    cursor?: string,
    limit = 20,
    type?: TransactionType,
  ): Promise<CursorPaginated<TransactionDto>> {
    const rows = await this.prisma.transaction.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    return {
      items: page.map(toTransactionDto),
      nextCursor: hasNext ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  // ---------------------------------------------------------- promo codes

  /** Redeems a promo code for balance credit. One redemption per user. */
  async redeemPromo(userId: string, code: string): Promise<{ amount: string; balance: string }> {
    const normalized = code.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const promo = await tx.promoCode.findUnique({ where: { code: normalized } });
      if (!promo || !promo.isActive) throw new NotFoundException("Promo code not found");
      if (promo.expiresAt && promo.expiresAt < new Date()) {
        throw new BadRequestException("Promo code has expired");
      }
      if (promo.maxRedemptions !== null && promo.redemptionsCount >= promo.maxRedemptions) {
        throw new BadRequestException("Promo code fully redeemed");
      }

      const already = await tx.promoRedemption.findUnique({
        where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
      });
      if (already) throw new ConflictException("You've already redeemed this code");

      const amount = Number(promo.amount);
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { redemptionsCount: { increment: 1 } },
      });
      await tx.promoRedemption.create({
        data: { promoCodeId: promo.id, userId, amount },
      });
      const { balanceAfter } = await this.applyLedger(tx, {
        userId,
        type: "PROMO_CREDIT",
        amount,
        description: `Promo code ${normalized}`,
        reference: normalized,
      });

      return { amount: amount.toFixed(2), balance: balanceAfter.toFixed(2) };
    });
  }

  // ---------------------------------------------------------- withdrawals

  /** Creates a withdrawal request and holds the funds (debit on submit). */
  async requestWithdrawal(
    userId: string,
    amount: number,
    method: string,
    destination: string,
  ): Promise<{ id: string; status: string; balance: string }> {
    return this.prisma.$transaction(async (tx) => {
      const { balanceAfter } = await this.applyLedger(tx, {
        userId,
        type: "WITHDRAWAL",
        amount: -amount,
        description: `Withdrawal to ${method}`,
      });

      const request = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount,
          method,
          destination: this.crypto.encrypt(destination),
          status: "PENDING",
        },
      });

      return { id: request.id, status: request.status, balance: balanceAfter.toFixed(2) };
    });
  }
}
