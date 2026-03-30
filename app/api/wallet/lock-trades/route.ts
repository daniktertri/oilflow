import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listLockHourlyAccruals } from "@/lib/db/wallet";
import { getSessionUserId } from "@/lib/wallet-session";

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    500,
    Math.max(1, Number(searchParams.get("limit")) || 200)
  );

  const rows = await listLockHourlyAccruals(sql, userId, limit);
  return NextResponse.json({
    trades: rows.map((t) => ({
      id: t.id,
      lockId: t.lock_id,
      hourBucket: t.hour_bucket,
      pnlUsd: Number(t.pnl_usd),
      createdAt: t.created_at,
    })),
  });
}
