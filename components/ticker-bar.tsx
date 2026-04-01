"use client";

import { useEffect, useState } from "react";

type TickerPrice = {
  benchmark: string;
  close: number;
  price_date: string;
  prev_close: number | null;
};

const BENCHMARK_LABELS: Record<string, string> = {
  WTI: "WTI",
  BRENT: "BRENT",
  OPEC: "OPEC",
  DUBAI: "DUBAI",
  URALS: "URALS",
  WCS: "WCS",
  LLS: "LLS",
};

function formatPrice(n: number) {
  return n.toFixed(2);
}

function formatChange(close: number, prev: number | null) {
  if (prev == null || prev === 0) return { pct: "—", color: "text-terminal-muted" };
  const change = ((close - prev) / prev) * 100;
  const sign = change >= 0 ? "+" : "";
  const color = change > 0 ? "text-terminal-green" : change < 0 ? "text-terminal-red" : "text-terminal-muted";
  return { pct: `${sign}${change.toFixed(2)}%`, color };
}

export function TickerBar() {
  const [prices, setPrices] = useState<TickerPrice[]>([]);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prices/latest", { cache: "no-store" });
        const data = (await res.json()) as { prices?: TickerPrice[] };
        if (data.prices) setPrices(data.prices);
      } catch {}
    }
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center gap-0 overflow-x-auto border-b border-terminal-border bg-[#0a0c10]">
      <div className="flex shrink-0 items-center gap-4 px-4 py-2">
        <span className="text-[11px] tracking-wider text-terminal-muted">
          UTC {clock}
        </span>
        <span className="text-terminal-border">|</span>
      </div>
      <div className="flex items-center gap-0 overflow-x-auto">
        {prices.length === 0 ? (
          <span className="px-4 py-2 text-[12px] text-terminal-muted">
            Awaiting price data — trigger /api/seed to populate
          </span>
        ) : (
          prices.map((p) => {
            const { pct, color } = formatChange(p.close, p.prev_close);
            return (
              <div
                key={p.benchmark}
                className="flex shrink-0 items-center gap-2 border-r border-terminal-border px-4 py-2"
              >
                <span className="text-[11px] font-medium text-terminal-amber">
                  {BENCHMARK_LABELS[p.benchmark] ?? p.benchmark}
                </span>
                <span className="text-[13px] text-[#e0e0e0]">
                  ${formatPrice(p.close)}
                </span>
                <span className={`text-[11px] ${color}`}>{pct}</span>
              </div>
            );
          })
        )}
      </div>
    </header>
  );
}
