"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Download,
  KeyRound,
  LifeBuoy,
} from "lucide-react";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_PROVIDER_LABELS,
  formatDateTime,
  formatPrice,
  type OrderStatus,
} from "@7mz/shared";
import { Badge, Button, Skeleton, cn } from "@7mz/ui";
import { useOrder } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";

const statusVariant: Record<OrderStatus, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  COMPLETED: "success",
  PAID: "accent",
  PENDING: "warning",
  CANCELLED: "neutral",
  REFUNDED: "neutral",
  FAILED: "danger",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useTelegramBackButton();

  // Poll while pending so crypto/external confirmations reflect automatically.
  const { data: order, isLoading } = useOrder(id, { refetchInterval: 8000 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = (text: string, itemId: string) => {
    navigator.clipboard?.writeText(text);
    haptics.notify("success");
    setCopiedId(itemId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (isLoading || !order) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md space-y-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    );
  }

  const isPending = order.status === "PENDING" || order.status === "PAID";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-10">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => router.push("/orders")}
          className="grid size-9 place-items-center rounded-full bg-white/6 text-fg"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-mono text-sm text-fg-secondary">{order.orderNumber}</h1>
        </div>
        <Badge variant={statusVariant[order.status]} dot className="ml-auto">
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <div className="space-y-5 px-4">
        {/* Status hero */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-card border p-4",
            order.status === "COMPLETED"
              ? "border-success/25 bg-success/8"
              : isPending
                ? "border-warning/25 bg-warning/8"
                : "border-border bg-surface",
          )}
        >
          {order.status === "COMPLETED" ? (
            <CheckCircle2 className="size-8 text-success" />
          ) : (
            <Clock className="size-8 text-warning" />
          )}
          <div>
            <p className="font-semibold">
              {order.status === "COMPLETED"
                ? "Delivered"
                : isPending
                  ? "Awaiting payment"
                  : ORDER_STATUS_LABELS[order.status]}
            </p>
            <p className="text-xs text-fg-secondary">
              {order.status === "COMPLETED"
                ? "Your items are ready below"
                : isPending
                  ? "This page updates automatically once paid"
                  : formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Items + delivered credentials */}
        {order.items.map((item) => (
          <div key={item.id} className="rounded-card border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {item.thumbnail && (
                  <Image src={item.thumbnail} alt={item.productName} fill sizes="48px" className="object-contain p-1.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-fg-tertiary">
                  Qty {item.quantity} · {formatPrice(item.total)}
                </p>
              </div>
            </div>

            {item.delivered.length > 0 && (
              <div className="mt-3 space-y-2">
                {item.delivered.map((d) => (
                  <div key={d.id} className="rounded-btn border border-border bg-bg p-3">
                    {d.downloadUrl ? (
                      <a
                        href={d.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-accent"
                      >
                        <Download className="size-4" />
                        {d.fileName ?? "Download file"}
                      </a>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-fg-tertiary">
                            <KeyRound className="size-3" /> Your credentials
                          </p>
                          <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed text-fg">
                            {d.content}
                          </pre>
                        </div>
                        <button
                          type="button"
                          onClick={() => copy(d.content ?? "", d.id)}
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/6 text-fg-secondary hover:text-fg"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                    )}
                    {copiedId === d.id && <p className="mt-1 text-[11px] text-success">Copied!</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Payment summary */}
        <div className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-fg-secondary">Subtotal</span>
            <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-fg-secondary">Discount {order.couponCode && `(${order.couponCode})`}</span>
              <span className="tabular-nums text-success">−{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="my-2 h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums text-primary">{formatPrice(order.total)}</span>
          </div>
          {order.payment && (
            <p className="mt-2 text-xs text-fg-tertiary">
              Paid with {PAYMENT_PROVIDER_LABELS[order.payment.provider]}
            </p>
          )}
        </div>

        <Button
          variant="secondary"
          fullWidth
          onClick={() => router.push(`/support?order=${order.id}`)}
        >
          <LifeBuoy className="size-4" /> Get help with this order
        </Button>
      </div>
    </div>
  );
}
