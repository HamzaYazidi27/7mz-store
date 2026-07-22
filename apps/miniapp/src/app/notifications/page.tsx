"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, CheckCheck, ChevronLeft } from "lucide-react";
import { relativeTime } from "@7mz/shared";
import { Button, EmptyState, Skeleton, cn } from "@7mz/ui";
import { useMarkAllRead, useNotifications } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";

export default function NotificationsPage() {
  const router = useRouter();
  useTelegramBackButton();
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllRead();
  const notifications = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-10">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-bg/80 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="grid size-9 place-items-center rounded-full bg-white/6 text-fg"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold">Notifications</h1>
        {notifications.some((n) => !n.readAt) && (
          <button
            type="button"
            onClick={() => { haptics.tap(); markAll.mutate(); }}
            className="ml-auto flex items-center gap-1 text-[13px] font-medium text-primary"
          >
            <CheckCheck className="size-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2 p-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-card" />)
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell />} title="No notifications" description="Order updates and offers will appear here." className="pt-16" />
        ) : (
          notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03 }}
              className={cn(
                "flex gap-3 rounded-card border p-3.5",
                n.readAt ? "border-border bg-surface" : "border-primary/20 bg-primary/[0.05]",
              )}
            >
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white/6 text-primary">
                <Bell className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-[13px] leading-snug text-fg-secondary">{n.body}</p>
                <p className="mt-1 text-[11px] text-fg-tertiary">{relativeTime(n.createdAt)}</p>
              </div>
              {!n.readAt && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
