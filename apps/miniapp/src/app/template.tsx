"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Page transition — every route entrance plays a fast fade + rise.
 * `template.tsx` re-mounts on navigation, which is exactly what we want
 * for a per-page entrance without wrapping every screen manually.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
