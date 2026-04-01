import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getInventoryHistory } from "@/lib/db/oil-prices";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const product = req.nextUrl.searchParams.get("product") ?? "EPC0";
  const weeks = Math.min(Number(req.nextUrl.searchParams.get("weeks") ?? "52"), 260);

  try {
    const inventories = await getInventoryHistory(sql, product, weeks);
    return NextResponse.json({ product, inventories });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
