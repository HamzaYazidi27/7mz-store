import { cn } from "../lib/cn";

export interface PriceTagProps {
  price: string | number;
  compareAtPrice?: string | number | null;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: { price: "text-[15px]", old: "text-xs" },
  md: { price: "text-lg", old: "text-[13px]" },
  lg: { price: "text-2xl", old: "text-sm" },
  xl: { price: "text-[32px] leading-none", old: "text-base" },
} as const;

function fmt(value: string | number, currency: string): string {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Price lockup — bold tabular primary price with optional struck-through
 * anchor price. The yellow price is a core brand moment; keep it consistent.
 */
export function PriceTag({
  price,
  compareAtPrice,
  currency = "USD",
  size = "md",
  className,
}: PriceTagProps) {
  const s = sizeClasses[size];
  const hasCompare =
    compareAtPrice != null &&
    Number.parseFloat(String(compareAtPrice)) > Number.parseFloat(String(price));

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("font-bold tabular-nums tracking-tight text-primary", s.price)}>
        {fmt(price, currency)}
      </span>
      {hasCompare && (
        <span className={cn("font-medium tabular-nums text-fg-tertiary line-through", s.old)}>
          {fmt(compareAtPrice!, currency)}
        </span>
      )}
    </span>
  );
}
