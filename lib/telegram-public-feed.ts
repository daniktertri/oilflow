/**
 * Ingest public Telegram channel HTML from https://t.me/s/<username>
 * (no bot admin required). Structure is undocumented and may change.
 */

export type ParsedPublicMessage = {
  messageId: number;
  channelSlug: string;
  textPlain: string;
  postedAt: Date;
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d: string) =>
      String.fromCharCode(parseInt(d, 10))
    );
}

export function htmlToPlainText(html: string): string {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  t = t.replace(/<style[\s\S]*?<\/style>/gi, "");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/p>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = decodeHtmlEntities(t);
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** Drop a trailing fragment like `<div class="` when the slice cut inside a tag. */
function removeTrailingIncompleteTag(html: string): string {
  const lastLt = html.lastIndexOf("<");
  if (lastLt === -1) return html;
  const tail = html.slice(lastLt);
  if (tail.includes(">")) return html;
  return html.slice(0, lastLt).trimEnd();
}

/** Extract inner HTML of the first message text block (before reactions/footer). */
function extractMessageTextHtml(chunk: string): string | null {
  const marker = "tgme_widget_message_text";
  const idx = chunk.indexOf(marker);
  if (idx === -1) return null;
  const fromMarker = chunk.slice(idx);
  const gt = fromMarker.indexOf(">");
  if (gt === -1) return null;
  const innerStart = gt + 1;
  const rest = fromMarker.slice(innerStart);
  const endRe = rest.indexOf("tgme_widget_message_reactions");
  const endFo = rest.indexOf("tgme_widget_message_footer");
  const ends = [endRe, endFo].filter((x) => x >= 0);
  if (ends.length === 0) return null;
  const end = Math.min(...ends);
  return removeTrailingIncompleteTag(rest.slice(0, end).trim());
}

function parseDataPost(chunk: string): { slug: string; messageId: number } | null {
  const m = chunk.match(/data-post="([^"]+)"/);
  if (!m) return null;
  const raw = m[1];
  const slash = raw.lastIndexOf("/");
  if (slash < 0) return null;
  const slug = raw.slice(0, slash).toLowerCase();
  const idPart = raw.slice(slash + 1);
  const idMatch = idPart.match(/^(\d+)/);
  if (!idMatch) return null;
  const messageId = parseInt(idMatch[1], 10);
  if (!Number.isFinite(messageId)) return null;
  return { slug, messageId };
}

function parseMessageTime(chunk: string): Date | null {
  const m = chunk.match(/<time[^>]*datetime="([^"]+)"/);
  if (!m) return null;
  const d = new Date(m[1]);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Split t.me/s HTML into per-message chunks (widget wraps).
 */
function splitMessageWraps(html: string): string[] {
  const parts = html.split(
    /<div class="tgme_widget_message_wrap js-widget_message_wrap">/i
  );
  return parts.slice(1);
}

export function parseTelegramPublicChannelHtml(
  html: string,
  channelSlugLower: string
): ParsedPublicMessage[] {
  const wantSlug = channelSlugLower.replace(/^@/, "").toLowerCase();
  const out: ParsedPublicMessage[] = [];
  for (const chunk of splitMessageWraps(html)) {
    const post = parseDataPost(chunk);
    if (!post || post.slug !== wantSlug) continue;
    const textHtml = extractMessageTextHtml(chunk);
    if (!textHtml) continue;
    const textPlain = htmlToPlainText(textHtml);
    if (!textPlain) continue;
    const postedAt = parseMessageTime(chunk) ?? new Date();
    out.push({
      messageId: post.messageId,
      channelSlug: post.slug,
      textPlain,
      postedAt,
    });
  }
  return out;
}

export async function fetchTelegramPublicChannelPage(
  username: string,
  beforeMessageId?: string
): Promise<string> {
  const u = username.replace(/^@/, "").trim();
  const path = beforeMessageId
    ? `https://t.me/s/${encodeURIComponent(u)}?before=${encodeURIComponent(beforeMessageId)}`
    : `https://t.me/s/${encodeURIComponent(u)}`;
  const res = await fetch(path, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Telegram public page HTTP ${res.status}`);
  }
  return res.text();
}

/** `before` cursor from `<link rel="prev" … href="…before=…">` (not canonical). */
export function parsePrevBeforeCursor(html: string): string | null {
  const blocks = html.match(/<link[^>]*>/gi) ?? [];
  for (const block of blocks) {
    if (!/rel\s*=\s*["']prev["']/i.test(block)) continue;
    const hm = block.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hm) continue;
    const before = hm[1].match(/[?&]before=(\d+)/);
    if (before) return before[1];
  }
  return null;
}
