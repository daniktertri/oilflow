import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureAccountBalanceRow, lockInWithSession } from "@/lib/db/wallet";
import { getSessionUserId } from "@/lib/wallet-session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401 }
    );
  }

  let body: { amountUsd?: unknown; durationMs?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const amountUsd =
    typeof body.amountUsd === "number"
      ? body.amountUsd
      : typeof body.amountUsd === "string"
        ? Number(body.amountUsd)
        : NaN;

  const durationMs =
    typeof body.durationMs === "number"
      ? body.durationMs
      : typeof body.durationMs === "string"
        ? Number(body.durationMs)
        : NaN;

  if (!Number.isFinite(amountUsd) || amountUsd < 10) {
    return NextResponse.json(
      { error: "Minimum lock is $10." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return NextResponse.json(
      { error: "Lock duration is required (durationMs)." },
      { status: 400 }
    );
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Server missing DATABASE_URL." },
      { status: 500 }
    );
  }

  await ensureAccountBalanceRow(sql, userId);
  const result = await lockInWithSession(sql, userId, amountUsd, durationMs);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    balanceAfter: result.balanceAfter,
    lock: result.lock,
  });
}
