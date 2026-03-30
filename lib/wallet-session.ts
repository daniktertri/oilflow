import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySession,
} from "@/lib/auth-session";

/**
 * Returns Neon `users.id` when the session is valid and includes `userId` (post-login).
 */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = verifySession(raw);
  if (!payload?.userId) return null;
  return payload.userId;
}
