import { Star } from "lucide-react";
import { cn } from "../lib/cn";

export interface RatingProps {
  value: number; // 0..5
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

/**
 * Star rating — compact chip form used on cards and product pages.
 */
export function Rating({ value, count, size = "sm", showValue = true, className }: RatingProps) {
  const starSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className={cn(starSize, "fill-primary text-primary")} />
      {showValue && (
        <span
          className={cn(
            "font-semibold tabular-nums text-fg",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          {value > 0 ? value.toFixed(1) : "New"}
        </span>
      )}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn("tabular-nums text-fg-tertiary", size === "sm" ? "text-xs" : "text-sm")}
        >
          ({count})
        </span>
      )}
    </span>
  );
}

export interface RatingStarsProps {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Full 5-star row with partial fill — for review summaries. */
export function RatingStars({ value, size = "md", className }: RatingStarsProps) {
  const starSize = size === "sm" ? "size-3.5" : size === "md" ? "size-[18px]" : "size-6";

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, value - i));
        return (
          <span key={i} className="relative inline-flex">
            <Star className={cn(starSize, "text-border-strong")} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={cn(starSize, "fill-primary text-primary")} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
