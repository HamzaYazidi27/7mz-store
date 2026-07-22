"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Copy, Crown, Share2, Users } from "lucide-react";
import { formatPrice, relativeTime } from "@7mz/shared";
import { Avatar, Button, EmptyState, Skeleton, cn } from "@7mz/ui";
import { useLeaderboard, useReferralStats } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";
import { getWebApp } from "@/lib/telegram/types";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";

export default function ReferralsPage() {
  const router = useRouter();
  useTelegramBackButton();
  const { data: stats, isLoading } = useReferralStats();
  const { data: leaderboard } = useLeaderboard();
  const [copied, setCopied] = useState(false);

  const share = () => {
    haptics.press();
    if (!stats) return;
    const text = `Join me on 7MZ Store — premium digital goods with instant delivery! ${stats.inviteLink}`;
    const tg = getWebApp();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(stats.inviteLink)}&text=${encodeURIComponent("Join me on 7MZ Store!")}`);
    } else if (navigator.share) {
      navigator.share({ text }).catch(() => undefined);
    }
  };

  const copyLink = () => {
    if (!stats) return;
    navigator.clipboard?.writeText(stats.inviteLink);
    haptics.notify("success");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-10">
      <Header title="Refer & Earn" onBack={() => router.back()} />

      <div className="space-y-5 px-4 pt-4">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-card-lg border border-border bg-surface p-5 text-center">
          <div
            aria-hidden
            className="absolute inset-0 opacity-70"
            style={{ background: "radial-gradient(90% 100% at 50% 0%, rgba(0,224,255,0.12), transparent 60%)" }}
          />
          <div className="relative">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Users className="size-7" />
            </span>
            <h1 className="mt-3 text-xl font-bold">Earn {stats?.commissionPercent ?? 5}% forever</h1>
            <p className="mt-1 text-sm text-fg-secondary">
              Get {stats?.commissionPercent ?? 5}% of everything your friends spend — paid straight to your wallet.
            </p>
          </div>
        </div>

        {/* Earnings + counts */}
        {isLoading ? (
          <Skeleton className="h-24 rounded-card" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <StatCell label="Referrals" value={String(stats?.totalReferrals ?? 0)} />
            <StatCell label="Active" value={String(stats?.activeReferrals ?? 0)} />
            <StatCell label="Earned" value={formatPrice(stats?.totalEarned ?? 0)} accent />
          </div>
        )}

        {/* Invite link */}
        {stats && (
          <div className="rounded-card border border-border bg-surface p-4">
            <p className="mb-2 text-[13px] font-medium text-fg-secondary">Your invite link</p>
            <div className="flex items-center gap-2 rounded-btn border border-border bg-bg p-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg">{stats.inviteLink}</span>
              <button type="button" onClick={copyLink} className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/6 text-fg-secondary">
                <Copy className="size-4" />
              </button>
            </div>
            {copied && <p className="mt-1.5 text-[11px] text-success">Copied!</p>}
            <Button variant="primary" fullWidth className="mt-3" onClick={share}>
              <Share2 className="size-4" /> Share invite
            </Button>
          </div>
        )}

        {/* Recent earnings */}
        {stats && stats.recentEarnings.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Recent earnings</h2>
            <div className="space-y-2">
              {stats.recentEarnings.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
                  <Avatar src={e.referredUser.photoUrl} name={e.referredUser.firstName} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{e.referredUser.firstName}</p>
                    <p className="text-xs text-fg-tertiary">{relativeTime(e.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-success">+{formatPrice(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fg-secondary">
              <Crown className="size-4 text-primary" /> Top affiliates
            </h2>
            <div className="overflow-hidden rounded-card border border-border bg-surface">
              {leaderboard.map((row) => (
                <div
                  key={row.rank}
                  className={cn(
                    "flex items-center gap-3 border-b border-border px-4 py-3 last:border-0",
                    row.isCurrentUser && "bg-primary/[0.06]",
                  )}
                >
                  <span className={cn("w-5 text-center text-sm font-bold tabular-nums", row.rank <= 3 ? "text-primary" : "text-fg-tertiary")}>
                    {row.rank}
                  </span>
                  <Avatar src={row.photoUrl} name={row.firstName} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium">
                    {row.firstName} {row.isCurrentUser && <span className="text-primary">(You)</span>}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-success">{formatPrice(row.totalEarned)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-bg/80 px-4 py-3 backdrop-blur-xl">
      <button type="button" onClick={onBack} className="grid size-9 place-items-center rounded-full bg-white/6 text-fg">
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-lg font-bold">{title}</h1>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3 text-center">
      <p className={cn("text-lg font-bold tabular-nums", accent ? "text-success" : "text-fg")}>{value}</p>
      <p className="text-[11px] text-fg-tertiary">{label}</p>
    </div>
  );
}
