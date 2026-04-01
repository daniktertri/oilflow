import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { upsertTelegramChannelPost } from "@/lib/db/telegram-news";
import { finalizeNewsPlainText } from "@/lib/telegram-news-text";
import {
  fetchTelegramPublicChannelPage,
  parseTelegramPublicChannelHtml,
} from "@/lib/telegram-public-feed";
import { summarizeNewsArticle } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  if (!sql) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const channels = (await sql`
    SELECT username, display_name FROM news_channels WHERE active = true
  `) as { username: string; display_name: string }[];

  if (channels.length === 0) {
    const fallback = process.env.TELEGRAM_NEWS_CHANNEL_USERNAME?.trim() || "BRICSNews";
    channels.push({ username: fallback, display_name: fallback });
  }

  const results: Record<string, number | string> = {};

  for (const ch of channels) {
    try {
      const html = await fetchTelegramPublicChannelPage(ch.username);
      const slugLower = ch.username.toLowerCase();
      const chatId = `public:${slugLower}`;
      const parsed = parseTelegramPublicChannelHtml(html, slugLower);

      let upserted = 0;
      for (const msg of parsed) {
        const textPlain = finalizeNewsPlainText(msg.textPlain, ch.username);
        if (!textPlain.trim()) continue;

        await upsertTelegramChannelPost(sql, {
          channelChatId: chatId,
          channelUsername: ch.username,
          messageId: msg.messageId,
          textPlain,
          postedAt: msg.postedAt,
        });

        // AI summarize if available
        try {
          const analysis = await summarizeNewsArticle(textPlain);
          if (analysis) {
            await sql`
              UPDATE telegram_channel_posts
              SET ai_summary = ${analysis.summary},
                  sentiment_score = ${analysis.sentiment === "bullish" ? 0.8 : analysis.sentiment === "bearish" ? 0.2 : 0.5},
                  category = ${analysis.category}
              WHERE channel_chat_id = ${chatId} AND message_id = ${msg.messageId}
            `;
          }
        } catch {}

        upserted++;
      }
      results[ch.username] = upserted;
    } catch (e) {
      results[`${ch.username}_error`] = e instanceof Error ? e.message : "Failed";
    }
  }

  return NextResponse.json({ ok: true, synced: results });
}
