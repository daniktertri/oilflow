import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listTelegramChannelPosts } from "@/lib/db/telegram-news";
import { syncTelegramNewsFromPublicFeedIfStale } from "@/lib/sync-telegram-news-public";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;

export async function GET(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { posts: [], error: "Server missing DATABASE_URL" },
      { status: 503 }
    );
  }

  let limit = DEFAULT_LIMIT;
  const url = new URL(req.url);
  const n = url.searchParams.get("limit");
  if (n) {
    const parsed = Number(n);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) {
      limit = Math.floor(parsed);
    }
  }

  try {
    await syncTelegramNewsFromPublicFeedIfStale(sql);
    const rows = await listTelegramChannelPosts(sql, limit);
    return NextResponse.json({
      posts: rows.map((r) => ({
        id: r.id,
        text: r.text_plain,
        postedAt: r.posted_at,
      })),
    });
  } catch (e) {
    console.error("[news/related]", e);
    return NextResponse.json(
      { posts: [], error: "Failed to load posts" },
      { status: 500 }
    );
  }
}
