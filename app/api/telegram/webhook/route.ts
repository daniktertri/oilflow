import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { upsertTelegramChannelPost } from "@/lib/db/telegram-news";
import {
  finalizeNewsPlainText,
  messagePlainText,
} from "@/lib/telegram-news-text";

export const dynamic = "force-dynamic";

type TgChat = {
  id: number;
  type?: string;
  username?: string;
};

type TgMessage = {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  chat: TgChat;
};

type TelegramUpdate = {
  update_id: number;
  channel_post?: TgMessage;
  edited_channel_post?: TgMessage;
};

function getNewsChannelUsername(): string {
  const u = process.env.TELEGRAM_NEWS_CHANNEL_USERNAME?.trim();
  return (u || "BRICSNews").replace(/^@/, "");
}

function getAllowedChannelChatId(): string | null {
  const raw = process.env.TELEGRAM_NEWS_CHANNEL_CHAT_ID?.trim();
  return raw ? raw : null;
}

function isTargetChannel(chat: TgChat): boolean {
  const wantUser = getNewsChannelUsername().toLowerCase();
  if (chat.username && chat.username.toLowerCase() === wantUser) {
    return true;
  }
  const allowedId = getAllowedChannelChatId();
  if (allowedId && String(chat.id) === allowedId) {
    return true;
  }
  return false;
}

function verifyWebhookSecret(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-telegram-bot-api-secret-token");
  return header === secret;
}

export async function POST(req: Request) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = update.channel_post ?? update.edited_channel_post;
  if (!msg) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!isTargetChannel(msg.chat)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const rawText = messagePlainText(msg);
  if (!rawText) {
    return NextResponse.json({ ok: true, skipped: "no_text" });
  }

  const mentionName = getNewsChannelUsername();
  const textPlain = finalizeNewsPlainText(rawText, mentionName);
  if (!textPlain.trim()) {
    return NextResponse.json({ ok: true, skipped: "empty_after_strip" });
  }

  const sql = getDb();
  if (!sql) {
    return NextResponse.json(
      { error: "Missing DATABASE_URL" },
      { status: 500 }
    );
  }

  const postedAt = new Date(msg.date * 1000);

  try {
    await upsertTelegramChannelPost(sql, {
      channelChatId: String(msg.chat.id),
      channelUsername: msg.chat.username ?? null,
      messageId: msg.message_id,
      textPlain,
      postedAt,
    });
  } catch (e) {
    console.error("[telegram/webhook] db:", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST for Telegram webhook" },
    { status: 405 }
  );
}
