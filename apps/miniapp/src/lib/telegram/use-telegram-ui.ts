"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getWebApp } from "./types";

/**
 * Shows the Telegram BackButton while mounted and routes back on tap.
 * No-op outside Telegram (falls back to the browser router on detail pages).
 */
export function useTelegramBackButton(onBack?: () => void) {
  const router = useRouter();
  useEffect(() => {
    const tg = getWebApp();
    if (!tg?.BackButton) return;
    const handler = () => (onBack ? onBack() : router.back());
    tg.BackButton.show();
    tg.BackButton.onClick(handler);
    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }, [router, onBack]);
}

/**
 * Drives the Telegram MainButton (the big bottom CTA) while mounted.
 * When Telegram isn't present, the component should render its own button.
 */
export function useTelegramMainButton(params: {
  text: string;
  visible: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { text, visible, loading, disabled, onClick } = params;
  useEffect(() => {
    const tg = getWebApp();
    if (!tg?.MainButton) return;
    const mb = tg.MainButton;

    if (!visible) {
      mb.hide();
      return;
    }
    mb.setText(text);
    mb.setParams({ color: "#FFD43B", text_color: "#17130A" });
    if (disabled) mb.disable();
    else mb.enable();
    if (loading) mb.showProgress(false);
    else mb.hideProgress();
    mb.show();
    mb.onClick(onClick);
    return () => {
      mb.offClick(onClick);
      mb.hideProgress();
    };
  }, [text, visible, loading, disabled, onClick]);

  // Hide on unmount.
  useEffect(() => {
    return () => getWebApp()?.MainButton?.hide();
  }, []);
}

/** True when running inside the real Telegram client (not the dev mock). */
export function useIsTelegram(): boolean {
  const tg = getWebApp();
  return !!tg?.initData && tg.platform !== "webview-mock";
}
