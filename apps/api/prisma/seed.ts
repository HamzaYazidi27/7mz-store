/* ============================================================================
   7MZ Store — database seed
   Populates a realistic demo dataset: settings, payment gateways, categories,
   products (with encrypted stock), banners, coupons, promos, missions, spin
   prizes, help center, an admin user, and demo customers + orders/reviews.

   Idempotent: clears domain tables first, then reseeds. Run with:
     pnpm --filter @7mz/api db:seed
   ============================================================================ */

import "dotenv/config";
import { createCipheriv, randomBytes, createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  SEED_BANNERS,
  SEED_CATEGORIES,
  SEED_COUPONS,
  SEED_HELP,
  SEED_MISSIONS,
  SEED_PROMO_CODES,
  SEED_SPIN_PRIZES,
  type SeedProduct,
} from "./seed-data";

const DATABASE_URL = process.env.DATABASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required to seed");
if (!ENCRYPTION_KEY || !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error("ENCRYPTION_KEY (64 hex chars) is required to seed encrypted stock");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
const key = Buffer.from(ENCRYPTION_KEY, "hex");

/** AES-256-GCM — mirrors CryptoService so delivered stock decrypts at runtime. */
function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function code(len: number): string {
  const b = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i += 1) out += CODE_ALPHABET[b[i]! % CODE_ALPHABET.length];
  return out;
}
function referralCode(): string {
  return code(8);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Builds an encrypted stock payload appropriate to the delivery type. */
function stockContent(product: SeedProduct, index: number): string {
  switch (product.deliveryType) {
    case "AUTO_CREDENTIALS":
      return `email: ${product.slug}.${index}@delivery.7mz.store\npassword: ${code(4)}-${code(4)}-${code(4)}`;
    case "AUTO_FILE":
      return `https://files.7mz.store/${product.slug}/${code(10)}.zip`;
    case "AUTO_CODE":
    default:
      return `${code(4)}-${code(4)}-${code(4)}-${code(4)}`;
  }
}

const REVIEW_COMMENTS = [
  "Worked instantly, exactly as described. Will buy again!",
  "Super fast delivery, code worked first try.",
  "Great price and zero hassle. Highly recommend.",
  "Delivered in seconds. Smooth experience.",
  "Legit and reliable. Been using 7MZ for months.",
  "Best prices I've found anywhere. Instant too.",
  "Had a small issue but support fixed it in minutes.",
  "Exactly what I needed, no complaints.",
  null,
  null,
];

async function clean(): Promise<void> {
  // FK-safe deletion order.
  await prisma.$transaction([
    prisma.spinResult.deleteMany(),
    prisma.dailyRewardClaim.deleteMany(),
    prisma.userMission.deleteMany(),
    prisma.referralEarning.deleteMany(),
    prisma.couponRedemption.deleteMany(),
    prisma.promoRedemption.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.review.deleteMany(),
    prisma.cartItem.deleteMany(),
  ]);
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.stockItem.deleteMany(),
    prisma.productFaq.deleteMany(),
  ]);
  await prisma.$transaction([
    prisma.banner.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.promoCode.deleteMany(),
    prisma.mission.deleteMany(),
    prisma.spinPrize.deleteMany(),
    prisma.helpArticle.deleteMany(),
    prisma.helpCategory.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.paymentGateway.deleteMany(),
    prisma.loginHistory.deleteMany(),
    prisma.session.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.withdrawalRequest.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.setting.deleteMany(),
  ]);
  await prisma.user.deleteMany();
}

async function seedSettings(): Promise<void> {
  const settings: { key: string; value: unknown; group: string }[] = [
    { key: "store.name", value: "7MZ Store", group: "general" },
    { key: "store.currency", value: "USD", group: "general" },
    { key: "store.supportUsername", value: "@SevenMZSupport", group: "general" },
    { key: "referral.commissionPercent", value: 5, group: "growth" },
    { key: "wallet.minDeposit", value: 1, group: "wallet" },
    { key: "wallet.minWithdrawal", value: 5, group: "wallet" },
    { key: "bot.welcomeMessage", value: "Welcome to 7MZ Store — premium digital goods, instant delivery.", group: "bot" },
  ];
  for (const s of settings) {
    await prisma.setting.create({ data: { key: s.key, value: s.value as object, group: s.group } });
  }
}

async function seedGateways(): Promise<void> {
  const gateways = [
    { provider: "balance", displayName: "Wallet Balance", description: "Pay instantly from your 7MZ balance", icon: "Wallet", isEnabled: true, isTestMode: false, sortOrder: 0, feePercent: 0 },
    { provider: "telegram_stars", displayName: "Telegram Stars", description: "Pay with Telegram Stars", icon: "Star", isEnabled: true, isTestMode: true, sortOrder: 1, feePercent: 0 },
    { provider: "crypto", displayName: "Crypto", description: "USDT, TON, BTC and more", icon: "Bitcoin", isEnabled: true, isTestMode: true, sortOrder: 2, feePercent: 0 },
    { provider: "stripe", displayName: "Card", description: "Visa, Mastercard, Amex", icon: "CreditCard", isEnabled: true, isTestMode: true, sortOrder: 3, feePercent: 2.9 },
    { provider: "paypal", displayName: "PayPal", description: "Pay with your PayPal account", icon: "Wallet", isEnabled: true, isTestMode: true, sortOrder: 4, feePercent: 3.4 },
    { provider: "binance_pay", displayName: "Binance Pay", description: "Pay with Binance", icon: "Coins", isEnabled: true, isTestMode: true, sortOrder: 5, feePercent: 0 },
    { provider: "coinbase_commerce", displayName: "Coinbase", description: "Coinbase Commerce checkout", icon: "Coins", isEnabled: false, isTestMode: true, sortOrder: 6, feePercent: 0 },
  ];
  for (const g of gateways) {
    await prisma.paymentGateway.create({
      data: { ...g, minAmount: 1, maxAmount: 10000 },
    });
  }
}

async function seedCatalog(): Promise<Map<string, { id: string; product: SeedProduct }>> {
  const productMap = new Map<string, { id: string; product: SeedProduct }>();
  let categoryOrder = 0;

  for (const cat of SEED_CATEGORIES) {
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        accentColor: cat.accentColor,
        description: cat.description,
        sortOrder: categoryOrder++,
      },
    });

    for (const p of cat.products) {
      const flashSaleEndsAt = p.isFlashSale && p.flashSaleDays
        ? new Date(Date.now() + p.flashSaleDays * 86_400_000)
        : null;

      const product = await prisma.product.create({
        data: {
          categoryId: category.id,
          name: p.name,
          slug: p.slug,
          shortDescription: p.shortDescription,
          description: p.description,
          brandColor: p.brandColor,
          price: p.price,
          compareAtPrice: p.compareAtPrice ?? null,
          thumbnail: p.thumbnail,
          images: p.images,
          features: p.features,
          tags: p.tags,
          deliveryType: p.deliveryType,
          deliveryNote: p.deliveryNote,
          stockCount: p.stock,
          soldCount: p.soldCount,
          viewCount: p.soldCount * 7 + Math.floor(Math.random() * 400),
          rating: p.rating,
          reviewCount: p.reviewCount,
          isFeatured: p.isFeatured ?? false,
          isFlashSale: p.isFlashSale ?? false,
          flashSaleEndsAt,
          createdAt: p.isNewArrival
            ? new Date(Date.now() - 3 * 86_400_000)
            : new Date(Date.now() - (20 + (p.soldCount % 40)) * 86_400_000),
          faqs: {
            create: p.faqs.map((f, i) => ({ question: f.question, answer: f.answer, sortOrder: i })),
          },
          stockItems: {
            create: Array.from({ length: p.stock }).map((_, i) => ({
              status: "AVAILABLE" as const,
              content: encrypt(stockContent(p, i)),
            })),
          },
        },
      });
      productMap.set(p.slug, { id: product.id, product: p });
    }
  }
  return productMap;
}

async function seedBanners(productMap: Map<string, { id: string; product: SeedProduct }>): Promise<void> {
  for (const b of SEED_BANNERS) {
    await prisma.banner.create({
      data: {
        eyebrow: b.eyebrow,
        title: b.title,
        subtitle: b.subtitle,
        image: b.image,
        ctaLabel: b.ctaLabel,
        ctaUrl: b.ctaUrl ?? null,
        accentColor: b.accentColor,
        sortOrder: b.sortOrder,
        productId: b.productSlug ? (productMap.get(b.productSlug)?.id ?? null) : null,
      },
    });
  }
}

async function seedPromotions(): Promise<void> {
  for (const c of SEED_COUPONS) {
    await prisma.coupon.create({
      data: {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrderAmount: c.minOrderAmount ?? null,
        maxDiscount: c.maxDiscount ?? null,
        usageLimit: c.usageLimit ?? null,
        perUserLimit: c.perUserLimit,
        expiresAt: new Date(Date.now() + 90 * 86_400_000),
      },
    });
  }
  for (const p of SEED_PROMO_CODES) {
    await prisma.promoCode.create({
      data: { code: p.code, amount: p.amount, maxRedemptions: p.maxRedemptions },
    });
  }
  // The coupon awarded by the spin wheel.
  await prisma.coupon.create({
    data: {
      code: "SPIN10",
      type: "PERCENTAGE",
      value: 10,
      maxDiscount: 10,
      perUserLimit: 1,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    },
  });
}

async function seedGrowth(): Promise<void> {
  for (const m of SEED_MISSIONS) {
    await prisma.mission.create({ data: m });
  }
  let order = 0;
  for (const s of SEED_SPIN_PRIZES) {
    await prisma.spinPrize.create({
      data: {
        label: s.label,
        type: s.type,
        value: s.value,
        weight: s.weight,
        color: s.color,
        couponCode: "couponCode" in s ? (s.couponCode as string) : null,
        sortOrder: order++,
      },
    });
  }
}

async function seedHelp(): Promise<void> {
  let catOrder = 0;
  for (const c of SEED_HELP) {
    const category = await prisma.helpCategory.create({
      data: { name: c.name, icon: c.icon, sortOrder: catOrder++ },
    });
    let artOrder = 0;
    for (const a of c.articles) {
      await prisma.helpArticle.create({
        data: {
          categoryId: category.id,
          slug: a.slug,
          title: a.title,
          body: a.body,
          tags: a.tags,
          sortOrder: artOrder++,
          views: Math.floor(Math.random() * 500),
        },
      });
    }
  }

  await prisma.announcement.create({
    data: {
      title: "Flash Sale",
      body: "Up to 60% off streaming & AI this week only.",
      level: "info",
      isActive: true,
    },
  });
}

async function seedUsersAndActivity(
  productMap: Map<string, { id: string; product: SeedProduct }>,
): Promise<void> {
  // --- Admin -----------------------------------------------------------------
  await prisma.user.create({
    data: {
      telegramId: BigInt(100000001),
      firstName: "7MZ",
      lastName: "Admin",
      username: "sevenmz_admin",
      role: "SUPER_ADMIN",
      referralCode: referralCode(),
      balance: 0,
      email: "admin@7mz.store",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      telegramId: BigInt(100000002),
      firstName: "Support",
      lastName: "Agent",
      username: "sevenmz_support",
      role: "SUPPORT",
      referralCode: referralCode(),
      email: "support@7mz.store",
      emailVerifiedAt: new Date(),
    },
  });

  // --- Demo customers --------------------------------------------------------
  const firstNames = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Jamie", "Chris", "Robin", "Dana", "Kai"];
  const customers = [];
  for (let i = 0; i < 12; i += 1) {
    const c = await prisma.user.create({
      data: {
        telegramId: BigInt(200000000 + i),
        firstName: pick(firstNames),
        username: `user_${code(5).toLowerCase()}`,
        role: "CUSTOMER",
        referralCode: referralCode(),
        balance: Number((Math.random() * 40).toFixed(2)),
        dailyStreak: Math.floor(Math.random() * 6),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 86_400_000),
      },
    });
    customers.push(c);
  }

  // --- Reviews (verified purchases) ------------------------------------------
  const products = [...productMap.values()];
  for (const { id: productId, product } of products) {
    const count = Math.min(product.reviewCount, 6);
    const used = new Set<string>();
    for (let i = 0; i < count; i += 1) {
      const reviewer = pick(customers);
      if (used.has(reviewer.id)) continue;
      used.add(reviewer.id);
      await prisma.review.create({
        data: {
          productId,
          userId: reviewer.id,
          rating: Math.random() > 0.15 ? 5 : 4,
          comment: pick(REVIEW_COMMENTS),
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 40) * 86_400_000),
        },
      });
    }
  }

  // --- Completed orders (for revenue analytics) ------------------------------
  for (let i = 0; i < 40; i += 1) {
    const buyer = pick(customers);
    const entry = pick(products);
    const qty = Math.random() > 0.8 ? 2 : 1;
    const unit = entry.product.price;
    const subtotal = Number((unit * qty).toFixed(2));
    const daysAgo = Math.floor(Math.random() * 45);
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000);

    const order = await prisma.order.create({
      data: {
        orderNumber: `7MZ-${code(6)}`,
        userId: buyer.id,
        status: "COMPLETED",
        subtotal,
        discount: 0,
        total: subtotal,
        completedAt: createdAt,
        createdAt,
        items: {
          create: {
            productId: entry.id,
            productName: entry.product.name,
            thumbnail: entry.product.thumbnail,
            unitPrice: unit,
            quantity: qty,
            total: subtotal,
            deliveredAt: createdAt,
          },
        },
      },
    });

    await prisma.payment.create({
      data: {
        userId: buyer.id,
        orderId: order.id,
        purpose: "ORDER",
        provider: pick(["balance", "crypto", "stripe", "telegram_stars"]),
        status: "COMPLETED",
        amount: subtotal,
        confirmedAt: createdAt,
        createdAt,
      },
    });

    await prisma.transaction.create({
      data: {
        userId: buyer.id,
        type: "PURCHASE",
        amount: -subtotal,
        balanceBefore: subtotal,
        balanceAfter: 0,
        description: `Purchase · ${entry.product.name}`,
        reference: order.orderNumber,
        orderId: order.id,
        createdAt,
      },
    });
  }
}

async function hash(v: string): Promise<string> {
  return createHash("sha256").update(v).digest("hex");
}

async function main(): Promise<void> {
  console.log("🌱 Seeding 7MZ Store ...");
  await clean();
  console.log("  ✓ cleared existing data");

  await seedSettings();
  await seedGateways();
  console.log("  ✓ settings + payment gateways");

  const productMap = await seedCatalog();
  console.log(`  ✓ ${SEED_CATEGORIES.length} categories, ${productMap.size} products (encrypted stock)`);

  await seedBanners(productMap);
  await seedPromotions();
  await seedGrowth();
  await seedHelp();
  console.log("  ✓ banners, coupons, missions, spin prizes, help center");

  await seedUsersAndActivity(productMap);
  console.log("  ✓ admin, demo customers, reviews, orders");

  // Silence unused-import lint for the hash helper (reserved for API-key seeds).
  void hash;

  const [users, products, orders] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);
  console.log(`\n✅ Seed complete — ${users} users, ${products} products, ${orders} orders`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
