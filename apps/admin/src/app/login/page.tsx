"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { AuthResponse } from "@7mz/shared";
import { Button, Input, cn } from "@7mz/ui";
import { api, apiError } from "@/lib/api";
import { useAdminAuth } from "@/stores/admin-auth";

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME;
const DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAdminAuth((s) => s.setAuth);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [devId, setDevId] = useState("100000001");
  const [loading, setLoading] = useState(false);

  const authenticate = async (payload: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<AuthResponse>("/auth/admin/telegram-login", payload);
      setAuth(data.user, data.tokens);
      router.replace("/");
    } catch (err) {
      setError(apiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  // Telegram Login Widget callback.
  useEffect(() => {
    (window as unknown as { onTelegramAuth?: (u: Record<string, unknown>) => void }).onTelegramAuth = (
      user,
    ) => authenticate(user);

    if (BOT && widgetRef.current && !DEV) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", BOT);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      widgetRef.current.appendChild(script);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary shadow-glow-primary">
            <span className="text-2xl font-extrabold text-on-primary">7</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold">
            7MZ <span className="text-primary">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-fg-secondary">Sign in with your Telegram admin account</p>
        </div>

        <div className="rounded-card-lg border border-border bg-surface p-6 shadow-card">
          {!DEV ? (
            <div className="flex flex-col items-center gap-4">
              <div ref={widgetRef} className="min-h-[48px]" />
              <p className="flex items-center gap-1.5 text-center text-xs text-fg-tertiary">
                <ShieldCheck className="size-3.5" /> Staff access only
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-fg-tertiary">
                Dev mode — enter an admin Telegram ID to sign in without the widget.
              </p>
              <Input value={devId} onChange={(e) => setDevId(e.target.value)} label="Telegram ID" />
              <Button
                variant="primary"
                fullWidth
                loading={loading}
                onClick={() =>
                  authenticate({ id: Number(devId), first_name: "Admin", hash: "dev-mode-unsigned", auth_date: Math.floor(Date.now() / 1000) })
                }
              >
                Sign in
              </Button>
            </div>
          )}
          {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
