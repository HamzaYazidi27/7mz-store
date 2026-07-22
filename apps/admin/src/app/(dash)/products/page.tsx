"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Copy,
  Layers,
  MoreVertical,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { DELIVERY_TYPES, formatPrice } from "@7mz/shared";
import { Badge, Button, Input, Sheet, Skeleton, Textarea, cn } from "@7mz/ui";
import { api, apiError } from "@/lib/api";
import { useAdminList, useAdminMutation } from "@/lib/hooks";

interface ProductRow {
  id: string;
  name: string;
  thumbnail: string | null;
  price: string;
  compareAtPrice: string | null;
  stockCount: number;
  soldCount: number;
  isActive: boolean;
  isFeatured: boolean;
  category: string;
  categoryId: string;
  deliveryType: string;
}

const empty = {
  name: "",
  categoryId: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAtPrice: "",
  thumbnail: "",
  deliveryType: "AUTO_CODE",
  isActive: true,
  isFeatured: false,
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useAdminList("products", { search });
  const { data: cats } = useAdminList("categories");
  const mutate = useAdminMutation(["products", "dashboard"]);

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [formOpen, setFormOpen] = useState(false);
  const [stockFor, setStockFor] = useState<ProductRow | null>(null);
  const [stockText, setStockText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const categories = (cats ?? []) as { id: string; name: string }[];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, categoryId: categories[0]?.id ?? "" });
    setErr(null);
    setFormOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      categoryId: p.categoryId,
      shortDescription: "",
      description: "",
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? "",
      thumbnail: p.thumbnail ?? "",
      deliveryType: p.deliveryType,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
    });
    setErr(null);
    setMenuId(null);
    setFormOpen(true);
  };

  const save = async () => {
    setErr(null);
    const body = {
      name: form.name,
      categoryId: form.categoryId,
      shortDescription: form.shortDescription || form.name,
      description: form.description || form.shortDescription || form.name,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      thumbnail: form.thumbnail || undefined,
      deliveryType: form.deliveryType,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
    };
    try {
      if (editing) await mutate.mutateAsync({ method: "patch", url: `/admin/products/${editing.id}`, body });
      else await mutate.mutateAsync({ method: "post", url: "/admin/products", body });
      setFormOpen(false);
      refetch();
    } catch (e) {
      setErr(apiError(e, "Could not save product"));
    }
  };

  const addStock = async () => {
    if (!stockFor) return;
    const items = stockText.split("\n").map((s) => s.trim()).filter(Boolean);
    try {
      await api.post(`/admin/products/${stockFor.id}/stock`, { items });
      setStockFor(null);
      setStockText("");
      refetch();
    } catch (e) {
      setErr(apiError(e));
    }
  };

  const items = (data?.items ?? []) as ProductRow[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="size-4" /> New product
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" leftIcon={<Search />} />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="hidden grid-cols-[1fr_120px_100px_90px_110px_44px] gap-2 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fg-tertiary md:grid">
          <span>Product</span>
          <span>Category</span>
          <span className="text-right">Price</span>
          <span className="text-right">Stock</span>
          <span className="text-center">Status</span>
          <span />
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-tertiary">No products found</p>
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[1fr_44px] items-center gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr_120px_100px_90px_110px_44px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {p.thumbnail ? (
                    <Image src={p.thumbnail} alt={p.name} fill sizes="40px" className="object-contain p-1" />
                  ) : (
                    <div className="grid size-full place-items-center">
                      <PackageOpen className="size-4 text-fg-tertiary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-fg-tertiary md:hidden">
                    {p.category} · {formatPrice(p.price)} · {p.stockCount} stock
                  </p>
                </div>
              </div>
              <span className="hidden truncate text-sm text-fg-secondary md:block">{p.category}</span>
              <span className="hidden text-right text-sm font-medium tabular-nums md:block">{formatPrice(p.price)}</span>
              <span className={cn("hidden text-right text-sm tabular-nums md:block", p.stockCount <= 5 ? "text-warning" : "text-fg-secondary")}>
                {p.stockCount}
              </span>
              <div className="hidden justify-center md:flex">
                <Badge variant={p.isActive ? "success" : "neutral"} dot>
                  {p.isActive ? "Active" : "Hidden"}
                </Badge>
              </div>
              <div className="relative flex justify-end">
                <button
                  onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                  className="grid size-8 place-items-center rounded-lg text-fg-tertiary hover:bg-white/6 hover:text-fg"
                >
                  <MoreVertical className="size-4" />
                </button>
                {menuId === p.id && (
                  <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-border-strong bg-surface-2 shadow-card-hover">
                    <MenuItem icon={<Pencil className="size-4" />} label="Edit" onClick={() => openEdit(p)} />
                    <MenuItem icon={<Layers className="size-4" />} label="Add stock" onClick={() => { setStockFor(p); setStockText(""); setMenuId(null); }} />
                    <MenuItem
                      icon={<Copy className="size-4" />}
                      label="Duplicate"
                      onClick={async () => { await mutate.mutateAsync({ method: "post", url: `/admin/products/${p.id}/duplicate` }); setMenuId(null); refetch(); }}
                    />
                    <MenuItem
                      icon={<Trash2 className="size-4" />}
                      label="Delete"
                      danger
                      onClick={async () => { if (confirm(`Delete ${p.name}?`)) { await mutate.mutateAsync({ method: "delete", url: `/admin/products/${p.id}` }); setMenuId(null); refetch(); } }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/edit sheet */}
      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit product" : "New product"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-fg-secondary">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="h-12 w-full rounded-btn border border-border bg-surface-2 px-4 text-[15px] text-fg outline-none focus:border-primary/60"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Short description" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
          <Textarea label="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price ($)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input label="Compare price ($)" type="number" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
          </div>
          <Input label="Image URL" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="/catalog/…​.webp or https://…" />
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-fg-secondary">Delivery type</label>
            <select
              value={form.deliveryType}
              onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}
              className="h-12 w-full rounded-btn border border-border bg-surface-2 px-4 text-[15px] text-fg outline-none focus:border-primary/60"
            >
              {DELIVERY_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <Toggle label="Active" value={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Toggle label="Featured" value={form.isFeatured} onChange={(v) => setForm({ ...form, isFeatured: v })} />
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button variant="primary" size="lg" fullWidth loading={mutate.isPending} disabled={!form.name || !form.categoryId || !form.price} onClick={save}>
            {editing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </Sheet>

      {/* Add stock sheet */}
      <Sheet open={!!stockFor} onClose={() => setStockFor(null)} title={`Add stock · ${stockFor?.name ?? ""}`}>
        <div className="space-y-4">
          <p className="text-[13px] text-fg-secondary">
            One code / credential per line. Each becomes an encrypted, auto-delivered unit of stock.
          </p>
          <Textarea
            value={stockText}
            onChange={(e) => setStockText(e.target.value)}
            placeholder={"CODE-1111-2222\nemail:pass\n…"}
            className="min-h-40 font-mono text-[13px]"
          />
          <Button variant="primary" size="lg" fullWidth onClick={addStock} disabled={!stockText.trim()}>
            Add {stockText.split("\n").filter((s) => s.trim()).length} items
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-white/6",
        danger ? "text-danger" : "text-fg",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-2">
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", value ? "bg-primary" : "bg-white/10")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", value ? "translate-x-[22px]" : "translate-x-0.5")} />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
