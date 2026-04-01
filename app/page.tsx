"use client";

import { OilChart } from "@/components/oil-chart";
import { MarketBrief } from "@/components/market-brief";
import { RelatedNews } from "@/components/related-news";
import { useEffect, useState } from "react";

type TickerPrice = {
  benchmark: string;
  close: number;
  price_date: string;
  prev_close: number | null;
};

type Brief = {
  direction: string | null;
  conviction: string | null;
  sentiment: string | null;
};

function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

const DIRECTION_CONFIG: Record<string, { label: string; color: string }> = {
  LONG: { label: "LONG", color: "text-terminal-green" },
  SHORT: { label: "SHORT", color: "text-terminal-red" },
  NEUTRAL: { label: "NEUTRAL", color: "text-terminal-amber" },
};

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string | null;
  color: string;
}) {
  return (
    <div className="border border-terminal-border bg-terminal-panel px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </div>
      <div className={`mt-1 text-lg ${color}`}>{value}</div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-terminal-muted">{sub}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [prices, setPrices] = useState<TickerPrice[]>([]);
  const [signal, setSignal] = useState<Brief | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/prices/latest", { cache: "no-store" });
        const data = (await res.json()) as { prices?: TickerPrice[] };
        if (data.prices) setPrices(data.prices);
      } catch {}
    })();
    (async () => {
      try {
        const res = await fetch("/api/ai/brief", { cache: "no-store" });
        const data = (await res.json()) as { brief?: Brief | null };
        if (data.brief) setSignal(data.brief);
      } catch {}
    })();
  }, []);

  const wti = prices.find((p) => p.benchmark === "WTI");
  const brent = prices.find((p) => p.benchmark === "BRENT");

  const wtiChange =
    wti?.prev_close && wti.prev_close !== 0
      ? ((wti.close - wti.prev_close) / wti.prev_close) * 100
      : null;
  const brentChange =
    brent?.prev_close && brent.prev_close !== 0
      ? ((brent.close - brent.prev_close) / brent.prev_close) * 100
      : null;

  const spread =
    brent && wti ? brent.close - wti.close : null;

  const dir = DIRECTION_CONFIG[signal?.direction ?? ""] ?? null;

  return (
    <div className="flex h-full flex-col gap-px bg-terminal-border">
      {/* Metrics strip */}
      <div className="grid grid-cols-2 gap-px bg-terminal-border sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="WTI Crude"
          value={wti ? formatUsd(wti.close) : "—"}
          sub={wtiChange != null ? `${wtiChange >= 0 ? "+" : ""}${wtiChange.toFixed(2)}% day` : null}
          color={
            wtiChange != null
              ? wtiChange >= 0
                ? "text-terminal-green"
                : "text-terminal-red"
              : "text-terminal-amber"
          }
        />
        <MetricCard
          label="Brent Crude"
          value={brent ? formatUsd(brent.close) : "—"}
          sub={brentChange != null ? `${brentChange >= 0 ? "+" : ""}${brentChange.toFixed(2)}% day` : null}
          color={
            brentChange != null
              ? brentChange >= 0
                ? "text-terminal-green"
                : "text-terminal-red"
              : "text-terminal-cyan"
          }
        />
        <MetricCard
          label="Brent-WTI Spread"
          value={spread != null ? formatUsd(spread) : "—"}
          sub="premium"
          color="text-[#e0e0e0]"
        />
        <MetricCard
          label="WTI Date"
          value={wti?.price_date ?? "—"}
          sub="last update"
          color="text-terminal-muted"
        />
        {/* Market direction signal */}
        <div className="border border-terminal-border bg-terminal-panel px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-terminal-muted">
            Market Signal
          </div>
          <div className={`mt-1 text-lg font-bold ${dir?.color ?? "text-terminal-muted"}`}>
            {dir?.label ?? "—"}
          </div>
          {signal?.conviction && (
            <div className="mt-0.5 text-[10px] text-terminal-muted">
              {signal.conviction} conviction
            </div>
          )}
        </div>
        <MetricCard
          label="Benchmarks"
          value={String(prices.length)}
          sub="tracked"
          color="text-terminal-cyan"
        />
      </div>

      {/* Main chart + sidebar */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-[400px] min-w-0 flex-1 flex-col bg-terminal-panel">
          <OilChart />
        </div>
        <aside className="flex w-full shrink-0 flex-col border-t border-terminal-border lg:w-[340px] lg:border-l lg:border-t-0">
          <RelatedNews />
        </aside>
      </div>

      {/* AI brief */}
      <div className="bg-terminal-bg p-3">
        <MarketBrief />
      </div>
    </div>
  );
}
