import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type MarketBriefRow = {
  id: string;
  brief_date: string;
  summary: string;
  outlook: string | null;
  key_drivers: string | null;
  sentiment: string | null;
  direction: string | null;
  conviction: string | null;
  risks: string | null;
  created_at: string;
};

export async function upsertMarketBrief(
  sql: Sql,
  brief: {
    date: string;
    summary: string;
    outlook?: string;
    keyDrivers?: string;
    sentiment?: string;
    direction?: string;
    conviction?: string;
    risks?: string;
  }
): Promise<void> {
  await sql`
    INSERT INTO ai_market_briefs (brief_date, summary, outlook, key_drivers, sentiment, direction, conviction, risks)
    VALUES (
      ${brief.date},
      ${brief.summary},
      ${brief.outlook ?? null},
      ${brief.keyDrivers ?? null},
      ${brief.sentiment ?? null},
      ${brief.direction ?? null},
      ${brief.conviction ?? null},
      ${brief.risks ?? null}
    )
    ON CONFLICT (brief_date) DO UPDATE SET
      summary = EXCLUDED.summary,
      outlook = COALESCE(EXCLUDED.outlook, ai_market_briefs.outlook),
      key_drivers = COALESCE(EXCLUDED.key_drivers, ai_market_briefs.key_drivers),
      sentiment = COALESCE(EXCLUDED.sentiment, ai_market_briefs.sentiment),
      direction = COALESCE(EXCLUDED.direction, ai_market_briefs.direction),
      conviction = COALESCE(EXCLUDED.conviction, ai_market_briefs.conviction),
      risks = COALESCE(EXCLUDED.risks, ai_market_briefs.risks)
  `;
}

export async function getLatestBrief(sql: Sql): Promise<MarketBriefRow | null> {
  const rows = (await sql`
    SELECT id, brief_date::text, summary, outlook, key_drivers, sentiment, direction, conviction, risks, created_at::text
    FROM ai_market_briefs
    ORDER BY brief_date DESC
    LIMIT 1
  `) as MarketBriefRow[];
  return rows[0] ?? null;
}
