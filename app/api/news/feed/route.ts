import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "30"), 100);
  const category = req.nextUrl.searchParams.get("category");

  try {
    type PostRow = {
      id: string;
      channel_username: string | null;
      text_plain: string;
      posted_at: string;
      ai_summary: string | null;
      sentiment_score: number | null;
      category: string | null;
    };

    let rows: PostRow[];
    if (category) {
      rows = (await sql`
        SELECT id, channel_username, text_plain, posted_at::text, ai_summary, sentiment_score, category
        FROM telegram_channel_posts
        WHERE category = ${category}
        ORDER BY posted_at DESC
        LIMIT ${limit}
      `) as PostRow[];
    } else {
      rows = (await sql`
        SELECT id, channel_username, text_plain, posted_at::text, ai_summary, sentiment_score, category
        FROM telegram_channel_posts
        ORDER BY posted_at DESC
        LIMIT ${limit}
      `) as PostRow[];
    }

    return NextResponse.json({
      posts: rows.map((r) => ({
        id: r.id,
        channel: r.channel_username,
        text: r.text_plain,
        postedAt: r.posted_at,
        summary: r.ai_summary,
        sentiment: r.sentiment_score,
        category: r.category,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
