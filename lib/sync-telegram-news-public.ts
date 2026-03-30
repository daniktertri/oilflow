import type { neon } from "@neondatabase/serverless";
import { upsertTelegramChannelPost } from "@/lib/db/telegram-news";
import { stripTrailingChannelMention } from "@/lib/telegram-news-text";
import {
  fetchTelegramPublicChannelPage,
  parsePrevBeforeCursor,
  parseTelegramPublicChannelHtml,
} from "@/lib/telegram-public-feed";

type Sql = ReturnType<typeof neon>;

const SYNC_STATE_KEY = "telegram_news_public_last_sync";
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

function channelUsername(): string {
  return (
    process.env.TELEGRAM_NEWS_CHANNEL_USERNAME?.trim().replace(/^@/, "") ||
    "BRICSNews"
  );
}

function syncIntervalMs(): number {
  const raw = process.env.TELEGRAM_NEWS_SYNC_INTERVAL_SEC?.trim();
  if (!raw) return DEFAULT_INTERVAL_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 30) return DEFAULT_INTERVAL_MS;
  return Math.floor(n * 1000);
}

function publicChannelChatId(slug: string): string {
  return `public:${slug.toLowerCase()}`;
}

function maxPages(): number {
  const raw = process.env.TELEGRAM_NEWS_PUBLIC_PAGES?.trim();
  if (!raw) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(5, Math.floor(n));
}

async function getLastSyncIso(sql: Sql): Promise<string | null> {
  const rows = (await sql`
    SELECT value FROM custody_state WHERE key = ${SYNC_STATE_KEY}
  `) as { value: string }[];
  const row = rows[0];
  return row?.value ?? null;
}

async function setLastSyncIso(sql: Sql, iso: string): Promise<void> {
  await sql`
    INSERT INTO custody_state (key, value, updated_at)
    VALUES (${SYNC_STATE_KEY}, ${iso}, now())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = now()
  `;
}

/**
 * Fetches the public t.me/s/… page(s), parses posts, upserts into DB.
 * Deduplication: UNIQUE(public:slug, message_id).
 */
export async function syncTelegramNewsFromPublicFeedIfStale(
  sql: Sql
): Promise<{ ran: boolean; upserted: number }> {
  const last = await getLastSyncIso(sql);
  const now = Date.now();
  if (last) {
    const t = new Date(last).getTime();
    if (Number.isFinite(t) && now - t < syncIntervalMs()) {
      return { ran: false, upserted: 0 };
    }
  }

  const user = channelUsername();
  const mentionName = user;
  let upserted = 0;
  let html = await fetchTelegramPublicChannelPage(user);
  const pages = maxPages();
  let cursor: string | null = null;

  const slugLower = user.toLowerCase();
  for (let page = 0; page < pages; page++) {
    const parsed = parseTelegramPublicChannelHtml(html, slugLower);
    for (const msg of parsed) {
      const textPlain = stripTrailingChannelMention(msg.textPlain, mentionName);
      if (!textPlain.trim()) continue;
      await upsertTelegramChannelPost(sql, {
        channelChatId: publicChannelChatId(msg.channelSlug),
        channelUsername: user,
        messageId: msg.messageId,
        textPlain,
        postedAt: msg.postedAt,
      });
      upserted += 1;
    }
    if (page + 1 >= pages) break;
    cursor = parsePrevBeforeCursor(html);
    if (!cursor) break;
    html = await fetchTelegramPublicChannelPage(user, cursor);
  }

  await setLastSyncIso(sql, new Date().toISOString());
  return { ran: true, upserted };
}

/** Cron / manual: always sync (ignores throttle). */
export async function syncTelegramNewsFromPublicFeedForce(
  sql: Sql
): Promise<{ upserted: number }> {
  await sql`DELETE FROM custody_state WHERE key = ${SYNC_STATE_KEY}`;
  const r = await syncTelegramNewsFromPublicFeedIfStale(sql);
  return { upserted: r.upserted };
}
