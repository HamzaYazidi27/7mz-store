import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type BadgeVariant =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  /** Renders a small status dot before the label. */
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary/15 text-primary border-primary/20",
  accent: "bg-accent/12 text-accent border-accent/20",
  success: "bg-success/12 text-success border-success/20",
  warning: "bg-warning/12 text-warning border-warning/20",
  danger: "bg-danger/12 text-danger border-danger/20",
  neutral: "bg-white/6 text-fg-secondary border-white/8",
  outline: "bg-transparent text-fg-secondary border-border-strong",
};

const dotColor: Record<BadgeVariant, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-fg-tertiary",
  outline: "bg-fg-tertiary",
};

/**
 * Unified badge system — one visual language for NEW / discount / stock /
 * status chips across the entire app.
 */
export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold tracking-wide",
        size === "sm" ? "h-[22px] px-2 text-[11px]" : "h-7 px-2.5 text-xs",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotColor[variant])} />}
      {children}
    </span>
  );
}
