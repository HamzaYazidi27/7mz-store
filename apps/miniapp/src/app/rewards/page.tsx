"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarCheck, Check, Gift, Loader2 } from "lucide-react";
import { formatPrice, type SpinResultDto } from "@7mz/shared";
import { Button, Skeleton, cn } from "@7mz/ui";
import {
  useClaimDaily,
  useDailyReward,
  useSpin,
  useSpinState,
} from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";
import { celebrate } from "@/lib/confetti";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";
import { Header } from "@/app/referrals/page";

export default function RewardsPage() {
  const router = useRouter();
  useTelegramBackButton();

  const { data: daily, isLoading: dailyLoading } = useDailyReward();
  const claimDaily = useClaimDaily();
  const { data: spinState } = useSpinState();
  const spin = useSpin();

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResultDto | null>(null);

  const prizes = spinState?.prizes ?? [];
  const segAngle = prizes.length > 0 ? 360 / prizes.length : 45;

  const wheelGradient = useMemo(() => {
    if (prizes.length === 0) return "conic-gradient(#1c1c21 0deg 360deg)";
    const stops = prizes
      .map((p, i) => {
        const color = p.color ?? (i % 2 === 0 ? "#1c1c21" : "#26262b");
        return `${color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`;
      })
      .join(", ");
    return `conic-gradient(from -${segAngle / 2}deg, ${stops})`;
  }, [prizes, segAngle]);

  const doClaimDaily = async () => {
    haptics.press();
    try {
      await claimDaily.mutateAsync();
      celebrate();
      haptics.notify("success");
    } catch {
      haptics.notify("error");
    }
  };

  const doSpin = async () => {
    if (spinning || !spinState?.canSpin) return;
    setSpinning(true);
    setResult(null);
    haptics.press();
    try {
      const res = await spin.mutateAsync();
      const idx = prizes.findIndex((p) => p.id === res.prize.id);
      const target = idx >= 0 ? idx : 0;
      // 5 full turns + land on the middle of the winning segment (pointer at top).
      const final = 360 * 5 + (360 - target * segAngle);
      setRotation((r) => r - (r % 360) + final);
      setTimeout(() => {
        setSpinning(false);
        setResult(res);
        if (Number(res.awardedAmount) > 0 || res.couponCode) {
          celebrate();
          haptics.notify("success");
        } else {
          haptics.notify("warning");
        }
      }, 4200);
    } catch {
      setSpinning(false);
      haptics.notify("error");
    }
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-10">
      <Header title="Rewards" onBack={() => router.back()} />

      <div className="space-y-6 p-4">
        {/* Daily streak */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
            <CalendarCheck className="size-5 text-primary" /> Daily reward
          </h2>
          {dailyLoading ? (
            <Skeleton className="h-28 rounded-card" />
          ) : daily ? (
            <div className="rounded-card border border-border bg-surface p-4">
              <div className="flex gap-1.5">
                {daily.ladder.map((d) => (
                  <div
                    key={d.day}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-lg border py-2",
                      d.claimed
                        ? "border-success/30 bg-success/10"
                        : d.isToday
                          ? "border-primary/50 bg-primary/10"
                          : "border-border bg-surface-2",
                    )}
                  >
                    <span className="text-[10px] text-fg-tertiary">D{d.day}</span>
                    {d.claimed ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <span className={cn("text-[11px] font-bold tabular-nums", d.isToday ? "text-primary" : "text-fg-secondary")}>
                        ${d.amount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="primary"
                fullWidth
                className="mt-3"
                disabled={!daily.canClaim}
                loading={claimDaily.isPending}
                onClick={doClaimDaily}
              >
                {daily.canClaim ? `Claim ${formatPrice(daily.todayAmount)} · Day ${daily.streak + 1}` : "Come back tomorrow"}
              </Button>
            </div>
          ) : null}
        </section>

        {/* Spin wheel */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
            <Gift className="size-5 text-accent" /> Prize wheel
          </h2>
          <div className="flex flex-col items-center rounded-card border border-border bg-surface p-6">
            <div className="relative">
              {/* Pointer */}
              <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
                <div className="size-0 border-x-8 border-t-[14px] border-x-transparent border-t-primary" />
              </div>
              {/* Wheel */}
              <motion.div
                className="relative size-64 rounded-full border-4 border-white/10"
                style={{ background: wheelGradient }}
                animate={{ rotate: rotation }}
                transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
              >
                {prizes.map((p, i) => (
                  <div
                    key={p.id}
                    className="absolute left-1/2 top-1/2 origin-left"
                    style={{ transform: `rotate(${i * segAngle}deg)` }}
                  >
                    <span className="ml-6 inline-block -translate-y-1/2 whitespace-nowrap text-[10px] font-bold text-white drop-shadow">
                      {p.label}
                    </span>
                  </div>
                ))}
                <div className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/20 bg-bg" />
              </motion.div>
            </div>

            <Button
              variant="accent"
              size="lg"
              className="mt-6"
              fullWidth
              disabled={!spinState?.canSpin || spinning}
              loading={spinning}
              onClick={doSpin}
            >
              {spinState?.canSpin ? "Spin the wheel" : "Come back tomorrow"}
            </Button>

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 w-full rounded-btn border border-border bg-surface-2 p-3 text-center"
              >
                {Number(result.awardedAmount) > 0 ? (
                  <p className="text-sm font-semibold text-success">
                    🎉 You won {formatPrice(result.awardedAmount)}!
                  </p>
                ) : result.couponCode ? (
                  <p className="text-sm font-semibold text-accent">🎟 You won coupon {result.couponCode}!</p>
                ) : (
                  <p className="text-sm text-fg-secondary">No luck this time — try again tomorrow!</p>
                )}
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
