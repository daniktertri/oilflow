import { sameOriginApi } from "@/lib/client-api-url";
import { WTIOIL_USDC, type HlCandle } from "@/lib/hyperliquid";

/** Latest 1m candle close as mark (for lock session). */
export async function fetchMarkFrom1m(): Promise<number> {
  const q = new URLSearchParams({
    coin: WTIOIL_USDC.coin,
    interval: "1m",
  });
  const res = await fetch(sameOriginApi("/api/hyperliquid/candles", q), {
    cache: "no-store",
  });
  const data = (await res.json()) as { candles?: HlCandle[]; error?: string };
  if (!res.ok || !data.candles?.length) {
    throw new Error(data.error ?? "Price unavailable");
  }
  const last = data.candles[data.candles.length - 1];
  return Number(last.c);
}
