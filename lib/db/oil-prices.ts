import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type OilPriceRow = {
  benchmark: string;
  price_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  source: string;
};

export async function upsertOilPrice(
  sql: Sql,
  row: {
    benchmark: string;
    priceDate: string;
    close: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    source?: string;
  }
): Promise<void> {
  const src = row.source ?? "eia";
  await sql`
    INSERT INTO oil_prices (benchmark, price_date, open, high, low, close, volume, source)
    VALUES (
      ${row.benchmark},
      ${row.priceDate},
      ${row.open ?? null},
      ${row.high ?? null},
      ${row.low ?? null},
      ${row.close},
      ${row.volume ?? null},
      ${src}
    )
    ON CONFLICT (benchmark, price_date, source) DO UPDATE SET
      close = EXCLUDED.close,
      open = COALESCE(EXCLUDED.open, oil_prices.open),
      high = COALESCE(EXCLUDED.high, oil_prices.high),
      low = COALESCE(EXCLUDED.low, oil_prices.low),
      volume = COALESCE(EXCLUDED.volume, oil_prices.volume)
  `;
}

export async function getLatestPrices(sql: Sql): Promise<
  { benchmark: string; close: number; price_date: string; prev_close: number | null }[]
> {
  const rows = await sql`
    WITH ranked AS (
      SELECT
        benchmark,
        close,
        price_date,
        LAG(close) OVER (PARTITION BY benchmark ORDER BY price_date) AS prev_close,
        ROW_NUMBER() OVER (PARTITION BY benchmark ORDER BY price_date DESC) AS rn
      FROM oil_prices
    )
    SELECT benchmark, close, price_date::text, prev_close
    FROM ranked
    WHERE rn = 1
    ORDER BY benchmark
  `;
  return rows as { benchmark: string; close: number; price_date: string; prev_close: number | null }[];
}

export async function getPriceHistory(
  sql: Sql,
  benchmark: string,
  days: number = 365
): Promise<OilPriceRow[]> {
  const rows = await sql`
    SELECT benchmark, price_date::text, open, high, low, close, volume, source
    FROM oil_prices
    WHERE benchmark = ${benchmark}
    ORDER BY price_date DESC
    LIMIT ${days}
  `;
  return (rows as OilPriceRow[]).reverse();
}

export async function getSpreadHistory(
  sql: Sql,
  bench1: string,
  bench2: string,
  days: number = 180
): Promise<{ date: string; spread: number }[]> {
  const rows = await sql`
    SELECT
      a.price_date::text AS date,
      (a.close - b.close)::numeric AS spread
    FROM oil_prices a
    JOIN oil_prices b
      ON a.price_date = b.price_date
      AND b.benchmark = ${bench2}
    WHERE a.benchmark = ${bench1}
    ORDER BY a.price_date DESC
    LIMIT ${days}
  `;
  return (rows as { date: string; spread: number }[]).reverse();
}

export async function getInventoryHistory(
  sql: Sql,
  product: string = "EPC0",
  weeks: number = 52
): Promise<{ date: string; value: number; change: number | null }[]> {
  const rows = await sql`
    SELECT
      report_date::text AS date,
      value_mbbls AS value,
      change_mbbls AS change
    FROM eia_inventories
    WHERE product = ${product}
    ORDER BY report_date DESC
    LIMIT ${weeks}
  `;
  return (rows as { date: string; value: number; change: number | null }[]).reverse();
}

export async function upsertInventory(
  sql: Sql,
  row: { reportDate: string; product: string; region: string; value: number; change?: number }
): Promise<void> {
  await sql`
    INSERT INTO eia_inventories (report_date, product, region, value_mbbls, change_mbbls)
    VALUES (${row.reportDate}, ${row.product}, ${row.region}, ${row.value}, ${row.change ?? null})
    ON CONFLICT (report_date, product, region) DO UPDATE SET
      value_mbbls = EXCLUDED.value_mbbls,
      change_mbbls = COALESCE(EXCLUDED.change_mbbls, eia_inventories.change_mbbls)
  `;
}
