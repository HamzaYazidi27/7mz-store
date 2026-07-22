import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramInitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface ParsedInitData {
  user: TelegramInitDataUser | null;
  authDate: number;
  startParam: string | null;
  queryId: string | null;
  hash: string;
}

export type InitDataVerification =
  | { ok: true; data: ParsedInitData }
  | { ok: false; reason: "malformed" | "missing_hash" | "bad_signature" | "expired" | "no_user" };

/** Parses a raw initData query string without verifying it. */
export function parseInitData(initData: string): ParsedInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const rawUser = params.get("user");
    return {
      user: rawUser ? (JSON.parse(rawUser) as TelegramInitDataUser) : null,
      authDate: Number.parseInt(params.get("auth_date") ?? "0", 10),
      startParam: params.get("start_param"),
      queryId: params.get("query_id"),
      hash: params.get("hash") ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Verifies Telegram WebApp initData per the official algorithm:
 *   secret    = HMAC_SHA256(key: "WebAppData", message: bot_token)
 *   signature = HMAC_SHA256(key: secret, message: data_check_string)
 * where data_check_string is every field except `hash`, sorted
 * alphabetically and joined as "key=value" lines.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86_400,
): InitDataVerification {
  const parsed = parseInitData(initData);
  if (!parsed) return { ok: false, reason: "malformed" };
  if (!parsed.hash) return { ok: false, reason: "missing_hash" };

  const params = new URLSearchParams(initData);
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const signature = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const hashBuf = Buffer.from(parsed.hash, "hex");
  const valid =
    sigBuf.length === hashBuf.length && hashBuf.length > 0 && timingSafeEqual(sigBuf, hashBuf);
  if (!valid) return { ok: false, reason: "bad_signature" };

  const age = Math.floor(Date.now() / 1000) - parsed.authDate;
  if (!Number.isFinite(parsed.authDate) || parsed.authDate <= 0 || age > maxAgeSeconds) {
    return { ok: false, reason: "expired" };
  }

  if (!parsed.user) return { ok: false, reason: "no_user" };
  return { ok: true, data: parsed };
}
