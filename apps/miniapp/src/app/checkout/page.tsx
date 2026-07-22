"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Bitcoin,
  CheckCircle2,
  ChevronLeft,
  Copy,
  CreditCard,
  Loader2,
  Star,
  Tag,
  Wallet,
} from "lucide-react";
import {
  PAYMENT_PROVIDER_LABELS,
  formatPrice,
  type PaymentMethodDto,
  type PaymentProviderCode,
} from "@7mz/shared";
import { AnimatedMoney, Button, Input, PriceTag, Spinner, cn } from "@7mz/ui";
import { api } from "@/lib/api/client";
import { useCheckoutQuote, useCreateOrder } from "@/lib/api/hooks";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { celebrate } from "@/lib/confetti";
import { haptics } from "@/lib/telegram/haptics";
import { getWebApp } from "@/lib/telegram/types";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";

const CRYPTO_ASSETS = [
  { code: "USDT", label: "USDT", hint: "TRC-20" },
  { code: "BTC", label: "Bitcoin", hint: "BTC" },
  { code: "LTC", label: "Litecoin", hint: "LTC" },
];

function providerIcon(code: PaymentProviderCode) {
  switch (code) {
    case "balance":
      return <Wallet className="size-5" />;
    case "telegram_stars":
      return <Star className="size-5" />;
    case "crypto":
    case "binance_pay":
    case "coinbase_commerce":
      return <Bitcoin className="size-5" />;
    default:
      return <CreditCard className="size-5" />;
  }
}

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  useTelegramBackButton();

  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const setBalance = useAuthStore((s) => s.setBalance);

  const items = useMemo(
    () => lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
    [lines],
  );

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [provider, setProvider] = useState<PaymentProviderCode | null>(null);
  const [cryptoAsset, setCryptoAsset] = useState("USDT");
  const [stage, setStage] = useState<"form" | "crypto" | "success">("form");
  const [cryptoInfo, setCryptoInfo] = useState<{ address: string; amount: string; currency: string } | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: quote, isLoading: quoteLoading } = useCheckoutQuote(items, appliedCoupon);
  const createOrder = useCreateOrder();

  // Default to the first available payment method.
  useEffect(() => {
    if (!provider && quote?.providers) {
      const firstAvailable = quote.providers.find((p) => p.available) ?? quote.providers[0];
      if (firstAvailable) setProvider(firstAvailable.provider);
    }
  }, [quote, provider]);

  // Poll order status while a crypto payment is pending.
  useEffect(() => {
    if (stage !== "crypto" || !pendingOrderId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/orders/${pendingOrderId}`);
        if (data.status === "COMPLETED") {
          clearInterval(interval);
          onCompleted();
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pendingOrderId]);

  const onCompleted = () => {
    haptics.notify("success");
    celebrate();
    clearCart();
    setStage("success");
  };

  if (lines.length === 0 && stage === "form") {
    return (
      <div className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Your cart is empty</p>
          <Button variant="primary" className="mt-4" onClick={() => router.push("/search")}>
            Browse products
          </Button>
        </div>
      </div>
    );
  }

  const pay = async () => {
    if (!provider) return;
    haptics.press();
    try {
      const result = await createOrder.mutateAsync({
        items,
        couponCode: appliedCoupon,
        provider,
        asset: provider === "crypto" ? cryptoAsset : undefined,
      });

      if (quote) setBalance((Number(quote.balance) - Number(quote.total)).toFixed(2));

      const order = result.order;
      const payment = result.payment;

      if (order.status === "COMPLETED") {
        onCompleted();
        return;
      }
      if (provider === "crypto" && payment?.crypto) {
        setCryptoInfo(payment.crypto);
        setPendingOrderId(order.id);
        setStage("crypto");
        return;
      }
      if (payment?.telegramInvoiceUrl) {
        getWebApp()?.openInvoice?.(payment.telegramInvoiceUrl, (status) => {
          if (status === "paid") onCompleted();
        });
        setPendingOrderId(order.id);
        return;
      }
      if (payment?.externalUrl) {
        getWebApp()?.openLink?.(payment.externalUrl) ?? window.open(payment.externalUrl, "_blank");
        setPendingOrderId(order.id);
        setStage("crypto"); // reuse the "awaiting payment" screen + polling
        return;
      }
      // Fallback: go to the order page.
      router.push(`/orders/${order.id}`);
    } catch (err) {
      haptics.notify("error");
    }
  };

  // ---------------------------------------------------------- success

  if (stage === "success") {
    return (
      <div className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 250, damping: 15 }}
            className="mx-auto grid size-24 place-items-center rounded-full bg-success/15"
          >
            <CheckCircle2 className="size-14 text-success" strokeWidth={2} />
          </motion.div>
          <h1 className="mt-6 text-2xl font-bold">Payment successful!</h1>
          <p className="mt-2 text-sm text-fg-secondary">
            Your order is complete and your items have been delivered.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => router.replace(pendingOrderId ? `/orders/${pendingOrderId}` : "/orders")}
            >
              View my order
            </Button>
            <Button variant="ghost" onClick={() => router.replace("/")}>
              Back to store
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------- crypto pending

  if (stage === "crypto") {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md px-4 pt-6">
        <h1 className="text-center text-xl font-bold">Complete your payment</h1>
        {cryptoInfo ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-card border border-border bg-surface p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-fg-tertiary">Send exactly</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
                {cryptoInfo.amount} <span className="text-lg">{cryptoInfo.currency}</span>
              </p>
              <div className="mt-4 rounded-btn border border-border bg-bg p-3">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-fg-tertiary">
                  To this address
                </p>
                <p className="break-all font-mono text-[13px] leading-relaxed text-fg">
                  {cryptoInfo.address}
                </p>
              </div>
              <Button
                variant="secondary"
                fullWidth
                className="mt-3"
                onClick={() => {
                  navigator.clipboard?.writeText(cryptoInfo.address);
                  haptics.notify("success");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Copy className="size-4" /> {copied ? "Copied!" : "Copy address"}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-fg-secondary">
              <Loader2 className="size-4 animate-spin" />
              Waiting for payment confirmation…
            </div>
            <p className="text-center text-xs text-fg-tertiary">
              This screen updates automatically once your payment is detected on-chain.
            </p>
            <Button variant="ghost" fullWidth onClick={() => router.replace(`/orders/${pendingOrderId}`)}>
              I'll pay later — view order
            </Button>
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-fg-secondary">Awaiting payment confirmation…</p>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------- form

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-32">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="grid size-9 place-items-center rounded-full bg-white/6 text-fg"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </div>

      <div className="space-y-6 px-4">
        {/* Order summary */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-fg-secondary">Order summary</h2>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.product.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {l.product.thumbnail && (
                    <Image src={l.product.thumbnail} alt={l.product.name} fill sizes="48px" className="object-contain p-1.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-fg-tertiary">Qty {l.quantity}</p>
                </div>
                <PriceTag price={(Number(l.product.price) * l.quantity).toFixed(2)} size="sm" />
              </div>
            ))}
          </div>
        </section>

        {/* Coupon */}
        <section>
          <div className="flex gap-2">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              leftIcon={<Tag />}
              error={quote?.coupon && !quote.coupon.valid ? quote.coupon.reason : undefined}
            />
            <Button
              variant="secondary"
              size="lg"
              className="shrink-0"
              onClick={() => {
                haptics.tap();
                setAppliedCoupon(coupon || undefined);
              }}
            >
              Apply
            </Button>
          </div>
          {quote?.coupon?.valid && (
            <p className="mt-2 text-[13px] font-medium text-success">
              Coupon applied — you save {formatPrice(quote.coupon.discount)}
            </p>
          )}
        </section>

        {/* Payment methods */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-fg-secondary">Payment method</h2>
          {quoteLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-card bg-surface-2" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {quote?.providers.map((m) => (
                <PaymentRow
                  key={m.provider}
                  method={m}
                  selected={provider === m.provider}
                  onSelect={() => {
                    haptics.select();
                    setProvider(m.provider);
                  }}
                />
              ))}
            </div>
          )}

          {/* Crypto asset picker */}
          {provider === "crypto" && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {CRYPTO_ASSETS.map((a) => (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    setCryptoAsset(a.code);
                  }}
                  className={cn(
                    "rounded-btn border py-2.5 text-center transition-colors",
                    cryptoAsset === a.code
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-surface-2",
                  )}
                >
                  <span className={cn("block text-sm font-semibold", cryptoAsset === a.code ? "text-primary" : "text-fg")}>
                    {a.label}
                  </span>
                  <span className="text-[10px] text-fg-tertiary">{a.hint}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Totals */}
        {quote && (
          <section className="rounded-card border border-border bg-surface p-4">
            <Row label="Subtotal" value={formatPrice(quote.subtotal)} />
            {Number(quote.discount) > 0 && (
              <Row label="Discount" value={`−${formatPrice(quote.discount)}`} tone="success" />
            )}
            <div className="my-3 h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                {formatPrice(quote.total)}
              </span>
            </div>
          </section>
        )}
      </div>

      {/* Pay bar */}
      <div className="glass fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-white/5 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={createOrder.isPending}
          disabled={!provider || !quote || quote.providers.find((p) => p.provider === provider)?.available === false}
          onClick={pay}
        >
          {provider === "balance"
            ? `Pay ${quote ? formatPrice(quote.total) : ""} from balance`
            : provider
              ? `Pay with ${PAYMENT_PROVIDER_LABELS[provider]}`
              : "Select a payment method"}
        </Button>
      </div>
    </div>
  );
}

function PaymentRow({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethodDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!method.available}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-card border p-3.5 text-left transition-colors",
        selected ? "border-primary/50 bg-primary/8" : "border-border bg-surface",
        !method.available && "opacity-50",
      )}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", selected ? "bg-primary/15 text-primary" : "bg-white/6 text-fg-secondary")}>
        {providerIcon(method.provider)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{method.displayName}</p>
        <p className="truncate text-xs text-fg-tertiary">
          {method.unavailableReason ?? method.description ?? ""}
          {method.isTestMode && method.available ? " · test mode" : ""}
        </p>
      </div>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-border",
        )}
      >
        {selected && <span className="size-2 rounded-full bg-on-primary" />}
      </span>
    </button>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-fg-secondary">{label}</span>
      <span className={cn("font-medium tabular-nums", tone === "success" ? "text-success" : "text-fg")}>
        {value}
      </span>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Spinner size="lg" /></div>}>
      <CheckoutInner />
    </Suspense>
  );
}
