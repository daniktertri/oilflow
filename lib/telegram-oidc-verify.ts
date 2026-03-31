import * as jose from "jose";

const ISSUER = "https://oauth.telegram.org";
const JWKS = jose.createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json")
);

const AUTH_MAX_AGE_SEC = 86400;

/** Normalized shape aligned with legacy TelegramAuthPayload for DB + session. */
export type TelegramOidcVerified = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
};

/**
 * Verifies Telegram OIDC `id_token` (JWKS) per
 * https://oauth.telegram.org — claims include id, name, preferred_username, picture.
 */
export async function verifyTelegramIdToken(
  token: string,
  clientId: string
): Promise<TelegramOidcVerified | null> {
  if (!token || !clientId) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: clientId,
    });

    const id = payload.id;
    if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) return null;

    const name = payload.name;
    if (typeof name !== "string" || name.length === 0) return null;

    let firstName = name;
    let lastName: string | undefined;
    const sp = name.indexOf(" ");
    if (sp > 0) {
      firstName = name.slice(0, sp);
      lastName = name.slice(sp + 1).trim() || undefined;
    }

    const iat = payload.iat;
    if (typeof iat !== "number" || !Number.isFinite(iat)) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now - iat > AUTH_MAX_AGE_SEC) return null;

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
  } catch {
    return null;
  }
}
