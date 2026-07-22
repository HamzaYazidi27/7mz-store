"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  ChevronRight,
  Gift,
  LifeBuoy,
  LogOut,
  Mail,
  Package,
  Shield,
  Sparkles,
  Target,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { formatPrice } from "@7mz/shared";
import { Avatar, Badge, Button, Skeleton } from "@7mz/ui";
import { api } from "@/lib/api/client";
import { useMe, useUserStats } from "@/lib/api/hooks";
import { useAuthStore } from "@/stores/auth-store";
import { haptics } from "@/lib/telegram/haptics";
import { getWebApp } from "@/lib/telegram/types";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const { data: stats } = useUserStats();
  useMe();

  const logout = async () => {
    haptics.press();
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clear();
    getWebApp()?.close?.();
    router.replace("/");
  };

  return (
    <div className="px-4 pt-4">
      {/* Header card */}
      <div className="flex items-center gap-4 rounded-card-lg border border-border bg-surface p-5">
        <Avatar
          src={user?.photoUrl}
          name={user ? `${user.firstName} ${user.lastName ?? ""}` : "?"}
          size="xl"
        />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">
            {user ? `${user.firstName} ${user.lastName ?? ""}` : "…"}
          </h1>
          {user?.username && <p className="text-sm text-fg-secondary">@{user.username}</p>}
          <p className="mt-0.5 font-mono text-[11px] text-fg-tertiary">ID: {user?.telegramId}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat icon={<Package className="size-4" />} label="Orders" value={stats ? String(stats.completedOrders) : "—"} />
        <Stat icon={<Trophy className="size-4" />} label="Spent" value={stats ? formatPrice(stats.totalSpent, { stripZeroCents: true }) : "—"} />
        <Stat icon={<Gift className="size-4" />} label="Saved" value={stats ? formatPrice(stats.totalSaved, { stripZeroCents: true }) : "—"} />
      </div>

      {/* Earn menu */}
      <Section title="Earn & rewards">
        <MenuLink href="/referrals" icon={<Users className="size-5" />} label="Refer & earn" hint="Invite friends, earn commission" />
        <MenuLink href="/missions" icon={<Target className="size-5" />} label="Missions" hint="Complete tasks for rewards" />
        <MenuLink href="/rewards" icon={<Sparkles className="size-5" />} label="Daily rewards & spin" hint="Claim daily, spin the wheel" />
      </Section>

      {/* Account menu */}
      <Section title="Account">
        <MenuLink href="/orders" icon={<Package className="size-5" />} label="My orders" />
        <MenuLink href="/support" icon={<LifeBuoy className="size-5" />} label="Support & help" />
        <MenuLink href="/notifications" icon={<Ticket className="size-5" />} label="Notifications" />
      </Section>

      <Button variant="secondary" fullWidth className="mt-6 text-danger" onClick={logout}>
        <LogOut className="size-4" /> Log out
      </Button>

      <p className="mt-6 text-center text-xs text-fg-tertiary">7MZ Store · v1.0</p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3 text-center">
      <span className="mx-auto mb-1 grid size-8 place-items-center rounded-full bg-primary/12 text-primary">
        {icon}
      </span>
      <p className="text-base font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-fg-tertiary">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-fg-tertiary">
        {title}
      </h2>
      <div className="overflow-hidden rounded-card border border-border bg-surface">{children}</div>
    </section>
  );
}

function MenuLink({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => haptics.tap()}
      className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0 transition-colors hover:bg-white/[0.03]"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-white/6 text-fg-secondary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="truncate text-xs text-fg-tertiary">{hint}</p>}
      </div>
      <ChevronRight className="size-4 text-fg-tertiary" />
    </Link>
  );
}
