"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@7mz/shared";
import { Badge, Button, Input, Sheet, Skeleton, cn } from "@7mz/ui";
import { api, apiError } from "@/lib/api";
import { useAdminList, useAdminMutation } from "@/lib/hooks";

export default function CouponsPage() {
  const { data, isLoading, refetch } = useAdminList("coupons");
  const mutate = useAdminMutation(["coupons"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", type: "PERCENTAGE", value: "", minOrderAmount: "", maxDiscount: "", usageLimit: "" });
  const [err, setErr] = useState<string | null>(null);

  const coupons = (data ?? []) as Record<string, string | number | boolean | null>[];

  const create = async () => {
    setErr(null);
    try {
      await api.post("/admin/coupons", {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      });
      setOpen(false);
      setForm({ code: "", type: "PERCENTAGE", value: "", minOrderAmount: "", maxDiscount: "", usageLimit: "" });
      refetch();
    } catch (e) {
      setErr(apiError(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
        <Button variant="primary" onClick={() => { setErr(null); setOpen(true); }}>
          <Plus className="size-4" /> New coupon
        </Button>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : coupons.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-tertiary">No coupons yet</p>
        ) : (
          coupons.map((c) => (
            <div key={c.id as string} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <span className="rounded-lg bg-primary/12 px-2.5 py-1 font-mono text-sm font-bold text-primary">{c.code as string}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {c.type === "PERCENTAGE" ? `${c.value}% off` : `${formatPrice(c.value as string)} off`}
                  {c.maxDiscount ? ` (max ${formatPrice(c.maxDiscount as string)})` : ""}
                </p>
                <p className="text-xs text-fg-tertiary">
                  Used {c.usageCount as number}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ""} · min {c.minOrderAmount ? formatPrice(c.minOrderAmount as string) : "$0"}
                </p>
              </div>
              <Badge variant={c.isActive ? "success" : "neutral"} dot>
                {c.isActive ? "Active" : "Off"}
              </Badge>
              <button
                onClick={async () => { await mutate.mutateAsync({ method: "post", url: `/admin/coupons/${c.id}/toggle` }); refetch(); }}
                className="text-xs font-medium text-fg-secondary hover:text-fg"
              >
                Toggle
              </button>
              <button
                onClick={async () => { if (confirm(`Delete coupon ${c.code}?`)) { await mutate.mutateAsync({ method: "delete", url: `/admin/coupons/${c.id}` }); refetch(); } }}
                className="grid size-8 place-items-center rounded-lg text-fg-tertiary hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="New coupon">
        <div className="space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" />
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-fg-secondary">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {["PERCENTAGE", "FIXED"].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={cn("h-11 rounded-btn border text-sm font-medium", form.type === t ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface-2")}
                >
                  {t === "PERCENTAGE" ? "Percentage" : "Fixed amount"}
                </button>
              ))}
            </div>
          </div>
          <Input label={form.type === "PERCENTAGE" ? "Percent off" : "Amount off ($)"} type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min order ($)" type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
            {form.type === "PERCENTAGE" && <Input label="Max discount ($)" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />}
          </div>
          <Input label="Usage limit (blank = unlimited)" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button variant="primary" size="lg" fullWidth disabled={!form.code || !form.value} onClick={create}>
            Create coupon
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
