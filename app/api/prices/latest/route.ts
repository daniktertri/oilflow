import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getLatestPrices } from "@/lib/db/oil-prices";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  try {
    const prices = await getLatestPrices(sql);
    return NextResponse.json({ prices }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch prices";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
