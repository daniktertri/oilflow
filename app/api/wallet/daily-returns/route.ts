import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listDailyReturns } from "@/lib/db/wallet";
import { getSessionUserId } from "@/lib/wallet-session";

export async function GET() {
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

  const rows = await listDailyReturns(sql, userId, 5000);
  return NextResponse.json({
    rows: rows.map((r) => ({
      date: r.day,
      pnlUsd: Number(r.pnl_usd),
    })),
  });
}
