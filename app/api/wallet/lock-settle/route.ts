import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  settleAllExpiredLocksForUser,
  settleLockById,
} from "@/lib/db/wallet";
import { getSessionUserId } from "@/lib/wallet-session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 }
    );
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Server missing DATABASE_URL." },
      { status: 500 }
    );
  }

  let body: { lockId?: unknown } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as { lockId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const lockId =
    typeof body.lockId === "string" && body.lockId.length > 0
      ? body.lockId
      : null;

  if (lockId) {
    const result = await settleLockById(sql, userId, lockId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      balanceAfter: result.balanceAfter,
      settledCount: 1,
      totalPrincipalSettled: result.principalUsd,
    });
  }

  const result = await settleAllExpiredLocksForUser(sql, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    balanceAfter: result.balanceAfter,
    settledCount: result.settledCount,
    totalPrincipalSettled: result.totalPrincipalSettled,
  });
}
