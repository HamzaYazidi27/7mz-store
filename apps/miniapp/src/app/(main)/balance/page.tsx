"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bitcoin,
  Gift,
  Loader2,
  Plus,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  TRANSACTION_TYPE_LABELS,
  formatPrice,
  relativeTime,
  type TransactionType,
} from "@7mz/shared";
import { AnimatedMoney, Button, EmptyState, Input, Sheet, Skeleton, cn } from "@7mz/ui";
import {
  useDeposit,
  useRedeemPromo,
  useTransactions,
  useWallet,
} from "@/lib/api/hooks";
import { apiErrorMessage } from "@/lib/api/client";
import { haptics } from "@/lib/telegram/haptics";
import { getWebApp } from "@/lib/telegram/types";

const CRYPTO_ASSETS = [
  { code: "USDT", label: "USDT", hint: "TRC-20" },
  { code: "BTC", label: "Bitcoin", hint: "BTC" },
  { code: "LTC", label: "Litecoin", hint: "LTC" },
];
const PRESETS = [10, 25, 50, 100];

function txIcon(type: TransactionType) {
  if (type === "DEPOSIT" || type === "PROMO_CREDIT") return <ArrowDownToLine className="size-4 text-success" />;
  if (type === "WITHDRAWAL" || type === "PURCHASE") return <ArrowUpFromLine className="size-4 text-danger" />;
  return <TrendingUp className="size-4 text-accent" />;
}

export default function BalancePage() {
  const { data: wallet, isLoading } = useWallet();
  const { data: txData } = useTransactions();
  const deposit = useDeposit();
  const redeemPromo = useRedeemPromo();

  const [depositOpen, setDepositOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [amount, setAmount] = useState(25);
  const [asset, setAsset] = useState("USDT");
  const [crypto, setCrypto] = useState<{ address: string; amount: string; currency: string } | null>(null);
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const transactions = txData?.pages.flatMap((p) => p.items) ?? [];
  const balance = wallet ? Number(wallet.balance) : 0;

  const startDeposit = async () => {
    haptics.press();
    try {
      const res = await deposit.mutateAsync({ amount, provider: "crypto", asset });
      if (res.crypto) setCrypto(res.crypto);
      else if (res.externalUrl) getWebApp()?.openLink?.(res.externalUrl) ?? window.open(res.externalUrl, "_blank");
    } catch {
      haptics.notify("error");
    }
  };

  const applyPromo = async () => {
    haptics.press();
    try {
      const res = await redeemPromo.mutateAsync(promo.trim().toUpperCase());
      setPromoMsg({ ok: true, text: `+${formatPrice(res.amount)} added to your balance!` });
      haptics.notify("success");
      setPromo("");
    } catch (err) {
      setPromoMsg({ ok: false, text: apiErrorMessage(err, "Invalid promo code") });
      haptics.notify("error");
    }
  };

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Wallet</h1>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-card-lg border border-border bg-surface p-5 shadow-card"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(80% 120% at 100% 0%, rgba(255,212,59,0.14), transparent 60%)" }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-fg-secondary">
            <WalletIcon className="size-4 text-primary" />
            <span className="text-sm">Available balance</span>
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-10 w-40" />
          ) : (
            <AnimatedMoney value={balance} className="mt-1 block text-4xl font-bold tabular-nums" />
          )}
          <div className="mt-5 flex gap-2">
            <Button variant="primary" fullWidth onClick={() => { haptics.tap(); setCrypto(null); setDepositOpen(true); }}>
              <Plus className="size-4" /> Deposit
            </Button>
            <Button variant="secondary" fullWidth onClick={() => { haptics.tap(); setPromoMsg(null); setPromoOpen(true); }}>
              <Gift className="size-4" /> Promo code
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Mini stats */}
      {wallet && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-card border border-border bg-surface p-3.5">
            <p className="text-xs text-fg-tertiary">Total deposited</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-success">{formatPrice(wallet.totalDeposited)}</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-3.5">
            <p className="text-xs text-fg-tertiary">Total spent</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatPrice(wallet.totalSpent)}</p>
          </div>
        </div>
      )}

      {/* Transactions */}
      <h2 className="mb-3 mt-6 text-lg font-bold tracking-tight">Transactions</h2>
      {transactions.length === 0 ? (
        <EmptyState icon={<TrendingUp />} title="No transactions yet" description="Deposits and purchases will appear here." />
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => {
            const positive = Number(t.amount) >= 0;
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/6">{txIcon(t.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-fg-tertiary">
                    {TRANSACTION_TYPE_LABELS[t.type]} · {relativeTime(t.createdAt)}
                  </p>
                </div>
                <span className={cn("shrink-0 text-sm font-semibold tabular-nums", positive ? "text-success" : "text-fg")}>
                  {positive ? "+" : ""}
                  {formatPrice(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Deposit sheet */}
      <Sheet open={depositOpen} onClose={() => setDepositOpen(false)} title="Deposit with crypto">
        {crypto ? (
          <div className="space-y-4 text-center">
            <p className="text-xs uppercase tracking-wide text-fg-tertiary">Send exactly</p>
            <p className="text-3xl font-bold tabular-nums text-primary">
              {crypto.amount} <span className="text-lg">{crypto.currency}</span>
            </p>
            <div className="rounded-btn border border-border bg-bg p-3">
              <p className="break-all font-mono text-[13px] text-fg">{crypto.address}</p>
            </div>
            <Button variant="secondary" fullWidth onClick={() => { navigator.clipboard?.writeText(crypto.address); haptics.notify("success"); }}>
              Copy address
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm text-fg-secondary">
              <Loader2 className="size-4 animate-spin" /> Waiting for confirmation…
            </div>
            <Button variant="ghost" fullWidth onClick={() => setDepositOpen(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[13px] font-medium text-fg-secondary">Amount (USD)</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { haptics.tap(); setAmount(p); }}
                    className={cn(
                      "h-11 rounded-btn border font-semibold transition-colors",
                      amount === p ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface-2 text-fg",
                    )}
                  >
                    ${p}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                className="mt-2"
                leftIcon={<span className="text-fg-tertiary">$</span>}
              />
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-fg-secondary">Pay with</p>
              <div className="grid grid-cols-3 gap-2">
                {CRYPTO_ASSETS.map((a) => (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => { haptics.tap(); setAsset(a.code); }}
                    className={cn(
                      "rounded-btn border py-2.5 text-center transition-colors",
                      asset === a.code ? "border-primary/50 bg-primary/10" : "border-border bg-surface-2",
                    )}
                  >
                    <Bitcoin className={cn("mx-auto size-4", asset === a.code ? "text-primary" : "text-fg-secondary")} />
                    <span className={cn("mt-1 block text-xs font-semibold", asset === a.code ? "text-primary" : "text-fg")}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" size="lg" fullWidth loading={deposit.isPending} onClick={startDeposit}>
              Continue · ${amount}
            </Button>
          </div>
        )}
      </Sheet>

      {/* Promo sheet */}
      <Sheet open={promoOpen} onClose={() => setPromoOpen(false)} title="Redeem promo code">
        <div className="space-y-4">
          <Input
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder="Enter code"
            leftIcon={<Gift />}
            error={promoMsg && !promoMsg.ok ? promoMsg.text : undefined}
          />
          {promoMsg?.ok && <p className="text-sm font-medium text-success">{promoMsg.text}</p>}
          <Button variant="primary" size="lg" fullWidth loading={redeemPromo.isPending} disabled={!promo} onClick={applyPromo}>
            Redeem
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
