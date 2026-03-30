import { createHash, createHmac, timingSafeEqual } from "crypto";

/** Payload from Telegram Login Widget (callback or redirect). */
export type TelegramAuthPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const AUTH_MAX_AGE_SEC = 86400; // 24h — reject stale logins

/**
 * Verifies Telegram Login Widget data per
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(
  data: Record<string, unknown>,
  botToken: string
): data is TelegramAuthPayload {
  if (!botToken) return false;
  const hash = data.hash;
  if (typeof hash !== "string" || !hash) return false;

  const pairs: [string, string][] = [];
  for (const key of Object.keys(data)) {
    if (key === "hash") continue;
    const v = data[key];
    if (v === undefined || v === null) continue;
    pairs.push([key, String(v)]);
  }
  pairs.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computed = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const authDate = data.auth_date;
  if (typeof authDate !== "number" || !Number.isFinite(authDate)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > AUTH_MAX_AGE_SEC) return false;

  const id = data.id;
  const firstName = data.first_name;
  if (typeof id !== "number" || !Number.isFinite(id)) return false;
  if (typeof firstName !== "string" || firstName.length === 0) return false;

  return true;
}
