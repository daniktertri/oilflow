import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listLockSyntheticTrades } from "@/lib/db/wallet";
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

  const rows = await listLockSyntheticTrades(sql, userId, limit);
  return NextResponse.json({
    trades: rows.map((t) => ({
      id: t.id,
      liquiditySource: t.liquidity_source,
      hourBucket: t.hour_bucket,
      pnlUsd: Number(t.pnl_usd),
      notionalUsd: Number(t.notional_usd),
      side: t.side,
      feeUsd: Number(t.fee_usd),
      createdAt: t.created_at,
    })),
  });
}
