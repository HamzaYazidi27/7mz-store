// ============================================================================
// Shared constants — single source of truth for both frontends and the API.
// ============================================================================

export const STORE_NAME = "7MZ Store";
export const DEFAULT_CURRENCY = "USD";
export const ORDER_NUMBER_PREFIX = "7MZ";
export const TICKET_NUMBER_PREFIX = "TKT";

// ----------------------------------------------------------------------------
// Payment providers
// ----------------------------------------------------------------------------

export const PAYMENT_PROVIDERS = [
  "balance",
  "telegram_stars",
  "crypto",
  "stripe",
  "paypal",
  "binance_pay",
  "coinbase_commerce",
] as const;

export type PaymentProviderCode = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderCode, string> = {
  balance: "Wallet Balance",
  telegram_stars: "Telegram Stars",
  crypto: "Crypto",
  stripe: "Card",
  paypal: "PayPal",
  binance_pay: "Binance Pay",
  coinbase_commerce: "Coinbase",
};

// ----------------------------------------------------------------------------
// Statuses (mirrors Prisma enums — keep in sync with apps/api/prisma/schema.prisma)
// ----------------------------------------------------------------------------

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Processing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export const PAYMENT_STATUSES = [
  "CREATED",
  "PENDING",
  "CONFIRMING",
  "COMPLETED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TRANSACTION_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "PURCHASE",
  "REFUND",
  "REFERRAL_COMMISSION",
  "PROMO_CREDIT",
  "DAILY_REWARD",
  "MISSION_REWARD",
  "SPIN_REWARD",
  "ADMIN_CREDIT",
  "ADMIN_DEBIT",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  PURCHASE: "Purchase",
  REFUND: "Refund",
  REFERRAL_COMMISSION: "Referral Commission",
  PROMO_CREDIT: "Promo Credit",
  DAILY_REWARD: "Daily Reward",
  MISSION_REWARD: "Mission Reward",
  SPIN_REWARD: "Spin Reward",
  ADMIN_CREDIT: "Balance Adjustment",
  ADMIN_DEBIT: "Balance Adjustment",
};

export const DELIVERY_TYPES = ["AUTO_CODE", "AUTO_CREDENTIALS", "AUTO_FILE", "MANUAL"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  AUTO_CODE: "Instant code delivery",
  AUTO_CREDENTIALS: "Instant account delivery",
  AUTO_FILE: "Instant file download",
  MANUAL: "Manual fulfillment",
};

export const TICKET_STATUSES = [
  "OPEN",
  "AWAITING_STAFF",
  "AWAITING_USER",
  "RESOLVED",
  "CLOSED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "ORDER",
  "PAYMENT",
  "PRODUCT",
  "FLASH_SALE",
  "PROMO",
  "REFERRAL",
  "MISSION",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const USER_ROLES = ["CUSTOMER", "SUPPORT", "MANAGER", "ADMIN", "SUPER_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles allowed into the admin panel. */
export const STAFF_ROLES: readonly UserRole[] = ["SUPPORT", "MANAGER", "ADMIN", "SUPER_ADMIN"];

// ----------------------------------------------------------------------------
// Catalog sorting / filtering
// ----------------------------------------------------------------------------

export const PRODUCT_SORT_OPTIONS = [
  "popular",
  "newest",
  "rating",
  "discount",
  "price_asc",
  "price_desc",
] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  popular: "Popular",
  newest: "Newest",
  rating: "Best Rated",
  discount: "Discounted",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
};

// ----------------------------------------------------------------------------
// Missions & rewards
// ----------------------------------------------------------------------------

export const MISSION_CODES = [
  "BUY_FIRST_PRODUCT",
  "INVITE_FRIEND",
  "COMPLETE_PROFILE",
  "FIRST_DEPOSIT",
  "LEAVE_REVIEW",
  "SPEND_50",
] as const;
export type MissionCode = (typeof MISSION_CODES)[number];

/** Daily reward ladder: index = streak day - 1 (capped at last entry). */
export const DAILY_REWARD_LADDER = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 1.0] as const;

// ----------------------------------------------------------------------------
// Pagination defaults
// ----------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
