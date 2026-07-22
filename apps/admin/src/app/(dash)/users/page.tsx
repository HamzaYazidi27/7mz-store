"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { formatPrice, relativeTime } from "@7mz/shared";
import { Avatar, Badge, Button, Input, Sheet, Skeleton } from "@7mz/ui";
import { api, apiError } from "@/lib/api";
import { useAdminList } from "@/lib/hooks";

interface UserRow {
  id: string;
  telegramId: string;
  firstName: string;
  username: string | null;
  photoUrl: string | null;
  role: string;
  status: string;
  balance: string;
  orders: number;
  createdAt: string;
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useAdminList("users", { search });
  const [target, setTarget] = useState<UserRow | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const items = (data?.items ?? []) as UserRow[];

  const adjust = async () => {
    if (!target) return;
    setErr(null);
    try {
      await api.post(`/admin/users/${target.id}/balance`, { amount: Number(amount), reason });
      setTarget(null);
      setAmount("");
      setReason("");
      refetch();
    } catch (e) {
      setErr(apiError(e));
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Customers</h1>
      <div className="mb-4 max-w-sm">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or username…" leftIcon={<Search />} />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-tertiary">No customers</p>
        ) : (
          items.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <Avatar src={u.photoUrl} name={u.firstName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.firstName} {u.username && <span className="text-fg-tertiary">@{u.username}</span>}
                  {u.role !== "CUSTOMER" && <Badge variant="accent" className="ml-2">{u.role.replace("_", " ")}</Badge>}
                  {u.status === "BANNED" && <Badge variant="danger" className="ml-2">Banned</Badge>}
                </p>
                <p className="text-xs text-fg-tertiary">
                  {u.orders} orders · joined {relativeTime(u.createdAt)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-primary">{formatPrice(u.balance)}</span>
              <Button variant="ghost" size="sm" onClick={() => { setTarget(u); setErr(null); }}>
                Adjust
              </Button>
            </div>
          ))
        )}
      </div>

      <Sheet open={!!target} onClose={() => setTarget(null)} title={`Adjust balance · ${target?.firstName ?? ""}`}>
        <div className="space-y-4">
          <p className="text-[13px] text-fg-secondary">
            Current balance: <span className="font-semibold text-primary">{target && formatPrice(target.balance)}</span>. Use a
            negative amount to debit.
          </p>
          <Input label="Amount ($)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10 or -5" />
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Refund, bonus, correction…" />
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button variant="primary" size="lg" fullWidth disabled={!amount} onClick={adjust}>
            Apply adjustment
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
