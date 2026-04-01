import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPriceHistory } from "@/lib/db/oil-prices";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const benchmark = req.nextUrl.searchParams.get("benchmark") ?? "WTI";
  const days = Math.min(Number(req.nextUrl.searchParams.get("days") ?? "365"), 1825);

  try {
    const history = await getPriceHistory(sql, benchmark, days);
    return NextResponse.json({ benchmark, history }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch history";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
