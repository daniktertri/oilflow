/** Hyperliquid HIP-3 oil / energy perps (public info API). */

/**
 * The app shows **WTIOIL-USDC** (WTI vs USDC, as on the Hyperliquid UI).
 * The Info API does not accept `WTIOIL-USDC` as `coin`; WTI is `xyz:CL`
 * on the Trade.xyz HIP-3 dex.
 */
export const WTIOIL_USDC = {
  /** Shown in the product UI */
  displayPair: "WTIOIL-USDC",
  /** `candleSnapshot` / `metaAndAssetCtxs` coin name */
  coin: "xyz:CL",
  dex: "xyz",
} as const;

export const HL_CHART_INTERVALS = [
  "15m",
  "1h",
  "4h",
  "1d",
  "1w",
] as const;

export type HlChartInterval = (typeof HL_CHART_INTERVALS)[number];

export type HlCandle = {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
};

export function candlesToChartPoints(
  rows: HlCandle[]
): { t: number; price: number }[] {
  return rows.map((row) => ({
    t: row.t,
    price: Number(row.c),
  }));
}

export type OhlcRow = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

export function candlesToOhlc(rows: HlCandle[]): OhlcRow[] {
  return rows.map((row) => ({
    t: row.t,
    o: Number(row.o),
    h: Number(row.h),
    l: Number(row.l),
    c: Number(row.c),
  }));
}
