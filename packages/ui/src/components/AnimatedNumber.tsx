"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export interface AnimatedNumberProps {
  value: number;
  /** Custom formatter — defaults to locale grouping with no decimals. */
  format?: (n: number) => string;
  className?: string;
  /** Spring feel: "snappy" for counters, "gentle" for balances. */
  feel?: "snappy" | "gentle";
}

/**
 * Animated counter — springs from the previous value to the next.
 * Used for wallet balance, statistics, and checkout totals.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  feel = "gentle",
}: AnimatedNumberProps) {
  const raw = useMotionValue(value);
  const spring = useSpring(raw, {
    stiffness: feel === "snappy" ? 180 : 80,
    damping: feel === "snappy" ? 24 : 20,
  });
  const display = useTransform(spring, (v) =>
    format ? format(v) : Math.round(v).toLocaleString("en-US"),
  );

  useEffect(() => {
    raw.set(value);
  }, [value, raw]);

  return (
    <motion.span className={className} data-value={value}>
      {display}
    </motion.span>
  );
}

/** Currency-formatted animated counter (2 decimals, tabular). */
export function AnimatedMoney({
  value,
  currency = "USD",
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      className={className}
      format={(v) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(v)
      }
    />
  );
}
