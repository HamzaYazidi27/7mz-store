/**
 * Development mock for the Telegram WebApp environment.
 *
 * Only installed when BOTH are true:
 *   • NEXT_PUBLIC_DEV_MODE === "true"
 *   • the app is NOT running inside real Telegram
 *
 * Pairs with the API's AUTH_DEV_BYPASS flag, which accepts this unsigned
 * initData in development. Production builds ship with DEV_MODE off, and the
 * API always verifies real HMAC signatures there — no code changes needed.
 */

import type { TelegramWebApp } from "./types";

const DEV_USER = {
  id: 7_777_777,
  first_name: "Dev",
  last_name: "Preview",
  username: "dev_preview",
  language_code: "en",
  photo_url: undefined,
} as const;

export function installMockTelegramEnv(): void {
  if (typeof window === "undefined") return;
  if (window.Telegram?.WebApp?.initData) return; // real Telegram present

  const params = new URLSearchParams({
    user: JSON.stringify(DEV_USER),
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: "dev-mode-unsigned",
  });

  const noop = (): void => undefined;

  const mock: Partial<TelegramWebApp> = {
    initData: params.toString(),
    initDataUnsafe: {
      user: { ...DEV_USER },
      auth_date: Math.floor(Date.now() / 1000),
      hash: "dev-mode-unsigned",
    },
    version: "8.0",
    platform: "webview-mock",
    colorScheme: "dark",
    themeParams: {
      bg_color: "#09090b",
      text_color: "#ffffff",
      hint_color: "#a1a1aa",
      button_color: "#ffd43b",
      button_text_color: "#17130a",
      secondary_bg_color: "#111113",
    },
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    headerColor: "#09090b",
    backgroundColor: "#09090b",
    ready: noop,
    expand: noop,
    close: noop,
    setHeaderColor: noop,
    setBackgroundColor: noop,
    enableClosingConfirmation: noop,
    disableClosingConfirmation: noop,
    enableVerticalSwipes: noop,
    disableVerticalSwipes: noop,
    onEvent: noop,
    offEvent: noop,
    openLink: (url: string) => window.open(url, "_blank"),
    openTelegramLink: (url: string) => window.open(url, "_blank"),
    openInvoice: (_url, callback) => callback?.("cancelled"),
    showAlert: (message, callback) => {
      window.alert(message);
      callback?.();
    },
    showConfirm: (message, callback) => callback?.(window.confirm(message)),
    showPopup: (params, callback) => {
      window.alert(`${params.title ? `${params.title}\n` : ""}${params.message}`);
      callback?.("ok");
    },
    sendData: noop,
    isVersionAtLeast: () => true,
    HapticFeedback: {
      impactOccurred: noop,
      notificationOccurred: noop,
      selectionChanged: noop,
    },
    BackButton: {
      isVisible: false,
      show: noop,
      hide: noop,
      onClick: noop,
      offClick: noop,
    },
    MainButton: {
      text: "",
      color: "#ffd43b",
      textColor: "#17130a",
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      setText: noop,
      onClick: noop,
      offClick: noop,
      show: noop,
      hide: noop,
      enable: noop,
      disable: noop,
      showProgress: noop,
      hideProgress: noop,
      setParams: noop,
    },
    CloudStorage: {
      setItem: (key, value, cb) => {
        localStorage.setItem(`tg-cloud:${key}`, value);
        cb?.(null, true);
      },
      getItem: (key, cb) => cb(null, localStorage.getItem(`tg-cloud:${key}`) ?? undefined),
      getItems: (keys, cb) =>
        cb(
          null,
          Object.fromEntries(
            keys.map((k) => [k, localStorage.getItem(`tg-cloud:${k}`) ?? ""]),
          ),
        ),
      removeItem: (key, cb) => {
        localStorage.removeItem(`tg-cloud:${key}`);
        cb?.(null, true);
      },
      removeItems: (keys, cb) => {
        keys.forEach((k) => localStorage.removeItem(`tg-cloud:${k}`));
        cb?.(null, true);
      },
      getKeys: (cb) => cb(null, []),
    },
  };

  window.Telegram = { WebApp: mock as TelegramWebApp };
}
