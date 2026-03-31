import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type PlatformStats = {
  userCount: number;
  /** Sum of daily realized PnL / yield credited across all users (all time). */
  totalEarningsUsd: number;
  /** Current principal in active locks (TVL). */
  totalLockedUsd: number;
  /** Sum of daily_returns for the current UTC calendar month. */
  mtdEarningsUsd: number;
  /**
   * Rough indicator: MTD earnings / current TVL × 100.
   * Undefined when TVL is zero (nothing to scale against).
   */
  mtdRoiPct: number | null;
};

/**
 * Aggregate platform metrics for marketing / transparency (public read).
 */
export async function getPlatformStats(sql: Sql): Promise<PlatformStats> {
  const rows = (await sql`
    SELECT
      (SELECT COUNT(*)::bigint FROM users) AS user_count,
      (SELECT COALESCE(SUM(pnl_usd), 0)::float8 FROM daily_returns) AS total_earnings_usd,
      (
        SELECT COALESCE(SUM(pnl_usd), 0)::float8
        FROM daily_returns
        WHERE
          day >= (date_trunc('month', (now() AT TIME ZONE 'UTC')::date))::date
          AND day < (
            (date_trunc('month', (now() AT TIME ZONE 'UTC')::date) + interval '1 month')
          )::date
      ) AS mtd_earnings_usd,
      (
        SELECT COALESCE(SUM(principal_usd), 0)::float8
        FROM liquidity_locks
        WHERE status = 'active' AND ends_at > now()
      ) AS total_locked_usd
  `) as {
    user_count: string;
    total_earnings_usd: number;
    mtd_earnings_usd: number;
    total_locked_usd: number;
  }[];

  const row = rows[0];
  if (!row) {
    return {
      userCount: 0,
      totalEarningsUsd: 0,
      totalLockedUsd: 0,
      mtdEarningsUsd: 0,
      mtdRoiPct: null,
    };
  }

  const userCount = Number(row.user_count);
  const totalEarningsUsd = Number(row.total_earnings_usd);
  const mtdEarningsUsd = Number(row.mtd_earnings_usd);
  const totalLockedUsd = Number(row.total_locked_usd);
  const mtdRoiPct =
    totalLockedUsd > 0 ? (mtdEarningsUsd / totalLockedUsd) * 100 : null;

  return {
    userCount,
    totalEarningsUsd,
    totalLockedUsd,
    mtdEarningsUsd,
    mtdRoiPct,
  };
}
