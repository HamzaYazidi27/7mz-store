/* ============================================================================
   Telegram WebApp API — typed surface of window.Telegram.WebApp
   Covers the stable API used by 7MZ Store (Bot API 7.x/8.x era).
   ============================================================================ */

export interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramWebAppUser;
  receiver?: TelegramWebAppUser;
  start_param?: string;
  auth_date?: number;
  hash?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export type HapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotificationType = "error" | "success" | "warning";

export interface TelegramHapticFeedback {
  impactOccurred: (style: HapticImpactStyle) => void;
  notificationOccurred: (type: HapticNotificationType) => void;
  selectionChanged: () => void;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  setParams: (params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }) => void;
}

export interface TelegramCloudStorage {
  setItem: (key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
  getItem: (key: string, cb: (err: Error | null, value?: string) => void) => void;
  getItems: (keys: string[], cb: (err: Error | null, values?: Record<string, string>) => void) => void;
  removeItem: (key: string, cb?: (err: Error | null, ok?: boolean) => void) => void;
  removeItems: (keys: string[], cb?: (err: Error | null, ok?: boolean) => void) => void;
  getKeys: (cb: (err: Error | null, keys?: string[]) => void) => void;
}

export interface TelegramPopupButton {
  id?: string;
  type?: "default" | "ok" | "close" | "cancel" | "destructive";
  text?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isClosingConfirmationEnabled: boolean;
  isVerticalSwipesEnabled: boolean;
  headerColor: string;
  backgroundColor: string;

  BackButton: TelegramBackButton;
  MainButton: TelegramMainButton;
  HapticFeedback: TelegramHapticFeedback;
  CloudStorage: TelegramCloudStorage;

  ready: () => void;
  expand: () => void;
  close: () => void;

  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  enableVerticalSwipes: () => void;
  disableVerticalSwipes: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;

  onEvent: (eventType: string, handler: (...args: unknown[]) => void) => void;
  offEvent: (eventType: string, handler: (...args: unknown[]) => void) => void;

  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (
    url: string,
    callback?: (status: "paid" | "cancelled" | "failed" | "pending") => void,
  ) => void;

  showPopup: (
    params: { title?: string; message: string; buttons?: TelegramPopupButton[] },
    callback?: (buttonId: string) => void,
  ) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showScanQrPopup?: (
    params: { text?: string },
    callback?: (data: string) => boolean | void,
  ) => void;
  closeScanQrPopup?: () => void;

  shareMessage?: (msgId: string, callback?: (sent: boolean) => void) => void;
  switchInlineQuery?: (query: string, chooseChatTypes?: string[]) => void;
  sendData: (data: string) => void;
  isVersionAtLeast: (version: string) => boolean;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/** Returns the live WebApp object, or null when running outside Telegram. */
export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}
