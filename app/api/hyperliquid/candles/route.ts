import { NextRequest, NextResponse } from "next/server";
import type { HlCandle } from "@/lib/hyperliquid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HL_INFO = new URL("https://api.hyperliquid.xyz/info");

const INTERVAL_MS: Record<string, number> = {
    "1m": 60_000,
    "3m": 3 * 60_000,
    "5m": 5 * 60_000,
    "15m": 15 * 60_000,
    "30m": 30 * 60_000,
    "1h": 60 * 60_000,
    "2h": 2 * 60 * 60_000,
    "4h": 4 * 60 * 60_000,
    "8h": 8 * 60 * 60_000,
    "12h": 12 * 60 * 60_000,
    "1d": 24 * 60 * 60_000,
    "3d": 3 * 24 * 60 * 60_000,
    "1w": 7 * 24 * 60 * 60_000,
    "1M": 30 * 24 * 60 * 60_000,
};

function intervalMs(iv: string): number {
  return INTERVAL_MS[iv] ?? 60 * 60_000;
}

function normalizeInterval(raw: string): string {
  const t = raw.trim();
  return t in INTERVAL_MS ? t : "1h";
}

export async function GET(req: NextRequest) {
  try {
    const coin = req.nextUrl.searchParams.get("coin")?.trim() || "xyz:CL"; // WTIOIL-USDC → WTI perp
    const intervalRaw = req.nextUrl.searchParams.get("interval")?.trim() || "1h";
    const interval = normalizeInterval(intervalRaw);

    const endTime = Date.now();
    const step = intervalMs(interval);
    const startTime = endTime - step * 500;

    const body = JSON.stringify({
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime },
    });

    let res!: Response;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
      res = await fetch(HL_INFO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "OilFlow/1.0",
        },
        body,
        cache: "no-store",
        redirect: "manual",
      });
      if (res.status !== 502 && res.status !== 503) break;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") ?? "";
      return NextResponse.json(
        {
          error: `Unexpected redirect ${res.status}`,
          detail: loc.slice(0, 300),
          candles: [],
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Hyperliquid ${res.status}`, detail: text.slice(0, 300), candles: [] },
        { status: res.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Unexpected candles response", candles: [] },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { candles: data as HlCandle[] },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { error: message, candles: [] },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
