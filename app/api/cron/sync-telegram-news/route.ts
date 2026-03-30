import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { syncTelegramNewsFromPublicFeedForce } from "@/lib/sync-telegram-news-public";

export const dynamic = "force-dynamic";

function verifyCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Refreshes news from the public t.me/s/… channel page (optional cron).
 * Same as a normal sync but ignores the min-interval throttle.
 */
export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Server missing DATABASE_URL." },
      { status: 500 }
    );
  }

  try {
    const { upserted } = await syncTelegramNewsFromPublicFeedForce(sql);
    return NextResponse.json({ ok: true, upserted });
  } catch (e) {
    console.error("[cron/sync-telegram-news]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
