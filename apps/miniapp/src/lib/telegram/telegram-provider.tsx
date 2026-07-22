"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import type { AuthResponse } from "@7mz/shared";
import { useAuthStore } from "@/stores/auth-store";
import { installMockTelegramEnv } from "./mock-env";
import { getWebApp, type TelegramWebApp, type TelegramWebAppUser } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BRAND_BG = "#09090b";

interface TelegramContextValue {
  webApp: TelegramWebApp | null;
  tgUser: TelegramWebAppUser | null;
  platform: string;
  isTelegram: boolean;
  isReady: boolean;
  retryAuth: () => void;
}

const TelegramContext = createContext<TelegramContextValue>({
  webApp: null,
  tgUser: null,
  platform: "unknown",
  isTelegram: false,
  isReady: false,
  retryAuth: () => undefined,
});

/**
 * TelegramProvider — boots the Mini App:
 *  1. installs the dev mock when running in a plain browser (dev mode only)
 *  2. calls ready()/expand(), pins brand colors, disables vertical swipes
 *  3. authenticates against the API with signed initData on every open
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);
  const bootedRef = useRef(false);

  const authenticate = useCallback(async (tg: TelegramWebApp | null) => {
    const store = useAuthStore.getState();
    const initData = tg?.initData ?? "";

    if (!initData) {
      store.setStatus("guest");
      return;
    }

    try {
      const { data } = await axios.post<AuthResponse>(
        `${BASE_URL}/api/v1/auth/telegram`,
        {
          initData,
          startParam: tg?.initDataUnsafe?.start_param ?? undefined,
          platform: tg?.platform ?? undefined,
        },
        { timeout: 20_000 },
      );
      store.setAuth(data.user, {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
    } catch {
      store.setStatus("error");
    }
  }, []);

  const boot = useCallback(() => {
    if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
      installMockTelegramEnv();
    }

    const tg = getWebApp();
    setWebApp(tg);

    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor(BRAND_BG);
        tg.setBackgroundColor(BRAND_BG);
        tg.setBottomBarColor?.(BRAND_BG);
        if (tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes();
      } catch {
        /* older clients may not support every call */
      }
    }

    void authenticate(tg).finally(() => setIsReady(true));
  }, [authenticate]);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    boot();
  }, [boot]);

  const retryAuth = useCallback(() => {
    useAuthStore.getState().setStatus("booting");
    void authenticate(getWebApp());
  }, [authenticate]);

  const value = useMemo<TelegramContextValue>(() => {
    const tgUser = webApp?.initDataUnsafe?.user ?? null;
    return {
      webApp,
      tgUser,
      platform: webApp?.platform ?? "unknown",
      isTelegram: !!webApp?.initData && webApp.platform !== "webview-mock",
      isReady,
      retryAuth,
    };
  }, [webApp, isReady, retryAuth]);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}
