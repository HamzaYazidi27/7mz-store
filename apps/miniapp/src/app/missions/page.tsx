"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "@7mz/shared";
import { Button, EmptyState, ProgressBar, Skeleton, cn } from "@7mz/ui";
import { useClaimMission, useMissions } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";
import { celebrate } from "@/lib/confetti";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";
import { Header } from "@/app/referrals/page";

function DynamicIcon({ name }: { name: string | null }) {
  const Icon = (name && (Icons as Record<string, unknown>)[name]) as
    | React.ComponentType<{ className?: string }>
    | undefined;
  return Icon ? <Icon className="size-5" /> : <Icons.Target className="size-5" />;
}

export default function MissionsPage() {
  const router = useRouter();
  useTelegramBackButton();
  const { data: missions, isLoading } = useMissions();
  const claim = useClaimMission();

  const doClaim = async (id: string) => {
    haptics.press();
    try {
      await claim.mutateAsync(id);
      celebrate();
      haptics.notify("success");
    } catch {
      haptics.notify("error");
    }
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-10">
      <Header title="Missions" onBack={() => router.back()} />
      <div className="space-y-3 p-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-card" />)
        ) : !missions || missions.length === 0 ? (
          <EmptyState icon={<Icons.Target />} title="No missions yet" description="Check back soon for tasks and rewards." />
        ) : (
          missions.map((m, i) => {
            const pct = m.target > 0 ? m.progress / m.target : 0;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.05 }}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-xl",
                      m.completed ? "bg-success/15 text-success" : "bg-primary/12 text-primary",
                    )}
                  >
                    {m.completed ? <CheckCircle2 className="size-5" /> : <DynamicIcon name={m.icon} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{m.title}</p>
                      <span className="shrink-0 text-sm font-bold text-primary">+{formatPrice(m.rewardAmount)}</span>
                    </div>
                    <p className="text-xs text-fg-secondary">{m.description}</p>

                    {m.target > 1 && !m.claimed && (
                      <div className="mt-2">
                        <ProgressBar progress={pct} variant={m.completed ? "success" : "primary"} />
                        <p className="mt-1 text-[11px] tabular-nums text-fg-tertiary">
                          {m.progress} / {m.target}
                        </p>
                      </div>
                    )}

                    {m.claimed ? (
                      <p className="mt-2 text-[13px] font-medium text-success">Reward claimed ✓</p>
                    ) : m.completed ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-2"
                        loading={claim.isPending && claim.variables === m.id}
                        onClick={() => doClaim(m.id)}
                      >
                        Claim reward
                      </Button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
