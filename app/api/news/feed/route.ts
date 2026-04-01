import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type UnifiedPost = {
  id: string;
  source: string;
  sourceName: string;
  title: string | null;
  text: string;
  url: string | null;
  publishedAt: string;
  summary: string | null;
  direction: string | null;
  impactLevel: string | null;
  priceImpact: string | null;
  confidence: string | null;
  affectedBenchmarks: string | null;
  category: string | null;
};

export async function GET(req: NextRequest) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "30"), 100);
  const category = req.nextUrl.searchParams.get("category");
  const source = req.nextUrl.searchParams.get("source");

  try {
    // Use a UNION query to merge both tables, filter in JS below
    const rows = (await sql`
      SELECT * FROM (
        SELECT
          id::text,
          'telegram' AS source,
          COALESCE(channel_username, 'BRICSNews') AS source_name,
          NULL AS title,
          text_plain AS text,
          NULL AS url,
          posted_at::text AS published_at,
          ai_summary AS summary,
          direction,
          impact_level,
          price_impact,
          confidence,
          affected_benchmarks,
          category
        FROM telegram_channel_posts

        UNION ALL

        SELECT
          id::text,
          source,
          source_name,
          title,
          COALESCE(body, title) AS text,
          url,
          published_at::text,
          ai_summary AS summary,
          direction,
          impact_level,
          price_impact,
          confidence,
          affected_benchmarks,
          category
        FROM news_articles
      ) sub
      WHERE 1=1
      ORDER BY sub.published_at DESC
      LIMIT ${limit}
    `) as Record<string, unknown>[];

    // Apply filters in JS since parameterized UNION is tricky with neon http
    let filtered = rows;
    if (category) {
      filtered = filtered.filter((r) => r.category === category);
    }
    if (source) {
      filtered = filtered.filter((r) => r.source === source);
    }

    const posts: UnifiedPost[] = filtered.slice(0, limit).map((r) => ({
      id: String(r.id),
      source: String(r.source),
      sourceName: String(r.source_name),
      title: r.title ? String(r.title) : null,
      text: String(r.text ?? ""),
      url: r.url ? String(r.url) : null,
      publishedAt: String(r.published_at),
      summary: r.summary ? String(r.summary) : null,
      direction: r.direction ? String(r.direction) : null,
      impactLevel: r.impact_level ? String(r.impact_level) : null,
      priceImpact: r.price_impact ? String(r.price_impact) : null,
      confidence: r.confidence ? String(r.confidence) : null,
      affectedBenchmarks: r.affected_benchmarks ? String(r.affected_benchmarks) : null,
      category: r.category ? String(r.category) : null,
    }));

    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
