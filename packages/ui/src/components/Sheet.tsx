"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Extra classes for the panel. */
  className?: string;
  /** Hide the drag grabber + disable drag-to-close. */
  locked?: boolean;
}

/**
 * Bottom sheet — the primary modal surface on mobile. Frosted glass panel,
 * spring slide-up, drag-to-dismiss, scroll-locked backdrop.
 */
export function Sheet({ open, onClose, title, children, className, locked = false }: SheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
          />
          <motion.div
            key="sheet-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            drag={locked ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className={cn(
              "glass fixed inset-x-0 bottom-0 z-50 rounded-t-card-lg pb-safe shadow-sheet",
              "mx-auto w-full max-w-md",
              className,
            )}
          >
            {!locked && (
              <div className="flex justify-center pb-1 pt-3">
                <div className="h-1 w-9 rounded-full bg-white/15" />
              </div>
            )}
            {(title || !locked) && (
              <div className={cn("flex items-center justify-between px-5", locked && "pt-5")}>
                <h2 className="text-[17px] font-semibold text-fg">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid size-8 place-items-center rounded-full bg-white/6 text-fg-secondary transition-colors hover:bg-white/10 hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="max-h-[78vh] overflow-y-auto scrollbar-none px-5 pb-6 pt-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
