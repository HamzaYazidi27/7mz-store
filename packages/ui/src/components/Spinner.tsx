import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <Loader2
      aria-label="Loading"
      className={cn("animate-spin text-fg-secondary", sizes[size], className)}
    />
  );
}

/** Full-area centered spinner for route/section loading. */
export function SpinnerBlock({ className }: { className?: string }) {
  return (
    <div className={cn("grid w-full place-items-center py-16", className)}>
      <Spinner size="lg" />
    </div>
  );
}
