// ============================================================================
// Zod input schemas — shared validation between frontends (React Hook Form)
// and any consumer that needs to validate API inputs client-side.
// ============================================================================

import { z } from "zod";
import { PAYMENT_PROVIDERS, PRODUCT_SORT_OPTIONS } from "../constants";

/**
 * Boolean from query-string values — `z.coerce.boolean()` treats the string
 * "false" as true (truthy coercion), so we normalize explicitly.
 */
const boolish = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((v) => v === true || v === "true" || v === "1" || v === 1);

// ----------------------------------------------------------------------------
// Catalog browsing
// ----------------------------------------------------------------------------

export const productQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  sort: z.enum(PRODUCT_SORT_OPTIONS).default("popular"),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStockOnly: boolish.optional(),
  onSaleOnly: boolish.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ProductQueryInput = z.infer<typeof productQuerySchema>;

// ----------------------------------------------------------------------------
// Cart & checkout
// ----------------------------------------------------------------------------

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Your cart is empty"),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,32}$/, "Invalid coupon format")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  provider: z.enum(PAYMENT_PROVIDERS),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const couponPreviewSchema = z.object({
  code: z.string().trim().min(2).max(32),
  items: z.array(checkoutItemSchema).min(1),
});
export type CouponPreviewInput = z.infer<typeof couponPreviewSchema>;

// ----------------------------------------------------------------------------
// Wallet
// ----------------------------------------------------------------------------

export const depositSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Enter an amount")
    .min(1, "Minimum deposit is $1")
    .max(10000, "Maximum deposit is $10,000"),
  provider: z.enum(PAYMENT_PROVIDERS.filter((p) => p !== "balance") as [string, ...string[]]),
});
export type DepositInput = z.infer<typeof depositSchema>;

export const withdrawSchema = z.object({
  amount: z.coerce.number().positive().min(5, "Minimum withdrawal is $5"),
  method: z.string().min(1, "Select a method"),
  destination: z.string().trim().min(8, "Enter a valid destination address"),
});
export type WithdrawInput = z.infer<typeof withdrawSchema>;

export const promoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,32}$/, "Invalid promo code format"),
});
export type PromoCodeInput = z.infer<typeof promoCodeSchema>;

// ----------------------------------------------------------------------------
// Profile & security
// ----------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  languageCode: z.string().min(2).max(8).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  notificationsEnabled: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(16),
});

export const enable2faSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type Enable2faInput = z.infer<typeof enable2faSchema>;

// ----------------------------------------------------------------------------
// Reviews
// ----------------------------------------------------------------------------

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(1000, "Keep it under 1000 characters").optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ----------------------------------------------------------------------------
// Support
// ----------------------------------------------------------------------------

export const createTicketSchema = z.object({
  subject: z.string().trim().min(4, "Subject is too short").max(120),
  message: z.string().trim().min(10, "Describe your issue in a bit more detail").max(4000),
  orderId: z.string().optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const replyTicketSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
});
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;
