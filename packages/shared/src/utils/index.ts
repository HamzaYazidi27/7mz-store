// ============================================================================
// Shared utilities — formatting, math, misc helpers used across frontends.
// ============================================================================

/** Formats a monetary value (string | number) as a currency string. */
export function formatPrice(
  value: string | number,
  options: { currency?: string; compact?: boolean; stripZeroCents?: boolean } = {},
): string {
  const { currency = "USD", compact = false, stripZeroCents = true } = options;
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact && Math.abs(num) >= 10_000 ? "compact" : "standard",
    minimumFractionDigits: stripZeroCents && Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(num);
}

/** Formats large counts: 1200 -> "1.2K", 3400000 -> "3.4M". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Computes the discount percentage from price vs compareAtPrice. */
export function discountPercent(
  price: string | number,
  compareAtPrice: string | number | null | undefined,
): number | null {
  if (compareAtPrice == null) return null;
  const p = typeof price === "string" ? Number.parseFloat(price) : price;
  const c = typeof compareAtPrice === "string" ? Number.parseFloat(compareAtPrice) : compareAtPrice;
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= p || c <= 0) return null;
  return Math.round(((c - p) / c) * 100);
}

/** Relative time: "2m ago", "3h ago", "5d ago", falls back to a date. */
export function relativeTime(iso: string | Date, now: Date = new Date()): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Math.max(0, now.getTime() - date.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Formats an ISO date as "Jan 12, 2026 · 14:05". */
export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const d = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const t = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${d} · ${t}`;
}

/** Countdown parts for flash-sale timers. */
export function countdownParts(target: string | Date, now: Date = new Date()) {
  const end = typeof target === "string" ? new Date(target) : target;
  const total = Math.max(0, end.getTime() - now.getTime());
  const seconds = Math.floor(total / 1000) % 60;
  const minutes = Math.floor(total / 60_000) % 60;
  const hours = Math.floor(total / 3_600_000) % 24;
  const days = Math.floor(total / 86_400_000);
  return { total, days, hours, minutes, seconds, expired: total === 0 };
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Truncates a string with an ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Initials for avatar fallbacks: "Ada Lovelace" -> "AL". */
export function initials(firstName: string, lastName?: string | null): string {
  const a = firstName?.trim().charAt(0) ?? "";
  const b = lastName?.trim().charAt(0) ?? "";
  return (a + b).toUpperCase() || "?";
}

/** Masks sensitive strings: "user@mail.com" -> "us***@mail.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

/** Stable sleep helper. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
