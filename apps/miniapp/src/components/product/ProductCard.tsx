"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { PackageOpen, Zap } from "lucide-react";
import type { ProductCardDto } from "@7mz/shared";
import { Badge, PriceTag, Rating, Skeleton, cn } from "@7mz/ui";
import { haptics } from "@/lib/telegram/haptics";

export interface ProductCardProps {
  product: ProductCardDto;
  /** Stagger index for entrance animation. */
  index?: number;
  /** Compact width for horizontal rails. */
  compact?: boolean;
  className?: string;
}

/**
 * Product card — the core commerce surface. Dark media tile with a per-brand
 * radial glow (instead of harsh white blocks), unified badge stack, yellow
 * tabular price with anchor strikethrough, rating chip and stock signal.
 */
export function ProductCard({ product, index = 0, compact = false, className }: ProductCardProps) {
  const soldOut = product.stockCount <= 0;
  const lowStock = !soldOut && product.stockCount <= 10;
  const glow = product.brandColor ?? "#3f3f46";

  return (
    <Link
      href={`/product/${product.slug}`}
      onClick={() => haptics.tap()}
      className={cn("block", compact && "w-40 shrink-0", className)}
    >
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.97 }}
        className="group relative overflow-hidden rounded-card border border-border bg-surface shadow-card transition-[border-color,box-shadow] duration-300 hover:border-border-strong hover:shadow-card-hover"
      >
        {/* Media tile */}
        <div className={cn("relative overflow-hidden", compact ? "aspect-square" : "aspect-[4/3]")}>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(90% 90% at 50% 12%, ${glow}30, transparent 72%)`,
            }}
          />
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              sizes={compact ? "160px" : "(max-width: 448px) 50vw, 224px"}
              className={cn(
                "object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]",
                soldOut && "opacity-40 saturate-0",
              )}
            />
          ) : (
            <div className="grid size-full place-items-center">
              <PackageOpen className="size-10 text-fg-tertiary" />
            </div>
          )}

          {/* Badge stack — compact rails show only the strongest signal */}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {product.discountPercent != null && (
              <Badge variant="primary">−{product.discountPercent}%</Badge>
            )}
            {!compact && product.isNew && <Badge variant="accent">NEW</Badge>}
            {!compact && product.isFlashSale && (
              <Badge variant="warning">
                <Zap className="size-3" /> FLASH
              </Badge>
            )}
            {compact && product.discountPercent == null && product.isNew && (
              <Badge variant="accent">NEW</Badge>
            )}
          </div>

          {soldOut && (
            <div className="absolute inset-0 grid place-items-center bg-bg/55 backdrop-blur-[2px]">
              <Badge variant="neutral" size="md">
                Sold out
              </Badge>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3">
          <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight text-fg">
            {product.name}
          </h3>
          {!compact && (
            <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-fg-secondary">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-2.5 flex items-end justify-between gap-2">
            <PriceTag
              price={product.price}
              compareAtPrice={compact ? null : product.compareAtPrice}
              currency={product.currency}
              size="sm"
            />
            <Rating value={product.rating} className="shrink-0" />
          </div>

          {lowStock && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
              <span className="size-1.5 animate-pulse-soft rounded-full bg-warning" />
              Only {product.stockCount} left
            </p>
          )}
        </div>
      </motion.article>
    </Link>
  );
}

/** Geometry-matched loading skeleton for ProductCard. */
export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-border bg-surface",
        compact && "w-40 shrink-0",
      )}
    >
      <Skeleton className={cn("rounded-none", compact ? "aspect-square" : "aspect-[4/3]")} />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        {!compact && <Skeleton className="h-3 w-full" />}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-3.5 w-10" />
        </div>
      </div>
    </div>
  );
}
