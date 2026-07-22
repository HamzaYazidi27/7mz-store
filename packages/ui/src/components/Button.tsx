"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "success";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary font-semibold shadow-glow-primary hover:bg-primary-bright active:bg-primary-deep",
  accent:
    "bg-accent text-on-accent font-semibold shadow-glow-accent hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface-2 text-fg font-medium border border-border hover:bg-surface-3 hover:border-border-strong",
  ghost: "bg-transparent text-fg-secondary font-medium hover:text-fg hover:bg-white/5",
  outline:
    "bg-transparent border border-border-strong text-fg font-medium hover:bg-white/5 hover:border-fg-tertiary",
  danger: "bg-danger text-white font-semibold hover:brightness-110 active:brightness-95",
  success: "bg-success text-white font-semibold hover:brightness-110 active:brightness-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-11 px-5 text-[15px] gap-2 rounded-btn",
  lg: "h-[52px] px-6 text-base gap-2 rounded-btn",
  icon: "size-11 rounded-btn",
  "icon-sm": "size-9 rounded-[10px]",
};

/**
 * Animated button — scales down on tap (spring), shows a spinner while
 * `loading`, and disables itself during loading automatically.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex select-none-touch items-center justify-center whitespace-nowrap outline-none transition-[background-color,border-color,box-shadow,filter] duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-5 animate-spin" />
        </span>
      )}
      <span
        className={cn("inline-flex items-center justify-center gap-[inherit]", loading && "opacity-0")}
      >
        {children as React.ReactNode}
      </span>
    </motion.button>
  );
});
