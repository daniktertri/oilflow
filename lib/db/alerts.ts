import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type AlertRow = {
  id: string;
  benchmark: string;
  condition: string;
  threshold: number;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
};

export async function getUserAlerts(sql: Sql, userId: string): Promise<AlertRow[]> {
  const rows = await sql`
    SELECT id, benchmark, condition, threshold, active, last_triggered_at::text, created_at::text
    FROM user_alerts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as AlertRow[];
}

export async function createAlert(
  sql: Sql,
  userId: string,
  alert: { benchmark: string; condition: string; threshold: number }
): Promise<string> {
  const rows = (await sql`
    INSERT INTO user_alerts (user_id, benchmark, condition, threshold)
    VALUES (${userId}, ${alert.benchmark}, ${alert.condition}, ${alert.threshold})
    RETURNING id
  `) as { id: string }[];
  return rows[0].id;
}

export async function deleteAlert(sql: Sql, userId: string, alertId: string): Promise<void> {
  await sql`DELETE FROM user_alerts WHERE id = ${alertId} AND user_id = ${userId}`;
}

export async function toggleAlert(sql: Sql, userId: string, alertId: string, active: boolean): Promise<void> {
  await sql`
    UPDATE user_alerts SET active = ${active}
    WHERE id = ${alertId} AND user_id = ${userId}
  `;
}

export async function getTriggeredAlerts(
  sql: Sql
): Promise<{ id: string; user_id: string; benchmark: string; condition: string; threshold: number; telegram_id: number }[]> {
  const rows = await sql`
    SELECT a.id, a.user_id, a.benchmark, a.condition, a.threshold, u.telegram_id
    FROM user_alerts a
    JOIN users u ON u.id = a.user_id
    JOIN LATERAL (
      SELECT close FROM oil_prices WHERE benchmark = a.benchmark ORDER BY price_date DESC LIMIT 1
    ) p ON true
    WHERE a.active = true
      AND (
        (a.condition = 'above' AND p.close >= a.threshold)
        OR (a.condition = 'below' AND p.close <= a.threshold)
      )
      AND (a.last_triggered_at IS NULL OR a.last_triggered_at < now() - interval '1 hour')
  `;
  return rows as { id: string; user_id: string; benchmark: string; condition: string; threshold: number; telegram_id: number }[];
}

export async function markAlertTriggered(sql: Sql, alertId: string): Promise<void> {
  await sql`UPDATE user_alerts SET last_triggered_at = now() WHERE id = ${alertId}`;
}
