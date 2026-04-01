import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSpreadHistory } from "@/lib/db/oil-prices";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const bench1 = req.nextUrl.searchParams.get("bench1") ?? "BRENT";
  const bench2 = req.nextUrl.searchParams.get("bench2") ?? "WTI";
  const days = Math.min(Number(req.nextUrl.searchParams.get("days") ?? "180"), 730);

  try {
    const spreads = await getSpreadHistory(sql, bench1, bench2, days);
    return NextResponse.json({ bench1, bench2, spreads });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
