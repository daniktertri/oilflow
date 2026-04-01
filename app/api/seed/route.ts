import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchWtiSpotPrices, fetchBrentSpotPrices, fetchCrudeInventories } from "@/lib/eia";
import { upsertOilPrice, upsertInventory } from "@/lib/db/oil-prices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-time seed endpoint to populate initial price data.
 * No auth required — safe because it's purely additive (upsert).
 * Hit this once after deployment: GET /api/seed
 */
export async function GET(req: NextRequest) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const results: Record<string, number | string> = {};

  // Fetch 1 year of WTI data
  try {
    const wtiPrices = await fetchWtiSpotPrices(365);
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

  // Fetch 1 year of Brent data
  try {
    const brentPrices = await fetchBrentSpotPrices(365);
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

  // Fetch 1 year of inventory data
  try {
    const inventories = await fetchCrudeInventories(52);
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

  // Build headers for internal cron calls (pass CRON_SECRET if set)
  const cronSecret = process.env.CRON_SECRET;
  const internalHeaders: HeadersInit = cronSecret
    ? { Authorization: `Bearer ${cronSecret}` }
    : {};

  // Sync Telegram news
  try {
    const newsRes = await fetch(new URL("/api/cron/sync-telegram-news", req.url), {
      headers: internalHeaders,
    });
    const newsData = await newsRes.json();
    results.news = newsData?.synced ?? "done";
  } catch (e) {
    results.newsError = e instanceof Error ? e.message : "unknown";
  }

  // Generate AI daily brief (needs prices to be seeded first)
  try {
    const briefRes = await fetch(new URL("/api/cron/daily-brief", req.url), {
      headers: internalHeaders,
    });
    const briefData = await briefRes.json();
    results.brief = briefData?.ok ? "generated" : briefData?.error ?? "failed";
  } catch (e) {
    results.briefError = e instanceof Error ? e.message : "unknown";
  }

  return NextResponse.json({ ok: true, seeded: results });
}
