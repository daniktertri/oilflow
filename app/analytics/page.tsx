"use client";

import { useEffect, useState, useRef } from "react";
import { createChart, type IChartApi, ColorType, LineStyle, BaselineSeries, HistogramSeries } from "lightweight-charts";
import { COUNTRY_OIL_DATA } from "@/lib/oil-data";

type SpreadRow = { date: string; spread: number };
type InvRow = { date: string; value: number; change: number | null };

function SpreadChart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [data, setData] = useState<SpreadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/analytics/spreads?bench1=BRENT&bench2=WTI&days=180");
        const json = (await res.json()) as { spreads?: SpreadRow[] };
        setData(json.spreads ?? []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: "#12151c" }, textColor: "#5c6578", fontFamily: "var(--font-jetbrains), monospace", fontSize: 11 },
      grid: { vertLines: { color: "#1e2430", style: LineStyle.Dotted }, horzLines: { color: "#1e2430", style: LineStyle.Dotted } },
      rightPriceScale: { borderColor: "#1e2430" },
      timeScale: { borderColor: "#1e2430" },
      height: 250,
    });
    chartRef.current = chart;

    const series = chart.addSeries(BaselineSeries, {
      baseValue: { type: "price", price: 0 },
      topLineColor: "#00c853",
      bottomLineColor: "#ff5252",
      topFillColor1: "#00c85322",
      topFillColor2: "#00c85305",
      bottomFillColor1: "#ff525205",
      bottomFillColor2: "#ff525222",
    });
    series.setData(data.map((r) => ({ time: r.date, value: r.spread })));
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    });
    observer.observe(ref.current);

    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  }, [data]);

  return (
    <div className="border border-terminal-border bg-terminal-panel">
      <div className="border-b border-terminal-border px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-wider text-terminal-amber">
          Brent-WTI Spread
        </span>
        <span className="ml-2 text-[11px] text-terminal-muted">6 months</span>
        {data.length > 0 && (
          <span className="ml-2 text-[13px] text-[#e0e0e0]">
            ${data[data.length - 1].spread.toFixed(2)}
          </span>
        )}
      </div>
      <div ref={ref} className="w-full">
        {loading && (
          <div className="flex h-[250px] items-center justify-center text-[12px] text-terminal-muted">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryChart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [data, setData] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/analytics/inventories?product=EPC0&weeks=52");
        const json = (await res.json()) as { inventories?: InvRow[] };
        setData(json.inventories ?? []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: "#12151c" }, textColor: "#5c6578", fontFamily: "var(--font-jetbrains), monospace", fontSize: 11 },
      grid: { vertLines: { color: "#1e2430", style: LineStyle.Dotted }, horzLines: { color: "#1e2430", style: LineStyle.Dotted } },
      rightPriceScale: { borderColor: "#1e2430" },
      timeScale: { borderColor: "#1e2430" },
      height: 250,
    });
    chartRef.current = chart;

    const series = chart.addSeries(HistogramSeries, {
      color: "#00e5ff",
    });
    series.setData(
      data
        .filter((r) => r.change != null)
        .map((r) => ({
          time: r.date,
          value: r.change!,
          color: r.change! >= 0 ? "#ff5252" : "#00c853",
        }))
    );
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    });
    observer.observe(ref.current);

    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  }, [data]);

  const lastInv = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="border border-terminal-border bg-terminal-panel">
      <div className="border-b border-terminal-border px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-wider text-terminal-amber">
          U.S. Crude Inventories
        </span>
        <span className="ml-2 text-[11px] text-terminal-muted">Weekly change (Mbbls)</span>
        {lastInv && (
          <span className="ml-2 text-[13px] text-[#e0e0e0]">
            {(lastInv.value / 1000).toFixed(1)}M bbl
          </span>
        )}
      </div>
      <div ref={ref} className="w-full">
        {loading && (
          <div className="flex h-[250px] items-center justify-center text-[12px] text-terminal-muted">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}

function PriceComparisonTable() {
  const [prices, setPrices] = useState<
    { benchmark: string; close: number; price_date: string; prev_close: number | null }[]
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/prices/latest", { cache: "no-store" });
        const data = (await res.json()) as { prices?: typeof prices };
        if (data.prices) setPrices(data.prices);
      } catch {}
    })();
  }, []);

  return (
    <div className="border border-terminal-border bg-terminal-panel">
      <div className="border-b border-terminal-border px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-wider text-terminal-amber">
          Benchmark Comparison
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-terminal-border text-terminal-muted">
              <th className="px-4 py-2 font-normal">Benchmark</th>
              <th className="px-4 py-2 font-normal text-right">Price</th>
              <th className="px-4 py-2 font-normal text-right">Change</th>
              <th className="px-4 py-2 font-normal text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => {
              const change =
                p.prev_close && p.prev_close !== 0
                  ? ((p.close - p.prev_close) / p.prev_close) * 100
                  : null;
              return (
                <tr
                  key={p.benchmark}
                  className="border-b border-terminal-border/50 hover:bg-[#0c0e12]"
                >
                  <td className="px-4 py-2 text-terminal-amber">{p.benchmark}</td>
                  <td className="px-4 py-2 text-right text-[#e0e0e0]">
                    ${p.close.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right ${
                      change != null
                        ? change >= 0
                          ? "text-terminal-green"
                          : "text-terminal-red"
                        : "text-terminal-muted"
                    }`}
                  >
                    {change != null
                      ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-terminal-muted">
                    {p.price_date}
                  </td>
                </tr>
              );
            })}
            {prices.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-terminal-muted">
                  No price data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductionRanking() {
  const sorted = [...COUNTRY_OIL_DATA].sort(
    (a, b) => b.production - a.production
  ).slice(0, 15);

  const maxProd = sorted[0]?.production ?? 1;

  return (
    <div className="border border-terminal-border bg-terminal-panel">
      <div className="border-b border-terminal-border px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-wider text-terminal-amber">
          Global Production Rankings
        </span>
        <span className="ml-2 text-[11px] text-terminal-muted">Top 15 (K bbl/day)</span>
      </div>
      <div className="p-4">
        {sorted.map((c, i) => (
          <div key={c.iso3} className="mb-2 flex items-center gap-2">
            <span className="w-5 text-right text-[11px] text-terminal-muted">
              {i + 1}
            </span>
            <span className="w-28 truncate text-[12px] text-[#c8d0e0]">
              {c.name}
            </span>
            <div className="flex-1">
              <div
                className="h-4 rounded-sm bg-terminal-amber/30"
                style={{ width: `${(c.production / maxProd) * 100}%` }}
              >
                <div
                  className="h-full rounded-sm bg-terminal-amber"
                  style={{ width: `${(c.production / maxProd) * 100}%` }}
                />
              </div>
            </div>
            <span className="w-16 text-right text-[12px] text-terminal-amber">
              {(c.production / 1000).toFixed(1)}M
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-[13px] uppercase tracking-wider text-terminal-amber">
          Analytics
        </h1>
        <p className="mt-1 text-[11px] text-terminal-muted">
          Market spreads, inventories, and production data
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpreadChart />
        <InventoryChart />
        <PriceComparisonTable />
        <ProductionRanking />
      </div>
    </div>
  );
}
