"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover elevation. */
  interactive?: boolean;
}

/**
 * Base surface card — #111113 fill, hairline border, inset top light edge
 * and a soft ambient shadow (the "Linear depth" recipe).
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-border bg-surface shadow-card",
        interactive &&
          "transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  );
});

export interface PressCardProps extends HTMLMotionProps<"div"> {}

/**
 * Tappable card — spring scale on press for touch-first interactions.
 */
export const PressCard = forwardRef<HTMLDivElement, PressCardProps>(function PressCard(
  { className, ...props },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={0}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "cursor-pointer select-none-touch rounded-card border border-border bg-surface shadow-card outline-none",
        "transition-[border-color,box-shadow] duration-300 hover:border-border-strong hover:shadow-card-hover",
        "focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      {...props}
    />
  );
});

/**
 * Frosted glass panel — for floating chrome (headers, overlays, nav).
 */
export const GlassPanel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function GlassPanel({ className, ...props }, ref) {
    return <div ref={ref} className={cn("glass rounded-card", className)} {...props} />;
  },
);
