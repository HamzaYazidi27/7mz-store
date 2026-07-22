"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { PackageOpen, Receipt } from "lucide-react";
import {
  ORDER_STATUS_LABELS,
  formatPrice,
  relativeTime,
  type OrderStatus,
} from "@7mz/shared";
import { Badge, EmptyState, PriceTag, SegmentedTabs, Skeleton, cn } from "@7mz/ui";
import { useOrders } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";

const TABS = [
  { value: "all", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const statusVariant: Record<OrderStatus, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  COMPLETED: "success",
  PAID: "accent",
  PENDING: "warning",
  CANCELLED: "neutral",
  REFUNDED: "neutral",
  FAILED: "danger",
};

export default function OrdersPage() {
  const [tab, setTab] = useState<string>("all");
  const { data, isLoading } = useOrders(tab);
  const orders = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">My Orders</h1>
      <SegmentedTabs tabs={TABS} value={tab} onChange={(v) => { haptics.select(); setTab(v); }} />

      <div className="mt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-card" />)
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="No orders yet"
            description="When you buy something, it'll show up here with instant delivery."
            className="pt-16"
          />
        ) : (
          orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
            >
              <Link
                href={`/orders/${order.id}`}
                onClick={() => haptics.tap()}
                className="block rounded-card border border-border bg-surface p-3.5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {order.firstItemThumbnail ? (
                      <Image
                        src={order.firstItemThumbnail}
                        alt={order.firstItemName}
                        fill
                        sizes="56px"
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <PackageOpen className="size-6 text-fg-tertiary" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-fg-tertiary">{order.orderNumber}</span>
                      <Badge variant={statusVariant[order.status]} dot>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">
                      {order.firstItemName}
                      {order.itemCount > 1 && (
                        <span className="text-fg-tertiary"> +{order.itemCount - 1} more</span>
                      )}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-fg-tertiary">{relativeTime(order.createdAt)}</span>
                      <PriceTag price={order.total} size="sm" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
