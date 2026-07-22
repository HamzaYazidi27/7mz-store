"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Package, Receipt, TriangleAlert, Users } from "lucide-react";
import { formatPrice, relativeTime } from "@7mz/shared";
import { Avatar, Badge, Skeleton } from "@7mz/ui";
import { useDashboard } from "@/lib/hooks";

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign className="size-5" />}
          label="Revenue (30d)"
          value={data ? formatPrice(data.revenue.last30Days) : undefined}
          sub={data ? `${formatPrice(data.revenue.total)} all-time` : undefined}
          accent
        />
        <StatCard icon={<Receipt className="size-5" />} label="Orders" value={data ? String(data.counts.ordersTotal) : undefined} sub={data ? `${data.counts.ordersPending} pending` : undefined} />
        <StatCard icon={<Users className="size-5" />} label="Customers" value={data ? String(data.counts.customers) : undefined} />
        <StatCard icon={<Package className="size-5" />} label="Products" value={data ? String(data.counts.products) : undefined} sub={data && data.counts.lowStock > 0 ? `${data.counts.lowStock} low stock` : undefined} warn={data?.counts.lowStock > 0} />
      </div>

      {/* Revenue chart */}
      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-fg-secondary">Revenue · last 30 days</h2>
        {isLoading || !data ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <AreaChart data={data.revenueSeries} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD43B" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#FFD43B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#70707b", fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis tick={{ fill: "#70707b", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                contentStyle={{ background: "#111113", border: "1px solid #222225", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#a1a1aa" }}
                formatter={(v) => formatPrice(Number(v))}
              />
              <Area type="monotone" dataKey="value" stroke="#FFD43B" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent activity */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent orders">
          {data?.recentOrders?.length ? (
            <div className="divide-y divide-border">
              {(data.recentOrders as { id: string; item: string; customer: string; createdAt: string; total: string; status: string }[]).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.item}</p>
                    <p className="text-xs text-fg-tertiary">
                      {o.customer} · {relativeTime(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-primary">{formatPrice(o.total)}</span>
                    <Badge variant={o.status === "COMPLETED" ? "success" : o.status === "PENDING" ? "warning" : "neutral"} dot>
                      {o.status.toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="New customers">
          {data?.recentUsers?.length ? (
            <div className="divide-y divide-border">
              {(data.recentUsers as { id: string; name: string; username: string | null; photoUrl: string | null; createdAt: string }[]).map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-2.5">
                  <Avatar src={u.photoUrl} name={u.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    {u.username && <p className="text-xs text-fg-tertiary">@{u.username}</p>}
                  </div>
                  <span className="text-xs text-fg-tertiary">{relativeTime(u.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-fg-secondary">
        <span className={accent ? "text-primary" : "text-fg-tertiary"}>{icon}</span>
        <span className="text-[13px]">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
      )}
      {sub && (
        <p className={`mt-0.5 text-xs ${warn ? "text-warning" : "text-fg-tertiary"}`}>
          {warn && <TriangleAlert className="mr-1 inline size-3" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h2 className="mb-2 text-sm font-semibold text-fg-secondary">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="py-6 text-center text-sm text-fg-tertiary">Nothing yet</p>;
}
