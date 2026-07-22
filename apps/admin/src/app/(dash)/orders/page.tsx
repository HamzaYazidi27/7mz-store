"use client";

import { useState } from "react";
import { formatDateTime, formatPrice, ORDER_STATUS_LABELS, type OrderStatus } from "@7mz/shared";
import { Badge, Button, SegmentedTabs, Skeleton, cn } from "@7mz/ui";
import { useAdminList, useAdminMutation } from "@/lib/hooks";

const TABS = [
  { value: "all", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

const variant: Record<string, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  COMPLETED: "success",
  PENDING: "warning",
  PAID: "accent",
  REFUNDED: "neutral",
  CANCELLED: "neutral",
  FAILED: "danger",
};

export default function OrdersPage() {
  const [tab, setTab] = useState("all");
  const { data, isLoading, refetch } = useAdminList("orders", { status: tab === "all" ? undefined : tab });
  const mutate = useAdminMutation(["orders", "dashboard"]);

  interface OrderRow {
    id: string;
    orderNumber: string;
    status: string;
    total: string;
    customer: string;
    items: string;
    provider: string | null;
    createdAt: string;
  }
  const items = (data?.items ?? []) as OrderRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Orders</h1>
      <div className="mb-4 max-w-md">
        <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-tertiary">No orders</p>
        ) : (
          items.map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-fg-tertiary">{o.orderNumber}</span>
                  <Badge variant={variant[o.status] ?? "neutral"} dot>
                    {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                  </Badge>
                </div>
                <p className="truncate text-sm font-medium">{o.items}</p>
                <p className="text-xs text-fg-tertiary">
                  {o.customer} · {o.provider ?? "—"} · {formatDateTime(o.createdAt)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-primary">{formatPrice(o.total)}</span>
              {o.status === "COMPLETED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (confirm(`Refund ${o.orderNumber} (${formatPrice(o.total)}) to the customer's wallet?`)) {
                      await mutate.mutateAsync({ method: "post", url: `/admin/orders/${o.id}/refund` });
                      refetch();
                    }
                  }}
                >
                  Refund
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
