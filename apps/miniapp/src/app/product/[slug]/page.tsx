"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  Minus,
  Plus,
  PackageOpen,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { DELIVERY_TYPE_LABELS } from "@7mz/shared";
import { Badge, Button, PriceTag, Rating, RatingStars, Skeleton, cn } from "@7mz/ui";
import { ProductCard } from "@/components/product/ProductCard";
import { useProduct, useRelatedProducts, useReviews } from "@/lib/api/hooks";
import { useCartStore } from "@/stores/cart-store";
import { haptics } from "@/lib/telegram/haptics";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";
import { relativeTime } from "@7mz/shared";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  useTelegramBackButton();

  const { data: product, isLoading } = useProduct(slug);
  const { data: related } = useRelatedProducts(slug);
  const { data: reviews } = useReviews(slug);
  const addToCart = useCartStore((s) => s.add);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (isLoading || !product) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md">
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  const soldOut = product.stockCount <= 0;
  const glow = product.brandColor ?? "#3f3f46";
  const images = product.images.length > 0 ? product.images : product.thumbnail ? [product.thumbnail] : [];

  const buyNow = () => {
    haptics.press();
    addToCart(product, quantity);
    router.push(`/checkout?buy=${product.id}&qty=${quantity}`);
  };

  const handleAddToCart = () => {
    haptics.notify("success");
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-28">
      {/* Floating back button (for browser / non-Telegram) */}
      <button
        type="button"
        onClick={() => router.back()}
        className="glass fixed left-4 top-4 z-30 grid size-10 place-items-center rounded-full text-fg"
        aria-label="Back"
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Gallery */}
      <div className="relative aspect-square w-full overflow-hidden bg-surface">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `radial-gradient(80% 80% at 50% 20%, ${glow}33, transparent 70%)` }}
        />
        {images[activeImage] ? (
          <Image
            src={images[activeImage]!}
            alt={product.name}
            fill
            sizes="448px"
            className="object-contain p-10"
            priority
          />
        ) : (
          <div className="grid size-full place-items-center">
            <PackageOpen className="size-16 text-fg-tertiary" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.discountPercent != null && <Badge variant="primary">−{product.discountPercent}%</Badge>}
          {product.isFlashSale && (
            <Badge variant="warning">
              <Zap className="size-3" /> FLASH SALE
            </Badge>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === activeImage ? "w-5 bg-primary" : "w-1.5 bg-white/30",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 p-4">
        {/* Title + price */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] font-bold leading-tight tracking-tight">{product.name}</h1>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <Rating value={product.rating} count={product.reviewCount} size="md" />
            <span className="text-xs text-fg-tertiary">·</span>
            <span className="text-xs text-fg-tertiary">{product.soldCount} sold</span>
          </div>
          <div className="mt-3">
            <PriceTag
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              currency={product.currency}
              size="xl"
            />
          </div>
        </div>

        {/* Trust row */}
        <div className="grid grid-cols-3 gap-2">
          <TrustCell icon={<Truck className="size-4" />} label={
            DELIVERY_TYPE_LABELS[product.deliveryType].replace("Instant ", "Instant\n")
          } />
          <TrustCell
            icon={<PackageOpen className="size-4" />}
            label={soldOut ? "Out of stock" : `${product.stockCount} in stock`}
            tone={soldOut ? "danger" : product.stockCount <= 10 ? "warning" : "default"}
          />
          <TrustCell icon={<ShieldCheck className="size-4" />} label={"Buyer\nprotection"} />
        </div>

        {/* Features */}
        {product.features.length > 0 && (
          <div className="rounded-card border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">What's included</h3>
            <ul className="space-y-2">
              {product.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-fg-secondary">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        <Section title="Description">
          <div className="whitespace-pre-line text-[14px] leading-relaxed text-fg-secondary">
            {product.description.replace(/^#+\s.*$/gm, "").replace(/\*\*/g, "").trim()}
          </div>
        </Section>

        {/* Reviews */}
        {reviews && reviews.summary.total > 0 && (
          <Section title={`Reviews (${reviews.summary.total})`}>
            <div className="mb-4 flex items-center gap-4 rounded-card border border-border bg-surface p-4">
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums text-primary">
                  {reviews.summary.average.toFixed(1)}
                </div>
                <RatingStars value={reviews.summary.average} size="sm" className="mt-1" />
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.summary.distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                  const pct = reviews.summary.total ? (count / reviews.summary.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-3 text-[11px] tabular-nums text-fg-tertiary">{star}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              {reviews.items.slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-card border border-border bg-surface p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">
                      {r.user.firstName}
                      {r.verifiedPurchase && (
                        <Badge variant="success" className="ml-2">
                          Verified
                        </Badge>
                      )}
                    </span>
                    <RatingStars value={r.rating} size="sm" />
                  </div>
                  {r.comment && <p className="mt-2 text-[13px] leading-relaxed text-fg-secondary">{r.comment}</p>}
                  <p className="mt-1.5 text-[11px] text-fg-tertiary">{relativeTime(r.createdAt)}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* FAQ */}
        {product.faqs.length > 0 && (
          <Section title="FAQ">
            <div className="space-y-2">
              {product.faqs.map((faq) => (
                <div key={faq.id} className="overflow-hidden rounded-card border border-border bg-surface">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      setOpenFaq(openFaq === faq.id ? null : faq.id);
                    }}
                    className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
                  >
                    <span className="text-[13px] font-medium">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-fg-tertiary transition-transform",
                        openFaq === faq.id && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="px-3.5 pb-3.5 text-[13px] leading-relaxed text-fg-secondary">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Related */}
        {related && related.length > 0 && (
          <Section title="You might also like">
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} compact />
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Sticky purchase bar */}
      <div className="glass fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-white/5 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="flex items-center gap-3">
          {!soldOut && (
            <div className="flex h-12 items-center rounded-btn border border-border bg-surface-2">
              <button
                type="button"
                onClick={() => {
                  haptics.tap();
                  setQuantity((q) => Math.max(1, q - 1));
                }}
                className="grid size-12 place-items-center text-fg-secondary"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => {
                  haptics.tap();
                  setQuantity((q) => Math.min(product.stockCount, q + 1));
                }}
                className="grid size-12 place-items-center text-fg-secondary"
              >
                <Plus className="size-4" />
              </button>
            </div>
          )}
          <Button
            variant="secondary"
            size="lg"
            className="shrink-0"
            disabled={soldOut}
            onClick={handleAddToCart}
          >
            {added ? "Added ✓" : "Add to cart"}
          </Button>
          <Button variant="primary" size="lg" fullWidth disabled={soldOut} onClick={buyNow}>
            {soldOut ? "Sold out" : "Buy now"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function TrustCell({
  icon,
  label,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-card border border-border bg-surface px-2 py-3 text-center">
      <span
        className={cn(
          "text-primary",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
        )}
      >
        {icon}
      </span>
      <span className="whitespace-pre-line text-[11px] font-medium leading-tight text-fg-secondary">
        {label}
      </span>
    </div>
  );
}
