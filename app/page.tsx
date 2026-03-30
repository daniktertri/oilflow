"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  HL_CHART_INTERVALS,
  WTIOIL_USDC,
  candlesToChartPoints,
  candlesToOhlc,
  type HlCandle,
  type HlChartInterval,
} from "@/lib/hyperliquid";
import { useWallet } from "@/components/wallet-provider";
import { sameOriginApi } from "@/lib/client-api-url";
import { synthesizeGlobalBotTrades } from "@/lib/global-bot-trades";
import { CandleChart } from "@/components/candle-chart";
import { PriceChart, type PriceChartRow } from "@/components/price-chart";

type PricePoint = { t: number; price: number };

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function nowClock() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type AssetCtx = {
  dayNtlVlm?: string;
  oraclePx?: string;
  markPx?: string;
  midPx?: string;
};

type ChartView = "area" | "candles";

export default function OilTradePage() {
  const { balance, hydrated, activeLock, remainingMs } = useWallet();
  const [chartInterval, setChartInterval] = useState<HlChartInterval>("1h");
  const [chartView, setChartView] = useState<ChartView>("area");
  const [rawCandles, setRawCandles] = useState<HlCandle[]>([]);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [assetCtx, setAssetCtx] = useState<AssetCtx | null>(null);

  const [clock, setClock] = useState("--:--:--");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({
          coin: WTIOIL_USDC.coin,
          interval: chartInterval,
        });
        const res = await fetch(sameOriginApi("/api/hyperliquid/candles", q), {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          candles?: HlCandle[];
          error?: string;
          detail?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(
            [data.error, data.detail].filter(Boolean).join(" — ") ||
              "Candles failed"
          );
          setHistory([]);
          setRawCandles([]);
          return;
        }
        const rows = data.candles ?? [];
        const pts = candlesToChartPoints(rows);
        if (pts.length === 0) {
          setError("No candles for this range — try another interval.");
          setHistory([]);
          setRawCandles([]);
          return;
        }
        setRawCandles(rows);
        setHistory(pts);
        setLastPrice(pts[pts.length - 1].price);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
          setHistory([]);
          setRawCandles([]);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chartInterval, refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams({
          coin: WTIOIL_USDC.coin,
          dex: WTIOIL_USDC.dex,
        });
        const res = await fetch(sameOriginApi("/api/hyperliquid/asset", q), {
          cache: "no-store",
        });
        const data = (await res.json()) as AssetCtx & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setAssetCtx(null);
          return;
        }
        setAssetCtx(data);
      } catch {
        if (!cancelled) setAssetCtx(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    setClock(nowClock());
    const id = window.setInterval(() => setClock(nowClock()), 1000);
    return () => clearInterval(id);
  }, []);

  const chartData: PriceChartRow[] = useMemo(() => {
    const spanMs =
      history.length >= 2
        ? history[history.length - 1].t - history[0].t
        : 0;
    const useDate = spanMs > 36 * 60 * 60 * 1000;
    return history.map((p) => ({
      t:
        p.t === 0
          ? "—"
          : useDate
            ? new Date(p.t).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : new Date(p.t).toLocaleTimeString("en-US", {
                hour12: false,
                minute: "2-digit",
                second: "2-digit",
              }),
      price: p.price,
    }));
  }, [history]);

  const candleChartData = useMemo(() => {
    const ohlc = candlesToOhlc(rawCandles);
    if (ohlc.length === 0) return [];
    const spanMs =
      ohlc.length >= 2 ? ohlc[ohlc.length - 1].t - ohlc[0].t : 0;
    const useDate = spanMs > 36 * 60 * 60 * 1000;
    return ohlc.map((row) => ({
      t:
        row.t === 0
          ? "—"
          : useDate
            ? new Date(row.t).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : new Date(row.t).toLocaleTimeString("en-US", {
                hour12: false,
                minute: "2-digit",
                second: "2-digit",
              }),
      o: row.o,
      h: row.h,
      l: row.l,
      c: row.c,
    }));
  }, [rawCandles]);

  const dayVol = assetCtx?.dayNtlVlm ? Number(assetCtx.dayNtlVlm) : null;
  const oraclePx = assetCtx?.oraclePx ? Number(assetCtx.oraclePx) : null;

  const globalBotTrades = useMemo(
    () => synthesizeGlobalBotTrades(history, { dayVolUsd: dayVol }),
    [history, dayVol]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0e12] text-[#c8d0e0]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2430] bg-[#0a0c10] px-3 py-2">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[#ffc107]">
            {WTIOIL_USDC.displayPair}
          </span>
          <span className="text-[#5c6578]">|</span>
          <span className="max-w-[min(40vw,28rem)] truncate text-[#e0e0e0]">
            WTI crude oil · USDC margin
          </span>
          <span className="rounded border border-[#00c853] bg-[#0d1f14] px-2 py-0.5 text-[10px] text-[#00c853]">
            HYPERLIQUID
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
          <Link
            href="/balance"
            className="text-[#5c6578] hover:text-[#00e5ff] hover:underline"
          >
            BAL{" "}
            <span className="text-[#c8d0e0]">
              {hydrated ? formatUsd(balance) : "—"}
            </span>
          </Link>
          {activeLock && (
            <>
              <span className="text-[#5c6578]">
                LOCKED{" "}
                <span className="text-[#00e5ff]">
                  {formatUsd(activeLock.principalUsd)}
                </span>
              </span>
              <span className="text-[#5c6578]">
                SESSION P&amp;L{" "}
                <span
                  className={
                    activeLock.sessionPnlUsd >= 0
                      ? "text-[#00c853]"
                      : "text-[#ff5252]"
                  }
                >
                  {formatUsd(activeLock.sessionPnlUsd)}
                </span>
              </span>
            </>
          )}
          <span className="text-[#5c6578]">UTC {clock}</span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-px bg-[#1e2430] p-px">
        <section className="col-span-12 grid grid-cols-2 gap-px bg-[#1e2430] sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: "LAST (CLOSE)",
              value: lastPrice != null ? formatUsd(lastPrice) : "—",
              color: "text-[#ffc107]",
            },
            {
              label: "ORACLE",
              value: oraclePx != null ? formatUsd(oraclePx) : "—",
              color: "text-[#c8d0e0]",
            },
            {
              label: "24H VOL (NTL)",
              value: dayVol != null ? formatUsd(dayVol) : "—",
              color: "text-[#c8d0e0]",
            },
            {
              label: "INTERVAL",
              value: chartInterval.toUpperCase(),
              color: "text-[#00e5ff]",
            },
            {
              label: "BARS",
              value: String(history.length),
              color: "text-[#c8d0e0]",
            },
            {
              label: "LOCK TIME LEFT",
              value: activeLock ? formatDuration(remainingMs) : "—",
              color: "text-[#00e5ff]",
            },
          ].map((m) => (
            <div key={m.label} className="bg-[#12151c] px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-[#5c6578]">
                {m.label}
              </div>
              <div className={`font-mono text-sm ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </section>

        <main className="col-span-12 flex min-h-[360px] flex-col bg-[#12151c]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2430] px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-[#5c6578]">
              {WTIOIL_USDC.displayPair} · last (USDC)
            </span>
            <span className="font-mono text-[#ffc107]">
              {lastPrice != null ? formatUsd(lastPrice) : "—"}
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-b border-[#1e2430] px-3 py-2">
            <label className="text-[10px] uppercase tracking-wider text-[#5c6578]">
              View
            </label>
            <select
              className="min-w-[6.5rem] border border-[#2a3140] bg-[#0c0e12] px-2 py-1.5 font-mono text-[10px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
              value={chartView}
              onChange={(e) => setChartView(e.target.value as ChartView)}
            >
              <option value="area">Area (last)</option>
              <option value="candles">Candles (OHLC)</option>
            </select>
            <label className="text-[10px] uppercase tracking-wider text-[#5c6578]">
              Interval
            </label>
            <select
              className="min-w-[5rem] border border-[#2a3140] bg-[#0c0e12] px-2 py-1.5 font-mono text-[10px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
              value={chartInterval}
              onChange={(e) =>
                setChartInterval(e.target.value as HlChartInterval)
              }
            >
              {HL_CHART_INTERVALS.map((iv) => (
                <option key={iv} value={iv}>
                  {iv}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setRefresh((n) => n + 1)}
              className="border border-[#2a3140] px-2 py-1.5 text-[10px] font-mono uppercase text-[#c8d0e0] hover:border-[#ffc107]"
            >
              Refresh chart
            </button>
            {error && (
              <span className="text-[10px] text-[#ff5252]">Chart: {error}</span>
            )}
            {loading && (
              <span className="text-[10px] text-[#5c6578]">Loading…</span>
            )}
          </div>
          {error && (
            <div className="border-b border-[#ff5252]/40 bg-[#1f0d0d] px-3 py-2 text-[11px] text-[#ff8a80]">
              Chart data: {error}
            </div>
          )}
          <div className="min-h-0 flex-1 p-2">
            {loading && chartData.length === 0 && !error && (
              <p className="mb-2 text-center font-mono text-[11px] text-[#5c6578]">
                Loading market data…
              </p>
            )}
            {chartView === "area" ? (
              <PriceChart data={chartData} />
            ) : (
              <CandleChart data={candleChartData} />
            )}
          </div>
        </main>

        <section className="col-span-12 bg-[#12151c]">
          <div className="border-t border-b border-[#1e2430] px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-[#5c6578]">
              Global bot activity
            </div>
            <div className="text-[10px] text-[#5c6578]">
              Market-wide executions · {WTIOIL_USDC.displayPair}
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            <div className="grid grid-cols-[1fr_0.8fr_1fr_1fr] gap-x-2 border-b border-[#1e2430] px-3 py-1.5 font-mono text-[10px] text-[#5c6578] sm:grid-cols-[1fr_0.7fr_1fr_1fr]">
              <span>TIME (UTC)</span>
              <span>SIDE</span>
              <span className="text-right">PRICE</span>
              <span className="text-right">NOTIONAL</span>
            </div>
            {error && (
              <p className="px-3 py-4 text-center text-[10px] text-[#5c6578]">
                Feed updates with the chart when data is available.
              </p>
            )}
            {!error && loading && history.length === 0 && (
              <p className="px-3 py-4 text-center text-[10px] text-[#5c6578]">
                Loading…
              </p>
            )}
            {!error &&
              !loading &&
              globalBotTrades.length === 0 &&
              history.length > 0 && (
                <p className="px-3 py-4 text-center text-[10px] text-[#5c6578]">
                  No activity for this range yet.
                </p>
              )}
            {!error &&
              globalBotTrades.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_0.8fr_1fr_1fr] gap-x-2 border-b border-[#1a1f28] px-3 py-1.5 font-mono text-[10px] sm:grid-cols-[1fr_0.7fr_1fr_1fr]"
                >
                  <span className="text-[#5c6578]">
                    {new Date(t.time).toISOString().slice(11, 19)}
                  </span>
                  <span
                    className={
                      t.side === "long" ? "text-[#00c853]" : "text-[#ff5252]"
                    }
                  >
                    {t.side.toUpperCase()}
                  </span>
                  <span className="text-right">{formatUsd(t.price)}</span>
                  <span className="text-right text-[#c8d0e0]">
                    {formatUsd(t.notionalUsd)}
                  </span>
                </div>
              ))}
          </div>
        </section>

        <section className="col-span-12 border-t border-[#1e2430] bg-[#12151c] px-3 py-2 text-[10px] text-[#5c6578]">
          {WTIOIL_USDC.displayPair} uses API coin{" "}
          <code className="text-[#5c6578]">{WTIOIL_USDC.coin}</code>. Chart:
          candle close. Wallet and locks:{" "}
          <Link href="/balance" className="text-[#00e5ff] hover:underline">
            Balance
          </Link>{" "}
          ·{" "}
          <Link href="/lock" className="text-[#00e5ff] hover:underline">
            Lock liquidity
          </Link>
          . Not financial advice.
        </section>
      </div>
    </div>
  );
}
