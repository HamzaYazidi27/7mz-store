"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Sheet, Skeleton } from "@7mz/ui";
import { api, apiError } from "@/lib/api";
import { useAdminList, useAdminMutation } from "@/lib/hooks";

export default function BannersPage() {
  const { data, isLoading, refetch } = useAdminList("banners");
  const mutate = useAdminMutation(["banners"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", eyebrow: "", image: "", ctaLabel: "", accentColor: "" });
  const [err, setErr] = useState<string | null>(null);

  const banners = (data ?? []) as Record<string, string | boolean | null>[];

  const create = async () => {
    setErr(null);
    try {
      await api.post("/admin/banners", {
        title: form.title,
        subtitle: form.subtitle || undefined,
        eyebrow: form.eyebrow || undefined,
        image: form.image,
        ctaLabel: form.ctaLabel || undefined,
        accentColor: form.accentColor || undefined,
      });
      setOpen(false);
      setForm({ title: "", subtitle: "", eyebrow: "", image: "", ctaLabel: "", accentColor: "" });
      refetch();
    } catch (e) {
      setErr(apiError(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Banners</h1>
        <Button variant="primary" onClick={() => { setErr(null); setOpen(true); }}>
          <Plus className="size-4" /> New banner
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-card" />)
        ) : (
          banners.map((b) => (
            <div key={b.id as string} className="overflow-hidden rounded-card border border-border bg-surface">
              <div className="relative h-32 bg-surface-2">
                {b.image && <Image src={b.image as string} alt={b.title as string} fill sizes="400px" className="object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center p-4">
                  {b.eyebrow && <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{b.eyebrow as string}</span>}
                  <span className="text-lg font-bold text-white">{b.title as string}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-xs text-fg-tertiary">{b.isActive ? "Active" : "Hidden"}</span>
                <button
                  onClick={async () => { if (confirm("Delete banner?")) { await mutate.mutateAsync({ method: "delete", url: `/admin/banners/${b.id}` }); refetch(); } }}
                  className="grid size-8 place-items-center rounded-lg text-fg-tertiary hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="New banner">
        <div className="space-y-4">
          <Input label="Eyebrow" value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} placeholder="TODAY'S PICK" />
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <Input label="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/banners/…​.webp" />
          <Input label="CTA label" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Buy now" />
          <Input label="Accent color (hex)" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button variant="primary" size="lg" fullWidth disabled={!form.title || !form.image} onClick={create}>
            Create banner
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
