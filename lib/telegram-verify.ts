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

function parseTelegramUserId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string" && /^\d{1,20}$/.test(v)) {
    const n = Number(v);
    if (Number.isSafeInteger(n)) return n;
  }
  return null;
}

function parseAuthDateUnix(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d{1,12}$/.test(v)) return parseInt(v, 10);
  return null;
}

/**
 * Verifies Telegram Login Widget data per
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(
  data: Record<string, unknown>,
  botToken: string
): TelegramAuthPayload | null {
  if (!botToken) return null;
  const hash = data.hash;
  if (typeof hash !== "string" || !hash) return null;

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
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const authDate = parseAuthDateUnix(data.auth_date);
  if (authDate === null) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > AUTH_MAX_AGE_SEC) return null;

  const id = parseTelegramUserId(data.id);
  if (id === null) return null;

  const firstName = data.first_name;
  if (typeof firstName !== "string" || firstName.length === 0) return null;

  const payload: TelegramAuthPayload = {
    id,
    first_name: firstName,
    auth_date: authDate,
    hash,
  };
  if (typeof data.last_name === "string") payload.last_name = data.last_name;
  if (typeof data.username === "string") payload.username = data.username;
  if (typeof data.photo_url === "string") payload.photo_url = data.photo_url;

  return payload;
}
