"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Input, Sheet, Skeleton } from "@7mz/ui";
import { api, apiError } from "@/lib/api";
import { useAdminList, useAdminMutation } from "@/lib/hooks";

export default function CategoriesPage() {
  const { data, isLoading, refetch } = useAdminList("categories");
  const mutate = useAdminMutation(["categories"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "", accentColor: "" });
  const [err, setErr] = useState<string | null>(null);

  const cats = (data ?? []) as Record<string, string | number | boolean | null>[];

  const create = async () => {
    setErr(null);
    try {
      await api.post("/admin/categories", { name: form.name, icon: form.icon || undefined, accentColor: form.accentColor || undefined });
      setOpen(false);
      setForm({ name: "", icon: "", accentColor: "" });
      refetch();
    } catch (e) {
      setErr(apiError(e));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <Button variant="primary" onClick={() => { setErr(null); setOpen(true); }}>
          <Plus className="size-4" /> New category
        </Button>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          cats.map((c) => (
            <div key={c.id as string} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <span className="size-3 rounded-full" style={{ background: (c.accentColor as string) || "#3f3f46" }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.name as string}</p>
                <p className="text-xs text-fg-tertiary">{c.productCount as number} products · /{c.slug as string}</p>
              </div>
              <Badge variant={c.isVisible ? "success" : "neutral"} dot>
                {c.isVisible ? "Visible" : "Hidden"}
              </Badge>
              <button
                onClick={async () => { if (confirm(`Delete ${c.name}?`)) { try { await mutate.mutateAsync({ method: "delete", url: `/admin/categories/${c.id}` }); refetch(); } catch (e) { alert(apiError(e)); } } }}
                className="grid size-8 place-items-center rounded-lg text-fg-tertiary hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="New category">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Lucide icon name (optional)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Gamepad2, Sparkles…" />
          <Input label="Accent color (hex)" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} placeholder="#FFD43B" />
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button variant="primary" size="lg" fullWidth disabled={!form.name} onClick={create}>
            Create category
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
