"use client";

import { Bitcoin, CreditCard, Star, Wallet } from "lucide-react";
import { Skeleton, cn } from "@7mz/ui";
import { useAdminList, useAdminMutation } from "@/lib/hooks";

function icon(provider: string) {
  if (provider === "balance") return <Wallet className="size-5" />;
  if (provider === "telegram_stars") return <Star className="size-5" />;
  if (["crypto", "binance_pay", "coinbase_commerce"].includes(provider)) return <Bitcoin className="size-5" />;
  return <CreditCard className="size-5" />;
}

export default function GatewaysPage() {
  const { data, isLoading, refetch } = useAdminList("gateways");
  const mutate = useAdminMutation(["gateways"]);
  const gateways = (data ?? []) as Record<string, string | boolean>[];

  const toggle = async (id: string, field: "isEnabled" | "isTestMode", value: boolean) => {
    await mutate.mutateAsync({ method: "patch", url: `/admin/gateways/${id}`, body: { [field]: value } });
    refetch();
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Payment methods</h1>
      <p className="mb-6 text-sm text-fg-secondary">
        Toggle which gateways customers can pay with. Live keys are configured via environment variables; test mode uses sandbox
        flows.
      </p>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-card" />)
          : gateways.map((g) => (
              <div key={g.id as string} className="flex items-center gap-4 rounded-card border border-border bg-surface p-4">
                <span className="grid size-11 place-items-center rounded-xl bg-white/6 text-fg-secondary">
                  {icon(g.provider as string)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{g.displayName as string}</p>
                  <p className="truncate text-xs text-fg-tertiary">{(g.description as string) || (g.provider as string)}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-fg-secondary">
                  Test
                  <SmallToggle value={g.isTestMode as boolean} onChange={(v) => toggle(g.id as string, "isTestMode", v)} />
                </label>
                <SmallToggle value={g.isEnabled as boolean} onChange={(v) => toggle(g.id as string, "isEnabled", v)} />
              </div>
            ))}
      </div>
    </div>
  );
}

function SmallToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className={cn("relative h-6 w-11 rounded-full transition-colors", value ? "bg-primary" : "bg-white/10")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", value ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
