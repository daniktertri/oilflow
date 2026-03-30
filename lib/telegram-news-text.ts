/**
 * Normalize channel post text: plain text only, drop trailing @ChannelName line.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Final plain text for storage: strip up to two trailing footer lines when they are
 * empty, the channel @mention, or stray HTML fragments (e.g. `<div class="` from bad cuts).
 */
export function finalizeNewsPlainText(
  text: string,
  channelUsernameWithoutAt: string
): string {
  const name = channelUsernameWithoutAt.replace(/^@/, "").trim();
  if (!name) return text.trim();
  const mentionRe = new RegExp(`^@?${escapeRegex(name)}$`, "i");
  const lines = text.split(/\r?\n/);
  const isNoiseLine = (s: string) => {
    const t = s.trim();
    if (t === "") return true;
    if (mentionRe.test(t)) return true;
    if (t.startsWith("<")) return true;
    return false;
  };
  let removed = 0;
  while (lines.length > 0 && removed < 2 && isNoiseLine(lines[lines.length - 1])) {
    lines.pop();
    removed += 1;
  }
  return lines.join("\n").trimEnd();
}

/**
 * If the last non-empty line is only the channel mention (e.g. @BRICSNews), remove it.
 */
export function stripTrailingChannelMention(
  text: string,
  channelUsernameWithoutAt: string
): string {
  const name = channelUsernameWithoutAt.replace(/^@/, "").trim();
  if (!name) return text.trim();
  const lines = text.split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  if (lines.length === 0) return "";
  const last = lines[lines.length - 1].trim();
  const re = new RegExp(`^@?${escapeRegex(name)}$`, "i");
  if (re.test(last)) {
    lines.pop();
    return lines.join("\n").trimEnd();
  }
  return text.trim();
}

/**
 * Prefer body text; for media posts use caption. No HTML — Telegram sends plain strings.
 */
export function messagePlainText(message: {
  text?: string;
  caption?: string;
}): string | null {
  const raw = message.text ?? message.caption;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw;
}
