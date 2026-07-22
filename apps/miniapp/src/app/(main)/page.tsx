"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, Megaphone, ShoppingBag, WifiOff } from "lucide-react";
import type { BannerDto, CategoryDto, ProductCardDto } from "@7mz/shared";
import { Badge, Button, EmptyState, Skeleton, cn } from "@7mz/ui";
import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";
import { useHomeFeed } from "@/hooks/use-home-feed";
import { haptics } from "@/lib/telegram/haptics";
import { useAuthStore } from "@/stores/auth-store";
import { useTelegram } from "@/lib/telegram/telegram-provider";

// ----------------------------------------------------------------------------
// Sections
// ----------------------------------------------------------------------------

function HeroBanner({ banner }: { banner: BannerDto }) {
  const href = banner.productSlug ? `/product/${banner.productSlug}` : (banner.ctaUrl ?? "/search");
  const accent = banner.accentColor ?? "#ffd43b";

  return (
    <Link href={href} onClick={() => haptics.tap()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.985 }}
        className="relative h-44 overflow-hidden rounded-card-lg border border-border shadow-card"
      >
        <Image src={banner.image} alt={banner.title} fill sizes="448px" className="object-cover" priority />
        {/* Layered scrim system — readable copy without murdering the art. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(60% 100% at 0% 100%, ${accent}33, transparent 70%)` }}
        />
        <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5">
          {banner.eyebrow && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: accent }}
            >
              {banner.eyebrow}
            </span>
          )}
          <h2 className="max-w-[70%] text-balance text-2xl font-bold leading-tight tracking-tight text-white">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="max-w-[62%] text-[13px] leading-snug text-white/70">{banner.subtitle}</p>
          )}
          {banner.ctaLabel && (
            <span className="mt-1.5 inline-flex h-9 w-fit items-center gap-1 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-on-primary shadow-glow-primary">
              {banner.ctaLabel}
              {banner.productPrice && <span className="tabular-nums">· ${banner.productPrice}</span>}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

function CategoryRail({ categories }: { categories: CategoryDto[] }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
      {categories.map((category, i) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.35, ease: "easeOut" }}
        >
          <Link
            href={`/search?category=${category.slug}`}
            onClick={() => haptics.tap()}
            className="glass-subtle flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium text-fg-secondary transition-colors hover:bg-white/8 hover:text-fg"
          >
            {category.name}
            <span className="text-[11px] tabular-nums text-fg-tertiary">
              {category.productCount}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <Link
        href={href}
        onClick={() => haptics.tap()}
        className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-primary transition-opacity hover:opacity-80"
      >
        See all <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );
}

function ProductGrid({ products }: { products: ProductCardDto[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Loading & error states
// ----------------------------------------------------------------------------

function HomeSkeleton() {
  return (
    <div className="space-y-6 px-4 pt-4">
      <Skeleton className="h-44 rounded-card-lg" />
      <div className="-mx-4 flex gap-2 overflow-hidden px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function HomePage() {
  const { data, isLoading, isError, refetch, isRefetching } = useHomeFeed();
  const status = useAuthStore((s) => s.status);
  const { retryAuth } = useTelegram();

  if (status === "booting" || isLoading) {
    return <HomeSkeleton />;
  }

  if (status === "error" || isError || !data) {
    return (
      <EmptyState
        icon={<WifiOff />}
        title="Can't reach the store"
        description="Check your connection and try again — we'll be right here."
        className="pt-24"
        action={
          <Button
            variant="secondary"
            loading={isRefetching}
            onClick={() => {
              haptics.press();
              if (status === "error") retryAuth();
              else void refetch();
            }}
          >
            Try again
          </Button>
        }
      />
    );
  }

  const hasAnyProducts =
    data.featured.length > 0 || data.bestSellers.length > 0 || data.flashSale.length > 0;

  return (
    <div className="space-y-7 px-4 pt-4">
      {/* Announcements */}
      {data.announcements.map((a) => (
        <div
          key={a.id}
          className={cn(
            "flex items-start gap-2.5 rounded-2xl border p-3.5 text-[13px] leading-snug",
            a.level === "critical"
              ? "border-danger/25 bg-danger/8 text-danger"
              : a.level === "warning"
                ? "border-warning/25 bg-warning/8 text-warning"
                : "border-accent/20 bg-accent/6 text-fg-secondary",
          )}
        >
          <Megaphone className="mt-px size-4 shrink-0" />
          <div>
            <span className="font-semibold text-fg">{a.title}</span>{" "}
            <span className="opacity-90">{a.body}</span>
          </div>
        </div>
      ))}

      {/* Hero */}
      {data.banners[0] && <HeroBanner banner={data.banners[0]} />}

      {/* Categories */}
      {data.categories.length > 0 && <CategoryRail categories={data.categories} />}

      {/* Flash sale rail */}
      {data.flashSale.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Limited Offers" href="/search?filter=discounted" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
            {data.flashSale.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} compact />
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {data.featured.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Featured" href="/search?filter=featured" />
          <ProductGrid products={data.featured} />
        </section>
      )}

      {/* Best sellers */}
      {data.bestSellers.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Best Sellers" href="/search?sort=popular" />
          <ProductGrid products={data.bestSellers} />
        </section>
      )}

      {!hasAnyProducts && (
        <EmptyState
          icon={<ShoppingBag />}
          title="The shelves are being stocked"
          description="Products are on their way — check back in a moment."
          action={
            <Badge variant="primary" size="md">
              Opening soon
            </Badge>
          }
        />
      )}
    </div>
  );
}
