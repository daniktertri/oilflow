import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type DbUser = {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Insert or update a Telegram user row (first login = insert, later = update profile).
 */
export async function upsertTelegramUser(
  sql: Sql,
  input: {
    telegramId: number;
    username?: string;
    firstName: string;
    lastName?: string;
    photoUrl?: string;
  }
): Promise<DbUser> {
  const rows = (await sql`
    INSERT INTO users (
      telegram_id,
      username,
      first_name,
      last_name,
      photo_url
    )
    VALUES (
      ${input.telegramId},
      ${input.username ?? null},
      ${input.firstName},
      ${input.lastName ?? null},
      ${input.photoUrl ?? null}
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      photo_url = EXCLUDED.photo_url,
      updated_at = now()
    RETURNING
      id,
      telegram_id::text AS telegram_id,
      username,
      first_name,
      last_name,
      photo_url,
      created_at::text AS created_at,
      updated_at::text AS updated_at
  `) as DbUser[];

  const row = rows[0];
  if (!row) {
    throw new Error("upsertTelegramUser returned no row");
  }
  return row;
}
