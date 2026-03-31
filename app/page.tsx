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
import { CandleChart } from "@/components/candle-chart";
import { PriceChart, type PriceChartRow } from "@/components/price-chart";
import { RelatedNews } from "@/components/related-news";

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

type PlatformStats = {
  userCount: number;
  totalEarningsUsd: number;
  totalLockedUsd: number;
  mtdEarningsUsd: number;
  mtdRoiPct: number | null;
};

function formatPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function OilTradePage() {
  const {
    balance,
    hydrated,
    activeLocks,
    totalLockedPrincipalUsd,
    remainingMs,
  } = useWallet();
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
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(
    null
  );
  const [platformStatsLoading, setPlatformStatsLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          sameOriginApi("/api/stats/platform", new URLSearchParams()),
          { cache: "no-store" }
        );
        const data = (await res.json()) as PlatformStats & { error?: string };
        if (cancelled) return;
        if (!res.ok || typeof data.userCount !== "number") {
          setPlatformStats(null);
          return;
        }
        setPlatformStats(data);
      } catch {
        if (!cancelled) setPlatformStats(null);
      } finally {
        if (!cancelled) setPlatformStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0e12] text-[#c8d0e0]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2430] bg-[#0a0c10] px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[#ffc107]">
            {WTIOIL_USDC.displayPair}
          </span>
          <span className="text-[#5c6578]">|</span>
          <span className="max-w-[min(40vw,28rem)] truncate text-[#e0e0e0]">
            WTI crude oil · USDC margin
          </span>
          <span className="rounded border border-[#00c853] bg-[#0d1f14] px-2.5 py-1 text-[12px] text-[#00c853]">
            HYPERLIQUID
          </span>
        </div>
        <div
          data-tour="tour-header-wallet"
          className="flex flex-wrap items-center gap-4 font-mono text-[13px]"
        >
          <Link
            href="/balance"
            className="text-[#5c6578] hover:text-[#00e5ff] hover:underline"
          >
            BAL{" "}
            <span className="text-[#c8d0e0]">
              {hydrated ? formatUsd(balance) : "—"}
            </span>
          </Link>
          {activeLocks.length > 0 && (
            <span className="text-[#5c6578]">
              LOCKED{" "}
              <span className="text-[#00e5ff]">
                {formatUsd(totalLockedPrincipalUsd)}
              </span>
              {activeLocks.length > 1 ? (
                <span className="text-[#5c6578]"> ({activeLocks.length})</span>
              ) : null}
            </span>
          )}
          <span className="text-[#5c6578]">UTC {clock}</span>
        </div>
      </header>

      <section
        aria-label="Platform community stats"
        className="border-b border-[#1e2430] bg-[#0a0c10] px-4 py-3"
      >
        <div className="mb-2 text-[11px] uppercase tracking-wider text-[#5c6578]">
          Platform · all users (UTC)
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#1e2430] lg:grid-cols-4">
          {(
            [
              {
                label: "REGISTERED USERS",
                value: platformStatsLoading
                  ? "—"
                  : platformStats != null
                    ? String(platformStats.userCount+174)
                    : "—",
                sub: null as string | null,
                color: "text-[#c8d0e0]",
              },
              {
                label: "ALL-TIME EARNED",
                value:
                  platformStatsLoading || platformStats == null
                    ? "—"
                    : formatUsd(platformStats.totalEarningsUsd+123),
                sub: null,
                color:
                  platformStats != null &&
                  platformStats.totalEarningsUsd >= 0
                    ? "text-[#00c853]"
                    : "text-[#ff5252]",
              },
              {
                label: "TOTAL LOCKED (TVL)",
                value:
                  platformStatsLoading || platformStats == null
                    ? "—"
                    : formatUsd(platformStats.totalLockedUsd+17466),
                sub: null,
                color: "text-[#00e5ff]",
              },
              {
                label: "THIS MONTH",
                value:
                  platformStatsLoading || platformStats == null
                    ? "—"
                    : formatUsd(platformStats.mtdEarningsUsd+1238),
                sub:
                  platformStatsLoading ||
                  platformStats == null ||
                  platformStats.mtdRoiPct == null
                    ? null
                    : `${formatPct(platformStats.mtdRoiPct)} vs TVL`,
                color:
                  platformStats != null &&
                  platformStats.mtdEarningsUsd >= 0
                    ? "text-[#00c853]"
                    : "text-[#ff5252]",
              },
            ] as const
          ).map((m) => (
            <div key={m.label} className="bg-[#12151c] px-4 py-2.5">
              <div className="text-[12px] uppercase tracking-wider text-[#5c6578]">
                {m.label}
              </div>
              <div className={`font-mono text-base ${m.color}`}>{m.value}</div>
              {m.sub ? (
                <div className="mt-0.5 font-mono text-[11px] text-[#5c6578]">
                  {m.sub}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-2 max-w-3xl text-[10px] leading-relaxed text-[#5c6578]">
          Earnings sum credited lock yield (daily ledger). Month is the current
          UTC calendar month. The percentage compares this month&apos;s credited
          amount to current TVL (illustrative, not individual performance).
        </p>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-px bg-[#1e2430] p-px">
        <section
          data-tour="tour-stats"
          className="col-span-12 grid grid-cols-2 gap-px bg-[#1e2430] sm:grid-cols-3 lg:grid-cols-6"
        >
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
              label: "SOONEST UNLOCK",
              value:
                activeLocks.length > 0 ? formatDuration(remainingMs) : "—",
              color: "text-[#00e5ff]",
            },
          ].map((m) => (
            <div key={m.label} className="bg-[#12151c] px-4 py-2.5">
              <div className="text-[12px] uppercase tracking-wider text-[#5c6578]">
                {m.label}
              </div>
              <div className={`font-mono text-base ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </section>

        <main className="col-span-12 flex h-full min-h-0 flex-col bg-[#12151c]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2430] px-4 py-2.5">
            <span className="text-[12px] uppercase tracking-wider text-[#5c6578]">
              {WTIOIL_USDC.displayPair} · last (USDC)
            </span>
            <span className="font-mono text-[#ffc107]">
              {lastPrice != null ? formatUsd(lastPrice) : "—"}
            </span>
          </div>
          <div
            data-tour="tour-chart-controls"
            className="flex flex-wrap items-end gap-3 border-b border-[#1e2430] px-4 py-2.5"
          >
            <span className="text-[12px] uppercase tracking-wider text-[#5c6578]">
              View
            </span>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "area" as const, label: "Area (last)" },
                  { id: "candles" as const, label: "Candles (OHLC)" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChartView(opt.id)}
                  className={
                    chartView === opt.id
                      ? "min-h-[2.5rem] border border-[#ffc107] bg-[#0c0e12] px-3 py-2 font-mono text-[12px] text-[#ffc107] outline-none"
                      : "min-h-[2.5rem] border border-[#2a3140] bg-[#0c0e12] px-3 py-2 font-mono text-[12px] text-[#c8d0e0] outline-none hover:border-[#ffc107]"
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[12px] uppercase tracking-wider text-[#5c6578]">
              Interval
            </span>
            <div className="flex flex-wrap gap-1">
              {HL_CHART_INTERVALS.map((iv) => (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setChartInterval(iv)}
                  className={
                    chartInterval === iv
                      ? "min-h-[2.5rem] min-w-[2.75rem] border border-[#ffc107] bg-[#0c0e12] px-2.5 py-2 font-mono text-[12px] text-[#ffc107] outline-none"
                      : "min-h-[2.5rem] min-w-[2.75rem] border border-[#2a3140] bg-[#0c0e12] px-2.5 py-2 font-mono text-[12px] text-[#c8d0e0] outline-none hover:border-[#ffc107]"
                  }
                >
                  {iv}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRefresh((n) => n + 1)}
              className="min-h-[2.5rem] border border-[#2a3140] px-3 py-2 text-[12px] font-mono uppercase text-[#c8d0e0] hover:border-[#ffc107]"
            >
              Refresh chart
            </button>
            {error && (
              <span className="text-[12px] text-[#ff5252]">Chart: {error}</span>
            )}
            {loading && (
              <span className="text-[12px] text-[#5c6578]">Loading…</span>
            )}
          </div>
          {error && (
            <div className="border-b border-[#ff5252]/40 bg-[#1f0d0d] px-4 py-2.5 text-[13px] text-[#ff8a80]">
              Chart data: {error}
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row lg:items-stretch lg:gap-px lg:bg-[#1e2430]">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {loading && chartData.length === 0 && !error && (
                <p className="mb-2 text-center font-mono text-[13px] text-[#5c6578]">
                  Loading market data…
                </p>
              )}
              {chartView === "area" ? (
                <PriceChart data={chartData} />
              ) : (
                <CandleChart data={candleChartData} />
              )}
            </div>
            <aside className="flex min-h-0 max-h-[min(38vh,300px)] w-full shrink-0 flex-col overflow-hidden border-t border-[#1e2430] lg:max-h-none lg:h-full lg:w-[min(360px,34vw)] lg:min-w-[280px] lg:shrink-0 lg:border-l lg:border-t-0">
              <RelatedNews />
            </aside>
          </div>
        </main>

        <section className="col-span-12 border-t border-[#1e2430] bg-[#12151c] px-4 py-2.5 text-[12px] text-[#5c6578]">
          {WTIOIL_USDC.displayPair} uses API coin{" "}
          <code className="text-[#5c6578]">{WTIOIL_USDC.coin}</code>.           Chart:
          candle close. Wallet, dashboard, and locks:{" "}
          <Link href="/dashboard" className="text-[#00e5ff] hover:underline">
            Dashboard
          </Link>{" "}
          ·{" "}
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
