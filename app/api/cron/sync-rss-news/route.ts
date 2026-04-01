import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { RSS_FEEDS } from "@/lib/rss-feeds";
import { upsertNewsArticle, updateNewsArticleAi } from "@/lib/db/news";
import { summarizeNewsArticle } from "@/lib/ai";
import Parser from "rss-parser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const parser = new Parser({
  timeout: 10_000,
  headers: { "User-Agent": "OilFlow-Terminal/1.0" },
});

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const results: Record<string, number | string> = {};

  for (const feed of RSS_FEEDS) {
    try {
      const rss = await parser.parseURL(feed.url);
      let inserted = 0;

      const items = (rss.items ?? []).slice(0, 15);

      for (const item of items) {
        const title = item.title?.trim();
        const url = item.link?.trim();
        if (!title || !url) continue;

        const pubDate = item.pubDate ?? item.isoDate ?? new Date().toISOString();
        const body = (item.contentSnippet ?? item.content ?? "").slice(0, 3000);

        const isNew = await upsertNewsArticle(sql, {
          source: feed.source,
          sourceName: feed.sourceName,
          title,
          body: body || undefined,
          url,
          publishedAt: new Date(pubDate).toISOString(),
        });

        if (isNew) {
          inserted++;
          try {
            const textForAi = `${title}\n\n${body}`.slice(0, 3000);
            const analysis = await summarizeNewsArticle(textForAi);
            if (analysis) {
              await updateNewsArticleAi(sql, url, {
                summary: analysis.summary,
                direction: analysis.direction,
                impactLevel: analysis.impactLevel,
                priceImpact: analysis.priceImpact,
                confidence: analysis.confidence,
                affectedBenchmarks: analysis.affectedBenchmarks.join(","),
                category: analysis.category,
                sentiment: analysis.direction,
              });
            }
          } catch {}
        }
      }
      results[feed.source] = inserted;
    } catch (e) {
      results[`${feed.source}_error`] = e instanceof Error ? e.message : "Failed";
    }
  }

  return NextResponse.json({ ok: true, synced: results });
}
