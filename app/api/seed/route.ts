import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchWtiSpotPrices, fetchBrentSpotPrices, fetchCrudeInventories } from "@/lib/eia";
import { upsertOilPrice, upsertInventory } from "@/lib/db/oil-prices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const results: Record<string, number | string> = {};

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
    results.telegram = newsData?.synced ?? "done";
  } catch (e) {
    results.telegramError = e instanceof Error ? e.message : "unknown";
  }

  // Sync RSS news
  try {
    const rssRes = await fetch(new URL("/api/cron/sync-rss-news", req.url), {
      headers: internalHeaders,
    });
    const rssData = await rssRes.json();
    results.rss = rssData?.synced ?? "done";
  } catch (e) {
    results.rssError = e instanceof Error ? e.message : "unknown";
  }

  // Generate AI daily brief
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
