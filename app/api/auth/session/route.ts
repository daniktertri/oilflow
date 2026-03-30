import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth-types";
import {
  SESSION_COOKIE_NAME,
  verifySession,
} from "@/lib/auth-session";

export async function GET() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return NextResponse.json({ user: null });
  }
  const payload = verifySession(raw);
  if (!payload) {
    const res = NextResponse.json({ user: null });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }
  const user: SessionUser = {
    ...(payload.userId ? { id: payload.userId } : {}),
    telegramId: payload.tgId,
    username: payload.username,
    firstName: payload.firstName,
    lastName: payload.lastName,
    photoUrl: payload.photoUrl,
  };
  return NextResponse.json({ user });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
