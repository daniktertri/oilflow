import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getLatestBrief } from "@/lib/db/market-briefs";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  try {
    const brief = await getLatestBrief(sql);
    return NextResponse.json({ brief });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
