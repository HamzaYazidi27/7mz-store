import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface CouponEvaluation {
  valid: boolean;
  reason?: string;
  couponId?: string;
  code: string;
  discount: number; // absolute amount in currency units
}

type Tx = Prisma.TransactionClient;

/**
 * CouponsService — validation and discount computation. Percentage coupons
 * respect an optional cap; fixed coupons never exceed the subtotal. Usage
 * limits (global and per-user) and validity windows are enforced.
 */
@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    code: string,
    userId: string,
    subtotal: number,
    productIds: string[],
  ): Promise<CouponEvaluation> {
    const normalized = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code: normalized } });

    if (!coupon || !coupon.isActive) {
      return { valid: false, reason: "Coupon not found", code: normalized, discount: 0 };
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false, reason: "Coupon is not active yet", code: normalized, discount: 0 };
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { valid: false, reason: "Coupon has expired", code: normalized, discount: 0 };
    }
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, reason: "Coupon usage limit reached", code: normalized, discount: 0 };
    }
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      return {
        valid: false,
        reason: `Minimum order of $${Number(coupon.minOrderAmount).toFixed(2)} required`,
        code: normalized,
        discount: 0,
      };
    }

    const perUserUses = await this.prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (perUserUses >= coupon.perUserLimit) {
      return { valid: false, reason: "You've already used this coupon", code: normalized, discount: 0 };
    }

    // Scoping: if the coupon targets specific categories/products, at least one
    // cart product must match.
    if (coupon.productIds.length > 0 || coupon.categoryIds.length > 0) {
      const matches = await this.prisma.product.count({
        where: {
          id: { in: productIds },
          OR: [
            { id: { in: coupon.productIds } },
            { categoryId: { in: coupon.categoryIds } },
          ],
        },
      });
      if (matches === 0) {
        return {
          valid: false,
          reason: "Coupon doesn't apply to these items",
          code: normalized,
          discount: 0,
        };
      }
    }

    let discount: number;
    if (coupon.type === "PERCENTAGE") {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else {
      discount = Number(coupon.value);
    }
    discount = Math.min(discount, subtotal);
    discount = Math.round(discount * 100) / 100;

    return { valid: true, couponId: coupon.id, code: normalized, discount };
  }

  /** Records a redemption and increments usage inside a transaction. */
  async redeem(
    tx: Tx,
    couponId: string,
    userId: string,
    orderId: string,
    amountSaved: number,
  ): Promise<void> {
    await tx.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    });
    await tx.couponRedemption.create({
      data: { couponId, userId, orderId, amountSaved },
    });
  }
}
