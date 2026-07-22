import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramLoginData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  [key: string]: unknown;
}

/**
 * Verifies Telegram Login Widget data (used by the standalone admin panel).
 * Algorithm differs from Mini App initData: the secret key is
 * SHA256(bot_token), and the data-check-string is the sorted "key=value"
 * lines of every field except `hash`.
 */
export function verifyTelegramLogin(
  data: TelegramLoginData,
  botToken: string,
  maxAgeSeconds = 86_400,
): boolean {
  const { hash, ...fields } = data;
  if (!hash) return false;

  const dataCheckString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");

  const secret = createHash("sha256").update(botToken).digest();
  const signature = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  if (sigBuf.length !== hashBuf.length || hashBuf.length === 0) return false;
  if (!timingSafeEqual(sigBuf, hashBuf)) return false;

  const age = Math.floor(Date.now() / 1000) - data.auth_date;
  return Number.isFinite(data.auth_date) && data.auth_date > 0 && age <= maxAgeSeconds;
}
