"use client";

import { motion } from "framer-motion";
import { cn } from "../lib/cn";

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  variant?: "primary" | "accent" | "success" | "warning";
  size?: "sm" | "md";
  className?: string;
}

const fillClasses = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
} as const;

/**
 * Animated progress bar — springs to its target width. Used for missions,
 * stock meters, and upload states.
 */
export function ProgressBar({
  progress,
  variant = "primary",
  size = "sm",
  className,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "w-full overflow-hidden rounded-full bg-white/6",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 22 }}
        className={cn("h-full rounded-full", fillClasses[variant])}
      />
    </div>
  );
}
