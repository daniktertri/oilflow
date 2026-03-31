import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  signSession,
} from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { upsertTelegramUser } from "@/lib/db/users";
import { verifyTelegramIdToken } from "@/lib/telegram-oidc-verify";
import { verifyTelegramAuth } from "@/lib/telegram-verify";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idToken = body.id_token;
  const clientId = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID?.trim();

  if (typeof idToken === "string" && idToken.includes(".")) {
    if (!clientId) {
      return NextResponse.json(
        { error: "Server missing NEXT_PUBLIC_TELEGRAM_CLIENT_ID" },
        { status: 500 }
      );
    }
    const tg = await verifyTelegramIdToken(idToken, clientId);
    if (!tg) {
      return NextResponse.json(
        { error: "Invalid or expired Telegram login" },
        { status: 401 }
      );
    }
    return completeLogin(tg);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      {
        error:
          "Server missing TELEGRAM_BOT_TOKEN (legacy) or use id_token with NEXT_PUBLIC_TELEGRAM_CLIENT_ID (OIDC)",
      },
      { status: 500 }
    );
  }

  const tg = verifyTelegramAuth(body, botToken);
  if (!tg) {
    return NextResponse.json(
      { error: "Invalid or expired Telegram login" },
      { status: 401 }
    );
  }
  return completeLogin(tg);
}

type TgUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

async function completeLogin(tg: TgUser) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Server missing DATABASE_URL — add Neon connection string" },
      { status: 500 }
    );
  }

  let userId: string;
  try {
    const row = await upsertTelegramUser(sql, {
      telegramId: tg.id,
      username: tg.username,
      firstName: tg.first_name,
      lastName: tg.last_name,
      photoUrl: tg.photo_url,
    });
    userId = row.id;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Database error while saving user";
    console.error("[auth/telegram] db:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let sessionToken: string;
  try {
    sessionToken = signSession({
      userId,
      tgId: tg.id,
      username: tg.username,
      firstName: tg.first_name,
      lastName: tg.last_name,
      photoUrl: tg.photo_url,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Session error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
