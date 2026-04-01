import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getLatestPrices } from "@/lib/db/oil-prices";
import { upsertMarketBrief } from "@/lib/db/market-briefs";
import { generateMarketBrief } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const prices = await getLatestPrices(sql);
  const wti = prices.find((p) => p.benchmark === "WTI");
  const brent = prices.find((p) => p.benchmark === "BRENT");

  if (!wti || !brent) {
    return NextResponse.json({ error: "Insufficient price data" }, { status: 500 });
  }

  // Gather recent headlines from both telegram posts and news articles
  const tgNews = (await sql`
    SELECT text_plain FROM telegram_channel_posts ORDER BY posted_at DESC LIMIT 5
  `) as { text_plain: string }[];

  const rssNews = (await sql`
    SELECT COALESCE(title, '') || ': ' || COALESCE(body, '') AS text_plain
    FROM news_articles ORDER BY published_at DESC LIMIT 5
  `) as { text_plain: string }[];

  const allNews = [...tgNews, ...rssNews].map((r) => r.text_plain.slice(0, 500));

  const wtiChange = wti.prev_close ? ((wti.close - wti.prev_close) / wti.prev_close) * 100 : 0;
  const brentChange = brent.prev_close ? ((brent.close - brent.prev_close) / brent.prev_close) * 100 : 0;

  const brief = await generateMarketBrief({
    wtiPrice: wti.close,
    brentPrice: brent.close,
    wtiChange,
    brentChange,
    recentNews: allNews,
  });

  if (!brief) {
    return NextResponse.json({ error: "AI brief generation failed (no OPENAI_API_KEY?)" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  await upsertMarketBrief(sql, {
    date: today,
    summary: brief.summary,
    outlook: brief.outlook,
    keyDrivers: brief.keyDrivers,
    sentiment: brief.sentiment,
    direction: brief.direction,
    conviction: brief.conviction,
    risks: brief.risks,
  });

  return NextResponse.json({ ok: true, brief });
}
