"use client";

import Link from "next/link";
import { Bell, Plus, Wallet } from "lucide-react";
import { AnimatedMoney, Avatar, Skeleton } from "@7mz/ui";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { haptics } from "@/lib/telegram/haptics";
import { useAuthStore } from "@/stores/auth-store";

function useUnreadCount() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await api.get<{ count: number }>("/notifications/unread-count")).data,
    enabled: status === "authenticated",
    refetchInterval: 60_000,
  });
}

/**
 * Top app bar — brand mark, live animated balance pill, notifications bell,
 * profile avatar. Frosted glass, pinned to the top of every main screen.
 */
export function AppBar() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const { data: unread } = useUnreadCount();

  const balance = user ? Number.parseFloat(user.balance) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => haptics.tap()}>
          <span className="grid size-8 place-items-center rounded-[10px] bg-primary shadow-glow-primary">
            <span className="text-[15px] font-extrabold tracking-tight text-on-primary">7</span>
          </span>
          <span className="text-[17px] font-bold tracking-tight">
            7MZ <span className="font-semibold text-primary">Store</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {status === "booting" ? (
            <Skeleton className="h-9 w-24 rounded-full" />
          ) : (
            <Link
              href="/balance"
              onClick={() => haptics.tap()}
              className="glass-subtle flex h-9 items-center gap-1.5 rounded-full pl-3 pr-1.5 transition-colors hover:bg-white/8"
            >
              <Wallet className="size-[15px] text-primary" />
              <AnimatedMoney
                value={balance}
                className="text-[13px] font-semibold tabular-nums text-fg"
              />
              <span className="grid size-6 place-items-center rounded-full bg-primary text-on-primary">
                <Plus className="size-3.5" strokeWidth={3} />
              </span>
            </Link>
          )}

          <Link
            href="/notifications"
            aria-label="Notifications"
            onClick={() => haptics.tap()}
            className="relative grid size-9 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-white/6 hover:text-fg"
          >
            <Bell className="size-[19px]" />
            {(unread?.count ?? 0) > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-bg" />
            )}
          </Link>

          <Link href="/profile" aria-label="Profile" onClick={() => haptics.tap()}>
            <Avatar
              src={user?.photoUrl}
              name={user ? `${user.firstName} ${user.lastName ?? ""}` : "?"}
              size="sm"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
