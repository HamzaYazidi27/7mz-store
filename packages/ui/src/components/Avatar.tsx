"use client";

import { useState } from "react";
import { cn } from "../lib/cn";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (a + b).toUpperCase() || "?";
}

/**
 * Avatar with graceful fallback — brand-gradient monogram when no photo.
 */
export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none-touch items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 font-semibold text-fg",
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(255,212,59,0.28),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(0,224,255,0.22),transparent_55%)]" />
          <span className="relative">{initialsOf(name)}</span>
        </>
      )}
    </span>
  );
}
