import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Shimmer skeleton — geometry-matched loading placeholder.
 * Size it with width/height utilities to mirror the real content exactly.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-xl bg-surface-2", className)}
      {...props}
    >
      <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.055)_50%,transparent_75%)] bg-[length:200%_100%]" />
    </div>
  );
}

/** Text-line skeleton with natural width jitter. */
export function SkeletonText({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-[86%]", "w-[72%]", "w-[91%]", "w-[64%]"];
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", widths[i % widths.length])} />
      ))}
    </div>
  );
}
