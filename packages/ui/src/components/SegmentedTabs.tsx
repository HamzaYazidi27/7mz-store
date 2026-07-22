"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/cn";

export interface SegmentedTab<T extends string = string> {
  value: T;
  label: string;
  /** Optional count chip. */
  count?: number;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Segmented control with a spring-animated active thumb (shared layout).
 * The active pill glides between segments at 60fps.
 */
export function SegmentedTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedTabsProps<T>) {
  const layoutId = useId();

  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full items-center gap-1 rounded-btn border border-border bg-surface-2 p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative flex-1 select-none-touch rounded-[10px] font-medium outline-none transition-colors duration-200",
              size === "sm" ? "h-8 text-[13px]" : "h-9 text-sm",
              active ? "text-fg" : "text-fg-secondary hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-[10px] border border-border-strong bg-surface-3 shadow-card"
              />
            )}
            <span className="relative inline-flex items-center justify-center gap-1.5">
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                    active ? "bg-primary/15 text-primary" : "bg-white/6 text-fg-tertiary",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
