/* ============================================================================
   7MZ Store — seed catalog definition
   Realistic demo dataset for local development, staging, and screenshots.
   Product art lives in apps/miniapp/public/catalog and /banners.
   ============================================================================ */

export interface SeedFaq {
  question: string;
  answer: string;
}

export interface SeedProduct {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  brandColor: string;
  thumbnail: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  features: string[];
  tags: string[];
  deliveryType: "AUTO_CODE" | "AUTO_CREDENTIALS" | "AUTO_FILE" | "MANUAL";
  deliveryNote: string;
  stock: number;
  soldCount: number;
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isFlashSale?: boolean;
  flashSaleDays?: number;
  faqs: SeedFaq[];
}

export interface SeedCategory {
  name: string;
  slug: string;
  icon: string;
  accentColor: string;
  description: string;
  products: SeedProduct[];
  children?: SeedCategory[];
}

const faqCommon: SeedFaq[] = [
  {
    question: "How fast is delivery?",
    answer:
      "Instantly. The moment your payment is confirmed, your code or account details appear in your order and are sent to you in Telegram.",
  },
  {
    question: "What if my code doesn't work?",
    answer:
      "Open a support ticket from the order screen within 24 hours and we'll replace it or refund your balance — no questions asked.",
  },
  {
    question: "Is this region-locked?",
    answer:
      "Each listing notes any regional restrictions in the description. When in doubt, ask support before purchasing.",
  },
];

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: "AI",
    slug: "ai",
    icon: "Sparkles",
    accentColor: "#10a37f",
    description: "Premium AI assistants and creative tools",
    products: [
      {
        name: "ChatGPT Plus",
        slug: "chatgpt-plus",
        shortDescription: "1 month of GPT-4o, advanced reasoning, and priority access.",
        description:
          "## ChatGPT Plus — 1 Month\n\nUnlock the full power of OpenAI's flagship assistant. Your account is delivered ready to sign in, with a full month of Plus benefits.\n\n- Access to the latest GPT-4o and advanced reasoning models\n- Faster response speeds, even at peak times\n- Priority access to new features and higher usage limits\n- Advanced data analysis, vision, and voice\n\nDelivered as ready-to-use account credentials. Sign in and start immediately.",
        brandColor: "#10a37f",
        thumbnail: "/catalog/chatgpt.webp",
        images: ["/catalog/chatgpt.webp"],
        price: 9.99,
        compareAtPrice: 20,
        features: ["GPT-4o + reasoning models", "Priority peak-time access", "Voice & vision", "1 month full access"],
        tags: ["ai", "productivity", "openai", "bestseller"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Sign in with the delivered credentials. Do not change the email on the account.",
        stock: 42,
        soldCount: 318,
        rating: 4.8,
        reviewCount: 214,
        isFeatured: true,
        faqs: faqCommon,
      },
      {
        name: "Gemini Advanced",
        isNewArrival: true,
        slug: "gemini-advanced",
        shortDescription: "18-month Gemini Pro subscription link — Google's most capable AI.",
        description:
          "## Gemini Advanced — 18 Months\n\nA long-term subscription to Google's most capable AI, delivered as an activation link tied to your own Google account.\n\n- Access to Gemini's most advanced model\n- 2 TB of Google One storage included\n- Deep integration across Gmail, Docs, and more\n- Redeem on your existing Google account",
        brandColor: "#8b5cf6",
        thumbnail: "/catalog/gemini.webp",
        images: ["/catalog/gemini.webp"],
        price: 44.99,
        compareAtPrice: 360,
        features: ["18 months access", "2 TB storage included", "Workspace integration", "Activation link"],
        tags: ["ai", "google", "subscription", "deal"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Open the delivered link while signed into the Google account you want to upgrade.",
        stock: 8,
        soldCount: 96,
        rating: 4.6,
        reviewCount: 63,
        isFeatured: true,
        faqs: faqCommon,
      },
      {
        name: "Claude Pro",
        isNewArrival: true,
        slug: "claude-pro",
        shortDescription: "1 month of Claude Pro — 5× usage and priority access.",
        description:
          "## Claude Pro — 1 Month\n\nReady-to-use Claude Pro account with a full month of Pro benefits.\n\n- 5× more usage than the free tier\n- Priority access during high-traffic periods\n- Early access to new features\n- Access to the latest Claude models",
        brandColor: "#d97757",
        thumbnail: "/catalog/chatgpt.webp",
        images: ["/catalog/chatgpt.webp"],
        price: 12.99,
        compareAtPrice: 20,
        features: ["5× usage", "Latest Claude models", "Priority access", "1 month"],
        tags: ["ai", "anthropic", "productivity"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Sign in with the delivered credentials.",
        stock: 27,
        soldCount: 141,
        rating: 4.9,
        reviewCount: 88,
        faqs: faqCommon,
      },
      {
        name: "Midjourney Standard",
        slug: "midjourney-standard",
        shortDescription: "1 month of Midjourney — unlimited relaxed image generations.",
        description:
          "## Midjourney Standard — 1 Month\n\nThe leading AI image generator, delivered ready to use.\n\n- ~15 hours of fast GPU time monthly\n- Unlimited relaxed-mode generations\n- Commercial usage rights\n- Access via Discord and the web app",
        brandColor: "#4a4a4a",
        thumbnail: "/catalog/discord.webp",
        images: ["/catalog/discord.webp"],
        price: 24.99,
        compareAtPrice: 30,
        features: ["Unlimited relaxed generations", "15h fast GPU", "Commercial rights", "1 month"],
        tags: ["ai", "images", "creative"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Follow the delivered setup guide to link your Discord.",
        stock: 15,
        soldCount: 73,
        rating: 4.5,
        reviewCount: 41,
        faqs: faqCommon,
      },
    ],
  },
  {
    name: "Streaming",
    slug: "streaming",
    icon: "Clapperboard",
    accentColor: "#e50914",
    description: "Movies, music, and shows — instant access",
    products: [
      {
        name: "Netflix Premium",
        slug: "netflix-premium",
        shortDescription: "Ready Netflix account — 4K Ultra HD, delivered instantly.",
        description:
          "## Netflix Premium\n\nA ready-to-use Netflix Premium account delivered the moment you pay.\n\n- 4K Ultra HD + HDR streaming\n- Watch on 4 devices at once\n- Ad-free, full catalog\n- Click the delivered link and sign in",
        brandColor: "#e50914",
        thumbnail: "/catalog/netflix.webp",
        images: ["/catalog/netflix.webp"],
        price: 5.99,
        compareAtPrice: 22.99,
        features: ["4K Ultra HD + HDR", "4 simultaneous screens", "Ad-free", "Instant delivery"],
        tags: ["streaming", "movies", "bestseller", "deal"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Sign in with the delivered profile. Please don't change the account password.",
        stock: 63,
        soldCount: 512,
        rating: 4.7,
        reviewCount: 389,
        isFeatured: true,
        faqs: faqCommon,
      },
      {
        name: "Spotify Premium",
        slug: "spotify-premium",
        shortDescription: "3 months of Spotify Premium — ad-free, offline, hi-fi.",
        description:
          "## Spotify Premium — 3 Months\n\nMusic without limits, delivered as an activation code.\n\n- Ad-free listening\n- Offline downloads\n- Highest audio quality\n- Redeem on a new or existing account",
        brandColor: "#1db954",
        thumbnail: "/catalog/spotify.webp",
        images: ["/catalog/spotify.webp"],
        price: 8.49,
        compareAtPrice: 33,
        features: ["Ad-free", "Offline downloads", "3 months", "Activation code"],
        tags: ["streaming", "music", "deal"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Redeem the delivered code at spotify.com/redeem.",
        stock: 34,
        soldCount: 276,
        rating: 4.8,
        reviewCount: 198,
        isFeatured: true,
        isFlashSale: true,
        flashSaleDays: 3,
        faqs: faqCommon,
      },
      {
        name: "YouTube Premium",
        slug: "youtube-premium",
        shortDescription: "6 months ad-free YouTube + YouTube Music.",
        description:
          "## YouTube Premium — 6 Months\n\n- Ad-free videos everywhere\n- Background & picture-in-picture play\n- YouTube Music Premium included\n- Downloads for offline viewing",
        brandColor: "#ff0000",
        thumbnail: "/catalog/youtube.webp",
        images: ["/catalog/youtube.webp"],
        price: 15.99,
        compareAtPrice: 83.94,
        features: ["Ad-free", "Background play", "YouTube Music", "6 months"],
        tags: ["streaming", "video", "music", "deal"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Follow the delivered activation instructions.",
        stock: 19,
        soldCount: 154,
        rating: 4.6,
        reviewCount: 97,
        isFlashSale: true,
        flashSaleDays: 2,
        faqs: faqCommon,
      },
    ],
  },
  {
    name: "VPN",
    slug: "vpn",
    icon: "ShieldCheck",
    accentColor: "#3b82f6",
    description: "Privacy and security, worldwide",
    products: [
      {
        name: "NordVPN Premium",
        slug: "nordvpn-premium",
        shortDescription: "1 year of NordVPN — 6 devices, ultra-fast, no logs.",
        description:
          "## NordVPN Premium — 1 Year\n\nMilitary-grade privacy delivered as a ready account.\n\n- 6,000+ servers in 60+ countries\n- Connect up to 6 devices\n- Threat Protection & no-logs policy\n- Blazing-fast NordLynx protocol",
        brandColor: "#4687ff",
        thumbnail: "/catalog/nordvpn.webp",
        images: ["/catalog/nordvpn.webp"],
        price: 29.99,
        compareAtPrice: 143.88,
        features: ["6 devices", "6000+ servers", "No-logs", "1 year"],
        tags: ["vpn", "security", "bestseller", "deal"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Sign in with the delivered credentials on any device.",
        stock: 51,
        soldCount: 431,
        rating: 4.7,
        reviewCount: 287,
        isFeatured: true,
        faqs: faqCommon,
      },
      {
        name: "ExpressVPN",
        slug: "expressvpn",
        shortDescription: "6 months of ExpressVPN — blazing speeds in 90+ countries.",
        description:
          "## ExpressVPN — 6 Months\n\n- Servers in 90+ countries\n- TrustedServer no-logs technology\n- 5 simultaneous connections\n- 24/7 live support",
        brandColor: "#da3940",
        thumbnail: "/catalog/nordvpn.webp",
        images: ["/catalog/nordvpn.webp"],
        price: 24.99,
        compareAtPrice: 59.94,
        features: ["90+ countries", "5 devices", "No-logs", "6 months"],
        tags: ["vpn", "security"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Sign in with the delivered credentials.",
        stock: 22,
        soldCount: 118,
        rating: 4.5,
        reviewCount: 74,
        faqs: faqCommon,
      },
    ],
  },
  {
    name: "Software",
    slug: "software",
    icon: "AppWindow",
    accentColor: "#f59e0b",
    description: "Design, productivity, and OS licenses",
    products: [
      {
        name: "Figma Professional",
        slug: "figma-professional",
        shortDescription: "24-month Figma Pro account — full design & prototyping.",
        description:
          "## Figma Professional — 24 Months\n\nReady Figma account with two years of Professional access.\n\n- Unlimited files & version history\n- Advanced prototyping\n- Team libraries & Dev Mode\n- Email-based sign-in delivered instantly",
        brandColor: "#f24e1e",
        thumbnail: "/catalog/figma.webp",
        images: ["/catalog/figma.webp"],
        price: 10,
        compareAtPrice: 288,
        features: ["24 months", "Unlimited files", "Dev Mode", "Advanced prototyping"],
        tags: ["software", "design", "deal", "bestseller"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Sign in with the delivered email access.",
        stock: 8,
        soldCount: 203,
        rating: 4.8,
        reviewCount: 132,
        isFeatured: true,
        faqs: faqCommon,
      },
      {
        name: "Adobe Creative Cloud",
        slug: "adobe-creative-cloud",
        shortDescription: "1 year — the full Adobe suite, all 20+ apps.",
        description:
          "## Adobe Creative Cloud — 1 Year\n\nThe complete creative suite: Photoshop, Illustrator, Premiere, After Effects, and 20+ more.\n\n- All Creative Cloud desktop & mobile apps\n- 100 GB cloud storage\n- Adobe Fonts & Portfolio\n- 1 full year of access",
        brandColor: "#fa0f00",
        thumbnail: "/catalog/adobe.webp",
        images: ["/catalog/adobe.webp"],
        price: 39.99,
        compareAtPrice: 659.88,
        features: ["All 20+ apps", "100 GB storage", "Adobe Fonts", "1 year"],
        tags: ["software", "design", "deal"],
        deliveryType: "AUTO_CREDENTIALS",
        deliveryNote: "Follow the delivered setup guide.",
        stock: 12,
        soldCount: 167,
        rating: 4.4,
        reviewCount: 109,
        isFlashSale: true,
        flashSaleDays: 4,
        faqs: faqCommon,
      },
      {
        name: "Microsoft 365 Family",
        slug: "microsoft-365-family",
        shortDescription: "1 year — Office apps for up to 6 people, 6 TB storage.",
        description:
          "## Microsoft 365 Family — 1 Year\n\n- Word, Excel, PowerPoint, Outlook\n- Up to 6 users\n- 1 TB OneDrive per user (6 TB total)\n- Works on PC, Mac, and mobile",
        brandColor: "#d83b01",
        thumbnail: "/catalog/microsoft365.webp",
        images: ["/catalog/microsoft365.webp"],
        price: 34.99,
        compareAtPrice: 99.99,
        features: ["6 users", "6 TB storage", "All Office apps", "1 year"],
        tags: ["software", "productivity", "deal"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Redeem the delivered key at microsoft365.com/setup.",
        stock: 29,
        soldCount: 142,
        rating: 4.6,
        reviewCount: 85,
        faqs: faqCommon,
      },
    ],
  },
  {
    name: "Gaming",
    slug: "gaming",
    icon: "Gamepad2",
    accentColor: "#22d3ee",
    description: "Game credit, passes, and in-game currency",
    products: [
      {
        name: "Steam Wallet $50",
        slug: "steam-wallet-50",
        shortDescription: "$50 Steam Wallet code — redeem instantly.",
        description:
          "## Steam Wallet — $50\n\nTop up your Steam balance for games, DLC, and in-game items.\n\n- Instant code delivery\n- Works on any region-matched Steam account\n- No expiration",
        brandColor: "#1b2838",
        thumbnail: "/catalog/steam.webp",
        images: ["/catalog/steam.webp"],
        price: 47.5,
        compareAtPrice: 50,
        features: ["$50 balance", "Instant code", "No expiry", "Global*"],
        tags: ["gaming", "wallet", "steam"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Redeem under Steam → Games → Redeem a Wallet Code.",
        stock: 88,
        soldCount: 421,
        rating: 4.9,
        reviewCount: 301,
        isFeatured: true,
        faqs: faqCommon,
      },
      {
        name: "Discord Nitro",
        slug: "discord-nitro",
        shortDescription: "1 year of Discord Nitro — the full boost.",
        description:
          "## Discord Nitro — 1 Year\n\n- HD video, streaming, and bigger uploads\n- 2 server boosts + 30% off extra boosts\n- Custom emoji everywhere & animated avatar\n- Delivered as a redeemable gift link",
        brandColor: "#5865f2",
        thumbnail: "/catalog/discord.webp",
        images: ["/catalog/discord.webp"],
        price: 39.99,
        compareAtPrice: 99.99,
        features: ["1 year", "2 boosts", "HD streaming", "Gift link"],
        tags: ["gaming", "social", "deal"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Open the delivered gift link while signed into Discord.",
        stock: 44,
        soldCount: 233,
        rating: 4.7,
        reviewCount: 156,
        faqs: faqCommon,
      },
      {
        name: "Xbox Game Pass Ultimate",
        isNewArrival: true,
        slug: "xbox-game-pass-ultimate",
        shortDescription: "3 months Ultimate — 100s of games, cloud, Live Gold.",
        description:
          "## Xbox Game Pass Ultimate — 3 Months\n\n- Hundreds of high-quality games\n- Xbox + PC + cloud gaming\n- Online multiplayer (Live Gold)\n- EA Play included",
        brandColor: "#107c10",
        thumbnail: "/catalog/gaming-controller.webp",
        images: ["/catalog/gaming-controller.webp"],
        price: 26.99,
        compareAtPrice: 53.97,
        features: ["3 months", "Cloud gaming", "Live Gold", "EA Play"],
        tags: ["gaming", "subscription", "deal"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Redeem the delivered code on your Microsoft account.",
        stock: 17,
        soldCount: 129,
        rating: 4.6,
        reviewCount: 78,
        isFlashSale: true,
        flashSaleDays: 5,
        faqs: faqCommon,
      },
    ],
  },
  {
    name: "Gift Cards",
    slug: "gift-cards",
    icon: "Gift",
    accentColor: "#ffd43b",
    description: "Store credit for the world's biggest brands",
    products: [
      {
        name: "Amazon Gift Card $25",
        slug: "amazon-gift-card-25",
        shortDescription: "$25 Amazon gift card — delivered as a code.",
        description:
          "## Amazon Gift Card — $25\n\nRedeemable toward millions of items on Amazon.\n\n- Instant code delivery\n- No fees, no expiration\n- Applies to your Amazon balance",
        brandColor: "#ff9900",
        thumbnail: "/catalog/giftcard.webp",
        images: ["/catalog/giftcard.webp"],
        price: 24,
        compareAtPrice: 25,
        features: ["$25 value", "Instant code", "No expiry"],
        tags: ["giftcard", "shopping"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Redeem at amazon.com/redeem.",
        stock: 120,
        soldCount: 356,
        rating: 4.9,
        reviewCount: 240,
        isFeatured: true,
        faqs: faqCommon,
      },
      {
        name: "Apple Gift Card $50",
        slug: "apple-gift-card-50",
        shortDescription: "$50 Apple gift card — App Store, iCloud, and more.",
        description:
          "## Apple Gift Card — $50\n\nOne card for everything Apple: App Store, iCloud+, Apple Music, hardware, and more.\n\n- Instant code delivery\n- No expiration",
        brandColor: "#a2aaad",
        thumbnail: "/catalog/giftcard.webp",
        images: ["/catalog/giftcard.webp"],
        price: 47,
        compareAtPrice: 50,
        features: ["$50 value", "App Store & more", "Instant code"],
        tags: ["giftcard", "apple"],
        deliveryType: "AUTO_CODE",
        deliveryNote: "Redeem in the App Store or Apple ID settings.",
        stock: 76,
        soldCount: 198,
        rating: 4.8,
        reviewCount: 121,
        faqs: faqCommon,
      },
    ],
  },
];

export const SEED_COUPONS = [
  {
    code: "WELCOME10",
    type: "PERCENTAGE" as const,
    value: 10,
    minOrderAmount: 5,
    maxDiscount: 15,
    usageLimit: 1000,
    perUserLimit: 1,
    description: "10% off your first order",
  },
  {
    code: "SAVE5",
    type: "FIXED" as const,
    value: 5,
    minOrderAmount: 20,
    usageLimit: 500,
    perUserLimit: 3,
    description: "$5 off orders over $20",
  },
  {
    code: "VIP20",
    type: "PERCENTAGE" as const,
    value: 20,
    minOrderAmount: 30,
    maxDiscount: 40,
    usageLimit: 200,
    perUserLimit: 1,
    description: "20% off for VIP members",
  },
];

export const SEED_PROMO_CODES = [
  { code: "FREE2", amount: 2, maxRedemptions: 500 },
  { code: "BONUS5", amount: 5, maxRedemptions: 100 },
];

export const SEED_MISSIONS = [
  {
    code: "COMPLETE_PROFILE",
    title: "Complete your profile",
    description: "Add your email to secure your account.",
    icon: "UserCheck",
    rewardAmount: 0.5,
    target: 1,
    sortOrder: 1,
  },
  {
    code: "BUY_FIRST_PRODUCT",
    title: "Make your first purchase",
    description: "Buy any product to unlock your first reward.",
    icon: "ShoppingBag",
    rewardAmount: 1,
    target: 1,
    sortOrder: 2,
  },
  {
    code: "FIRST_DEPOSIT",
    title: "Top up your wallet",
    description: "Add funds to your balance for the first time.",
    icon: "Wallet",
    rewardAmount: 1,
    target: 1,
    sortOrder: 3,
  },
  {
    code: "INVITE_FRIEND",
    title: "Invite a friend",
    description: "Share your referral link and get a friend to join.",
    icon: "UserPlus",
    rewardAmount: 2,
    target: 1,
    sortOrder: 4,
  },
  {
    code: "LEAVE_REVIEW",
    title: "Leave a review",
    description: "Review a product you purchased.",
    icon: "Star",
    rewardAmount: 0.5,
    target: 1,
    sortOrder: 5,
  },
  {
    code: "SPEND_50",
    title: "Big spender",
    description: "Spend $50 in total across your orders.",
    icon: "Trophy",
    rewardAmount: 5,
    target: 50,
    sortOrder: 6,
  },
];

export const SEED_SPIN_PRIZES = [
  { label: "$0.25", type: "BALANCE" as const, value: 0.25, weight: 30, color: "#3f3f46" },
  { label: "$0.50", type: "BALANCE" as const, value: 0.5, weight: 24, color: "#22c55e" },
  { label: "Try again", type: "NOTHING" as const, value: 0, weight: 20, color: "#27272a" },
  { label: "$1.00", type: "BALANCE" as const, value: 1, weight: 12, color: "#00e0ff" },
  { label: "10% Coupon", type: "COUPON" as const, value: 0, weight: 8, color: "#8b5cf6", couponCode: "SPIN10" },
  { label: "$2.00", type: "BALANCE" as const, value: 2, weight: 4, color: "#f59e0b" },
  { label: "Try again", type: "NOTHING" as const, value: 0, weight: 18, color: "#27272a" },
  { label: "$5.00 JACKPOT", type: "BALANCE" as const, value: 5, weight: 1, color: "#ffd43b" },
];

export const SEED_BANNERS = [
  {
    eyebrow: "TODAY'S PICK",
    title: "NordVPN — 1 Year",
    subtitle: "Private, fast, and secure. 6 devices, 60+ countries.",
    image: "/banners/vpn.webp",
    ctaLabel: "Buy now",
    accentColor: "#4687ff",
    productSlug: "nordvpn-premium",
    sortOrder: 1,
  },
  {
    eyebrow: "AI COLLECTION",
    title: "Supercharge with AI",
    subtitle: "ChatGPT, Gemini & Claude — premium access for less.",
    image: "/banners/ai.webp",
    ctaLabel: "Explore AI",
    accentColor: "#8b5cf6",
    ctaUrl: "/search?category=ai",
    sortOrder: 2,
  },
  {
    eyebrow: "FLASH SALE",
    title: "Game on for less",
    subtitle: "Steam, Game Pass & Nitro — limited-time prices.",
    image: "/banners/gaming.webp",
    ctaLabel: "Shop gaming",
    accentColor: "#22d3ee",
    ctaUrl: "/search?category=gaming",
    sortOrder: 3,
  },
];

export const SEED_HELP = [
  {
    name: "Getting Started",
    icon: "Rocket",
    articles: [
      {
        slug: "how-to-buy",
        title: "How to buy a product",
        body: "Browse the store, open a product, and tap Buy Now. Choose a payment method — wallet balance, Telegram Stars, crypto, or card — and confirm. Your order and delivery appear instantly.",
        tags: ["orders", "buying"],
      },
      {
        slug: "instant-delivery",
        title: "How instant delivery works",
        body: "Most products are delivered automatically the moment your payment is confirmed. Your codes or credentials appear in the order details and can be copied with one tap.",
        tags: ["delivery"],
      },
    ],
  },
  {
    name: "Payments & Wallet",
    icon: "CreditCard",
    articles: [
      {
        slug: "topping-up",
        title: "Topping up your wallet",
        body: "Open Balance → Deposit, choose an amount and a payment method. Crypto and card deposits are credited automatically once confirmed.",
        tags: ["wallet", "deposit"],
      },
      {
        slug: "refunds",
        title: "Refund policy",
        body: "If a delivered item doesn't work, open a support ticket within 24 hours. Verified issues are refunded to your wallet balance or replaced.",
        tags: ["refunds"],
      },
    ],
  },
];
