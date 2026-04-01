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

export function OilChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | ISeriesApi<"Candlestick"> | null>(null);

  const [benchmark, setBenchmark] = useState<string>("WTI");
  const [mode, setMode] = useState<ChartMode>("line");
  const [range, setRange] = useState(365);
  const [loading, setLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [data, setData] = useState<OilChartRow[]>([]);

  const fetchData = useCallback(async (bench: string, days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prices/history?benchmark=${bench}&days=${days}`);
      const json = (await res.json()) as { history?: OilChartRow[] };
      const rows = json.history ?? [];
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
        </div>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
