import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "of_tg_session";

export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  tgId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  iat: number;
};

function getSecret(): string {
  const s = tryGetSecret();
  if (!s) {
    throw new Error(
      "AUTH_SESSION_SECRET must be set to a random string of at least 32 characters"
    );
  }
  return s;
}

function tryGetSecret(): string | null {
  const s = process.env.AUTH_SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return s;
}

export function signSession(
  input: Omit<SessionPayload, "iat">
): string {
  const iat = Math.floor(Date.now() / 1000);
  const full: SessionPayload = { ...input, iat };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const secret = tryGetSecret();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (now - parsed.iat > SESSION_MAX_AGE_SEC) return null;
    if (typeof parsed.tgId !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
