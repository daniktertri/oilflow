import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchWtiSpotPrices, fetchBrentSpotPrices, fetchCrudeInventories } from "@/lib/eia";
import { upsertOilPrice, upsertInventory } from "@/lib/db/oil-prices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const results: Record<string, number | string> = {};

  try {
    const wtiPrices = await fetchWtiSpotPrices(30);
    for (const p of wtiPrices) {
      await upsertOilPrice(sql, {
        benchmark: "WTI",
        priceDate: p.date,
        close: p.value,
        source: "eia",
      });
    }
    results.wti = wtiPrices.length;
  } catch (e) {
    results.wtiError = e instanceof Error ? e.message : "unknown";
  }

  try {
    const brentPrices = await fetchBrentSpotPrices(30);
    for (const p of brentPrices) {
      await upsertOilPrice(sql, {
        benchmark: "BRENT",
        priceDate: p.date,
        close: p.value,
        source: "eia",
      });
    }
    results.brent = brentPrices.length;
  } catch (e) {
    results.brentError = e instanceof Error ? e.message : "unknown";
  }

  try {
    const inventories = await fetchCrudeInventories(8);
    for (const inv of inventories) {
      await upsertInventory(sql, {
        reportDate: inv.date,
        product: "EPC0",
        region: "US",
        value: inv.value,
      });
    }
    results.inventories = inventories.length;
  } catch (e) {
    results.inventoriesError = e instanceof Error ? e.message : "unknown";
  }

  return NextResponse.json({ ok: true, synced: results });
}
