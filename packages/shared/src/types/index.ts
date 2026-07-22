// ============================================================================
// API DTO types — the JSON shapes returned by the 7MZ Store REST API.
// Monetary values are serialized as strings to preserve decimal precision.
// ============================================================================

import type {
  DeliveryType,
  NotificationType,
  OrderStatus,
  PaymentProviderCode,
  PaymentStatus,
  TicketStatus,
  TransactionType,
  UserRole,
} from "../constants";

// ----------------------------------------------------------------------------
// Envelope & pagination
// ----------------------------------------------------------------------------

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>;
}

export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
  };
}

export interface CursorPaginated<T> {
  items: T[];
  nextCursor: string | null;
}

// ----------------------------------------------------------------------------
// Auth & user
// ----------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token TTL in seconds. */
  expiresIn: number;
}

export interface UserDto {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string;
  email: string | null;
  emailVerified: boolean;
  role: UserRole;
  balance: string;
  referralCode: string;
  twoFactorEnabled: boolean;
  dailyStreak: number;
  lastDailyClaimAt: string | null;
  nextFreeSpinAt: string | null;
  theme: string;
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: UserDto;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export interface SessionDto {
  id: string;
  deviceLabel: string | null;
  platform: string | null;
  ip: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface LoginHistoryDto {
  id: string;
  ip: string | null;
  platform: string | null;
  success: boolean;
  createdAt: string;
}

export interface UserStatsDto {
  totalOrders: number;
  completedOrders: number;
  totalSpent: string;
  totalSaved: string;
  reviewsWritten: number;
  referralsCount: number;
  referralEarnings: string;
  memberSince: string;
}

// ----------------------------------------------------------------------------
// Catalog
// ----------------------------------------------------------------------------

export interface CategoryDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  image: string | null;
  description: string | null;
  accentColor: string | null;
  sortOrder: number;
  productCount: number;
  children?: CategoryDto[];
}

export interface ProductCardDto {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  thumbnail: string | null;
  brandColor: string | null;
  price: string;
  compareAtPrice: string | null;
  discountPercent: number | null;
  currency: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  stockCount: number;
  deliveryType: DeliveryType;
  isFeatured: boolean;
  isFlashSale: boolean;
  flashSaleEndsAt: string | null;
  isNew: boolean;
  categoryId: string;
  categoryName: string;
}

export interface ProductFaqDto {
  id: string;
  question: string;
  answer: string;
}

export interface ProductDetailDto extends ProductCardDto {
  description: string;
  images: string[];
  features: string[];
  tags: string[];
  deliveryNote: string | null;
  viewCount: number;
  faqs: ProductFaqDto[];
  createdAt: string;
}

export interface ReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string | null;
    photoUrl: string | null;
  };
  verifiedPurchase: boolean;
}

export interface ProductReviewsSummaryDto {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

// ----------------------------------------------------------------------------
// Cart, checkout, orders
// ----------------------------------------------------------------------------

export interface CartItemDto {
  id: string;
  quantity: number;
  product: ProductCardDto;
}

export interface CartDto {
  items: CartItemDto[];
  subtotal: string;
  itemCount: number;
}

export interface CouponPreviewDto {
  code: string;
  valid: boolean;
  reason?: string;
  discount: string;
  newTotal: string;
}

export interface CheckoutQuoteDto {
  subtotal: string;
  discount: string;
  total: string;
  coupon: CouponPreviewDto | null;
  balance: string;
  balanceSufficient: boolean;
  providers: PaymentMethodDto[];
}

export interface PaymentMethodDto {
  provider: PaymentProviderCode;
  displayName: string;
  description: string | null;
  icon: string | null;
  isTestMode: boolean;
  feePercent: string;
  minAmount: string;
  maxAmount: string | null;
  available: boolean;
  unavailableReason?: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  thumbnail: string | null;
  unitPrice: string;
  quantity: number;
  total: string;
  deliveredAt: string | null;
  delivered: DeliveredItemDto[];
}

export interface DeliveredItemDto {
  id: string;
  /** Decrypted content — only present on the order detail endpoint for the owner. */
  content: string | null;
  fileName: string | null;
  /** Signed download URL for AUTO_FILE deliveries. */
  downloadUrl: string | null;
  deliveredAt: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  discount: string;
  total: string;
  currency: string;
  couponCode: string | null;
  itemCount: number;
  firstItemName: string;
  firstItemThumbnail: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface OrderDetailDto extends Omit<OrderDto, "itemCount" | "firstItemName" | "firstItemThumbnail"> {
  items: OrderItemDto[];
  payment: {
    provider: PaymentProviderCode;
    status: PaymentStatus;
    confirmedAt: string | null;
  } | null;
}

export interface CreateOrderResultDto {
  order: OrderDetailDto;
  payment: PaymentIntentDto | null;
}

// ----------------------------------------------------------------------------
// Payments & wallet
// ----------------------------------------------------------------------------

export interface PaymentIntentDto {
  paymentId: string;
  provider: PaymentProviderCode;
  status: PaymentStatus;
  amount: string;
  currency: string;
  /** Hosted checkout / invoice URL (Stripe, PayPal, Coinbase, Binance). */
  externalUrl: string | null;
  /** Telegram Stars invoice link for openInvoice(). */
  telegramInvoiceUrl: string | null;
  /** Crypto payment details. */
  crypto: {
    currency: string;
    amount: string;
    address: string;
    qrData: string;
  } | null;
  expiresAt: string | null;
}

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amount: string;
  balanceAfter: string;
  currency: string;
  description: string;
  reference: string | null;
  createdAt: string;
}

export interface WalletDto {
  balance: string;
  currency: string;
  pendingDeposits: number;
  totalDeposited: string;
  totalSpent: string;
}

// ----------------------------------------------------------------------------
// Growth: referrals, missions, rewards
// ----------------------------------------------------------------------------

export interface ReferralStatsDto {
  referralCode: string;
  inviteLink: string;
  commissionPercent: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarned: string;
  pendingEarnings: string;
  recentEarnings: ReferralEarningDto[];
}

export interface ReferralEarningDto {
  id: string;
  amount: string;
  percent: string;
  referredUser: { firstName: string; photoUrl: string | null };
  createdAt: string;
}

export interface LeaderboardEntryDto {
  rank: number;
  firstName: string;
  photoUrl: string | null;
  referralsCount: number;
  totalEarned: string;
  isCurrentUser: boolean;
}

export interface MissionDto {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string | null;
  rewardAmount: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyRewardStateDto {
  streak: number;
  canClaim: boolean;
  nextClaimAt: string | null;
  todayAmount: string;
  ladder: { day: number; amount: string; claimed: boolean; isToday: boolean }[];
}

export interface SpinPrizeDto {
  id: string;
  label: string;
  type: "BALANCE" | "COUPON" | "NOTHING";
  value: string;
  color: string | null;
  icon: string | null;
}

export interface SpinStateDto {
  canSpin: boolean;
  nextSpinAt: string | null;
  prizes: SpinPrizeDto[];
}

export interface SpinResultDto {
  prize: SpinPrizeDto;
  awardedAmount: string;
  couponCode: string | null;
  newBalance: string;
}

// ----------------------------------------------------------------------------
// Content
// ----------------------------------------------------------------------------

export interface BannerDto {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  image: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  productId: string | null;
  productSlug: string | null;
  productPrice: string | null;
  accentColor: string | null;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
}

export interface HelpArticleDto {
  id: string;
  slug: string;
  title: string;
  body: string;
  categoryName: string | null;
  tags: string[];
}

// ----------------------------------------------------------------------------
// Notifications & support
// ----------------------------------------------------------------------------

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface TicketDto {
  id: string;
  number: string;
  subject: string;
  status: TicketStatus;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
}

export interface TicketMessageDto {
  id: string;
  body: string;
  isStaff: boolean;
  authorName: string;
  attachments: string[];
  createdAt: string;
}

export interface TicketDetailDto extends TicketDto {
  messages: TicketMessageDto[];
  orderNumber: string | null;
}

// ----------------------------------------------------------------------------
// Home page aggregate
// ----------------------------------------------------------------------------

export interface HomeFeedDto {
  banners: BannerDto[];
  announcements: AnnouncementDto[];
  categories: CategoryDto[];
  featured: ProductCardDto[];
  flashSale: ProductCardDto[];
  bestSellers: ProductCardDto[];
  unreadNotifications: number;
}
