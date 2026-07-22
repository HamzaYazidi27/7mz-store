"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Designed empty state — soft glowing icon well, headline, supporting copy
 * and an optional call to action. Fades up on mount.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col items-center px-6 py-14 text-center", className)}
    >
      {icon && (
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative grid size-16 place-items-center rounded-2xl border border-border bg-surface-2 text-fg-secondary shadow-card [&>svg]:size-7">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-fg">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-fg-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
