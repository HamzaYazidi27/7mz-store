"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CircleUserRound, Home, Package, Search, Wallet } from "lucide-react";
import { cn } from "@7mz/ui";
import { haptics } from "@/lib/telegram/haptics";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/balance", label: "Balance", icon: Wallet },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
] as const;

/**
 * Floating bottom navigation — frosted glass pill hovering above the content,
 * spring-animated active highlight, haptic tick on every switch.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto w-full max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="grid h-16 grid-cols-5 items-stretch rounded-3xl border border-white/8 bg-[#101013]/95 shadow-nav backdrop-blur-2xl">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => haptics.select()}
                aria-current={active ? "page" : undefined}
                className="relative flex select-none-touch flex-col items-center justify-center gap-1"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-x-2 inset-y-1.5 rounded-2xl bg-white/6"
                  />
                )}
                <Icon
                  className={cn(
                    "relative size-[22px] transition-colors duration-200",
                    active ? "text-primary drop-shadow-[0_0_10px_rgba(255,212,59,0.45)]" : "text-fg-tertiary",
                  )}
                  strokeWidth={active ? 2.2 : 2}
                />
                <span
                  className={cn(
                    "relative text-[10px] font-medium leading-none transition-colors duration-200",
                    active ? "text-fg" : "text-fg-tertiary",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
