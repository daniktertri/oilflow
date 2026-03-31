import * as jose from "jose";

const ISSUER = "https://oauth.telegram.org";
const JWKS = jose.createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json")
);

const AUTH_MAX_AGE_SEC = 86400;
/** Clock skew tolerance (Telegram / server time mismatch). */
const CLOCK_SKEW_SEC = 120;

/** Normalized shape aligned with legacy TelegramAuthPayload for DB + session. */
export type TelegramOidcVerified = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
};

function audienceMatches(payload: jose.JWTPayload, clientId: string): boolean {
  const aud = payload.aud;
  const want = String(clientId).trim();
  if (aud === undefined || aud === null) return false;
  if (Array.isArray(aud)) {
    return aud.some((a) => String(a) === want);
  }
  return String(aud) === want;
}

function parseTelegramNumericId(payload: jose.JWTPayload): number | null {
  const raw = payload.id;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d{1,20}$/.test(raw)) {
    const n = Number(raw);
    if (Number.isSafeInteger(n) && n > 0) return n;
  }
  const sub = payload.sub;
  if (typeof sub === "string" && /^\d{1,20}$/.test(sub)) {
    const n = Number(sub);
    if (Number.isSafeInteger(n) && n > 0) return n;
  }
  return null;
}

function displayNameFromPayload(payload: jose.JWTPayload): string | null {
  if (typeof payload.name === "string" && payload.name.trim().length > 0) {
    return payload.name.trim();
  }
  const given = payload.given_name;
  const family = payload.family_name;
  if (typeof given === "string" && given.trim().length > 0) {
    const g = given.trim();
    if (typeof family === "string" && family.trim().length > 0) {
      return `${g} ${family.trim()}`;
    }
    return g;
  }
  if (
    typeof payload.preferred_username === "string" &&
    payload.preferred_username.trim().length > 0
  ) {
    return payload.preferred_username.trim();
  }
  return null;
}

/**
 * Verifies Telegram OIDC `id_token` (JWKS) per
 * https://oauth.telegram.org
 *
 * Note: We validate `aud` manually — Telegram may emit `aud` as string or number;
 * strict `jwtVerify({ audience })` often rejects valid tokens.
 */
export async function verifyTelegramIdToken(
  token: string,
  clientId: string
): Promise<TelegramOidcVerified | null> {
  if (!token || !clientId) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: ISSUER,
    });

    if (!audienceMatches(payload, clientId)) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[telegram-oidc] aud mismatch: got",
          payload.aud,
          "expected",
          clientId
        );
      }
      return null;
    }

    const id = parseTelegramNumericId(payload);
    if (id === null) return null;

    const nameRaw = displayNameFromPayload(payload);
    if (!nameRaw) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[telegram-oidc] missing name / preferred_username in id_token"
        );
      }
      return null;
    }

    let firstName = nameRaw;
    let lastName: string | undefined;
    const sp = nameRaw.indexOf(" ");
    if (sp > 0) {
      firstName = nameRaw.slice(0, sp);
      lastName = nameRaw.slice(sp + 1).trim() || undefined;
    }

    const iat = payload.iat;
    if (typeof iat !== "number" || !Number.isFinite(iat)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (iat > now + CLOCK_SKEW_SEC) return null;
    if (now - iat > AUTH_MAX_AGE_SEC + CLOCK_SKEW_SEC) return null;

    const preferredUsername = payload.preferred_username;
    const picture = payload.picture;

    const out: TelegramOidcVerified = {
      id,
      first_name: firstName,
      auth_date: iat,
    };
    if (lastName) out.last_name = lastName;
    if (typeof preferredUsername === "string" && preferredUsername.length > 0) {
      out.username = preferredUsername;
    }
    if (typeof picture === "string" && picture.length > 0) {
      out.photo_url = picture;
    }

    return out;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[telegram-oidc] jwtVerify failed:", e);
    }
    return null;
  }
}
