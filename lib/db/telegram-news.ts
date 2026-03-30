import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type TelegramChannelPostRow = {
  id: string;
  text_plain: string;
  posted_at: string;
};

export async function upsertTelegramChannelPost(
  sql: Sql,
  input: {
    channelChatId: string;
    channelUsername: string | null;
    messageId: number;
    textPlain: string;
    postedAt: Date;
  }
) {
  await sql`
    INSERT INTO telegram_channel_posts (
      channel_chat_id,
      channel_username,
      message_id,
      text_plain,
      posted_at
    )
    VALUES (
      ${input.channelChatId},
      ${input.channelUsername},
      ${input.messageId},
      ${input.textPlain},
      ${input.postedAt.toISOString()}
    )
    ON CONFLICT (channel_chat_id, message_id) DO UPDATE SET
      text_plain = EXCLUDED.text_plain,
      channel_username = COALESCE(
        EXCLUDED.channel_username,
        telegram_channel_posts.channel_username
      )
  `;
}

export async function listTelegramChannelPosts(
  sql: Sql,
  limit: number
): Promise<TelegramChannelPostRow[]> {
  const rows = await sql`
    SELECT id, text_plain, posted_at
    FROM telegram_channel_posts
    ORDER BY posted_at DESC
    LIMIT ${limit}
  `;
  return rows as TelegramChannelPostRow[];
}
