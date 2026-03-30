import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  signSession,
} from "@/lib/auth-session";
import { verifyTelegramAuth } from "@/lib/telegram-verify";

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server missing TELEGRAM_BOT_TOKEN" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyTelegramAuth(body, token)) {
    return NextResponse.json(
      { error: "Invalid or expired Telegram login" },
      { status: 401 }
    );
  }

  let sessionToken: string;
  try {
    sessionToken = signSession({
      tgId: body.id as number,
      username:
        typeof body.username === "string" ? body.username : undefined,
      firstName: body.first_name as string,
      lastName:
        typeof body.last_name === "string" ? body.last_name : undefined,
      photoUrl:
        typeof body.photo_url === "string" ? body.photo_url : undefined,
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
