"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, type IChartApi, type ISeriesApi, ColorType, LineStyle, LineSeries, CandlestickSeries } from "lightweight-charts";

export type OilChartRow = {
  time: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
};

type ChartMode = "line" | "candles";

const BENCHMARKS = ["WTI", "BRENT"] as const;
const BENCHMARK_COLORS: Record<string, string> = {
  WTI: "#ffc107",
  BRENT: "#00e5ff",
  OPEC: "#ff9800",
  DUBAI: "#e040fb",
  URALS: "#ff5252",
};

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "5Y", days: 1825 },
];

export function OilChart({ refreshKey }: { refreshKey?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | ISeriesApi<"Candlestick"> | null>(null);

  const [benchmark, setBenchmark] = useState<string>("WTI");
  const [mode, setMode] = useState<ChartMode>("line");
  const [range, setRange] = useState(365);
  const [loading, setLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [data, setData] = useState<OilChartRow[]>([]);
  const [chartRefreshing, setChartRefreshing] = useState(false);

  const fetchData = useCallback(async (bench: string, days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prices/history?benchmark=${bench}&days=${days}`);
      const json = (await res.json()) as {
        history?: { price_date: string; open?: number | null; high?: number | null; low?: number | null; close: number }[];
      };
      const rows: OilChartRow[] = (json.history ?? []).map((r) => ({
        time: r.price_date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
      }));
      setData(rows);
      if (rows.length > 0) setLastPrice(rows[rows.length - 1].close);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(benchmark, range);
  }, [benchmark, range, fetchData]);

  // Re-fetch when parent triggers refresh
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      fetchData(benchmark, range);
    }
  }, [refreshKey, benchmark, range, fetchData]);

  const handleRefresh = async () => {
    setChartRefreshing(true);
    await fetchData(benchmark, range);
    setChartRefreshing(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#12151c" },
        textColor: "#5c6578",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e2430", style: LineStyle.Dotted },
        horzLines: { color: "#1e2430", style: LineStyle.Dotted },
      },
      crosshair: {
        vertLine: { color: "#ffc10755", labelBackgroundColor: "#ffc107" },
        horzLine: { color: "#ffc10755", labelBackgroundColor: "#ffc107" },
      },
      rightPriceScale: {
        borderColor: "#1e2430",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#1e2430",
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const color = BENCHMARK_COLORS[benchmark] ?? "#ffc107";

    if (mode === "candles" && data.some((r) => r.open != null)) {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#00c853",
        downColor: "#ff5252",
        borderUpColor: "#00c853",
        borderDownColor: "#ff5252",
        wickUpColor: "#00c853",
        wickDownColor: "#ff5252",
      });
      series.setData(
        data
          .filter((r) => r.open != null)
          .map((r) => ({
            time: r.time,
            open: r.open!,
            high: r.high ?? Math.max(r.open!, r.close),
            low: r.low ?? Math.min(r.open!, r.close),
            close: r.close,
          }))
      );
      seriesRef.current = series as ISeriesApi<"Line"> | ISeriesApi<"Candlestick">;
    } else {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: color,
        lastValueVisible: true,
      });
      series.setData(data.map((r) => ({ time: r.time, value: r.close })));
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data, mode, benchmark]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-terminal-border px-4 py-2">
        <div className="flex items-center gap-1">
          {BENCHMARKS.map((b) => (
            <button
              key={b}
              onClick={() => setBenchmark(b)}
              className={`px-3 py-1.5 text-[11px] uppercase transition-colors ${
                benchmark === b
                  ? "border border-terminal-amber bg-[#0c0e12] text-terminal-amber"
                  : "border border-terminal-border text-terminal-muted hover:border-terminal-amber hover:text-[#c8d0e0]"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <span className="text-terminal-border">|</span>
        <div className="flex items-center gap-1">
          {(["line", "candles"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-[11px] uppercase transition-colors ${
                mode === m
                  ? "border border-terminal-cyan bg-[#0c0e12] text-terminal-cyan"
                  : "border border-terminal-border text-terminal-muted hover:text-[#c8d0e0]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-terminal-border">|</span>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={`px-2.5 py-1.5 text-[11px] transition-colors ${
                range === r.days
                  ? "border border-terminal-amber bg-[#0c0e12] text-terminal-amber"
                  : "border border-terminal-border text-terminal-muted hover:text-[#c8d0e0]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[12px]">
          {lastPrice != null && (
            <span className="text-terminal-amber">${lastPrice.toFixed(2)}</span>
          )}
          {loading && <span className="text-terminal-muted">Loading...</span>}
          <button
            onClick={handleRefresh}
            disabled={chartRefreshing}
            title="Refresh chart data"
            className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-[10px] text-terminal-muted transition-colors hover:border-terminal-cyan hover:text-terminal-cyan disabled:opacity-50"
          >
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className={`h-3 w-3 ${chartRefreshing ? "animate-spin" : ""}`}
            >
              <path d="M8 3a5 5 0 00-4.546 2.914.5.5 0 01-.908-.418A6 6 0 0114 8a.5.5 0 01-1 0 5 5 0 00-5-5z" />
              <path d="M8 13a5 5 0 004.546-2.914.5.5 0 01.908.418A6 6 0 012 8a.5.5 0 011 0 5 5 0 005 5z" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      <div ref={containerRef} className="relative min-h-0 flex-1">
        {!loading && data.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-terminal-muted">
            <span className="text-[13px]">No price data yet</span>
            <span className="text-[11px]">
              Trigger <code className="text-terminal-amber">/api/seed</code> to populate historical prices
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
