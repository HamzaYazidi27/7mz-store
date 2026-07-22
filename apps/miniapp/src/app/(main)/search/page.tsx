"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { PRODUCT_SORT_LABELS, PRODUCT_SORT_OPTIONS, type ProductSort } from "@7mz/shared";
import { Badge, Button, EmptyState, Input, Sheet, Spinner, cn } from "@7mz/ui";
import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";
import { useCategories, useProducts, type ProductFilters } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SearchInner() {
  const params = useSearchParams();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | undefined>(params.get("category") ?? undefined);
  const [sort, setSort] = useState<ProductSort>(
    (params.get("sort") as ProductSort) ?? "popular",
  );
  const [onSale, setOnSale] = useState(params.get("filter") === "discounted");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedTerm = useDebounced(term);
  const filters: ProductFilters = useMemo(
    () => ({ search: debouncedTerm || undefined, category, sort, onSale: onSale || undefined }),
    [debouncedTerm, category, sort, onSale],
  );

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts(filters);
  const { data: categories } = useCategories();

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const products = data?.pages.flatMap((p) => p.items) ?? [];
  const activeFilterCount = (category ? 1 : 0) + (onSale ? 1 : 0) + (sort !== "popular" ? 1 : 0);

  const reset = useCallback(() => {
    setCategory(undefined);
    setSort("popular");
    setOnSale(false);
  }, []);

  return (
    <div className="px-4 pt-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search products…"
          leftIcon={<SearchIcon />}
          autoFocus
          rightSlot={
            term ? (
              <button
                type="button"
                onClick={() => setTerm("")}
                className="grid size-8 place-items-center rounded-full text-fg-tertiary hover:text-fg"
              >
                <X className="size-4" />
              </button>
            ) : undefined
          }
        />
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setFiltersOpen(true);
          }}
          className={cn(
            "relative grid size-12 shrink-0 place-items-center rounded-btn border border-border bg-surface-2 text-fg-secondary transition-colors hover:text-fg",
            activeFilterCount > 0 && "border-primary/40 text-primary",
          )}
        >
          <SlidersHorizontal className="size-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Category chips */}
      {categories && categories.length > 0 && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          <Chip active={!category} onClick={() => setCategory(undefined)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={category === c.slug}
              onClick={() => setCategory(category === c.slug ? undefined : c.slug)}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState icon={<SearchIcon />} title="Search failed" description="Please try again." />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<SearchIcon />}
            title="No products found"
            description={term ? `Nothing matches "${term}".` : "Try a different filter."}
            action={
              activeFilterCount > 0 ? (
                <Button variant="secondary" onClick={reset}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
            <div ref={sentinel} className="h-10" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters sheet */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters & Sort">
        <div className="space-y-6">
          <div>
            <h4 className="mb-2 text-[13px] font-semibold text-fg-secondary">Sort by</h4>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCT_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    haptics.select();
                    setSort(opt);
                  }}
                  className={cn(
                    "h-10 rounded-btn border text-[13px] font-medium transition-colors",
                    sort === opt
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-surface-2 text-fg-secondary",
                  )}
                >
                  {PRODUCT_SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-btn border border-border bg-surface-2 px-4 py-3">
            <span className="text-sm font-medium">On sale only</span>
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                setOnSale((v) => !v);
              }}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                onSale ? "bg-primary" : "bg-white/10",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
                  onSale ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </button>
          </label>

          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={reset}>
              Reset
            </Button>
            <Button variant="primary" fullWidth onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptics.tap();
        onClick();
      }}
      className={cn(
        "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-surface-2 text-fg-secondary",
      )}
    >
      {children}
    </button>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="grid place-items-center py-24"><Spinner size="lg" /></div>}>
      <SearchInner />
    </Suspense>
  );
}
