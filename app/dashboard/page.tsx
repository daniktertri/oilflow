"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DailyPnlChart } from "@/components/daily-pnl-chart";
import { useWallet } from "@/components/wallet-provider";
import { sumRealizedPnl, type DailyPnlRow } from "@/lib/pnl-history";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
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

/** Match server `daily_returns.day` (UTC). */
function utcTodayKey(): string {
  const t = new Date();
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

type LockTradeRow = {
  id: string;
  liquiditySource: string;
  createdAt: string;
  pnlUsd: number;
  notionalUsd: number;
  side: string;
};

function liquidityLabel(src: string): string {
  if (src === "user_liquidity") return "Your liquidity";
  if (src === "platform_liquidity") return "Platform liquidity";
  return src;
}

export default function DashboardPage() {
  const { balance, hydrated, activeLock, remainingMs } = useWallet();
  const [dailyRows, setDailyRows] = useState<DailyPnlRow[]>([]);
  const [trades, setTrades] = useState<LockTradeRow[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setFetchError(null);
    try {
      const [dr, tr] = await Promise.all([
        fetch("/api/wallet/daily-returns", { cache: "no-store" }),
        fetch("/api/wallet/lock-trades?limit=100", { cache: "no-store" }),
      ]);
      if (dr.ok) {
        const data = (await dr.json()) as { rows?: { date: string; pnlUsd: number }[] };
        setDailyRows(
          (data.rows ?? []).map((r) => ({ date: r.date, pnlUsd: r.pnlUsd }))
        );
      }
      if (tr.ok) {
        const data = (await tr.json()) as {
          trades?: LockTradeRow[];
        };
        setTrades(data.trades ?? []);
      }
      if (!dr.ok || !tr.ok) {
        setFetchError("Could not load performance data.");
      }
    } catch {
      setFetchError("Could not load performance data.");
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, hydrated, activeLock]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadDashboard();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [loadDashboard]);

  const tk = utcTodayKey();
  const todayRealized = dailyRows.find((r) => r.date === tk)?.pnlUsd ?? 0;
  const totalRealized = useMemo(() => sumRealizedPnl(dailyRows), [dailyRows]);

  const openYield = activeLock?.accumulatedYieldUsd ?? 0;
  const lockedPrincipal = activeLock?.principalUsd ?? 0;

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#c8d0e0]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 font-mono text-[14px] uppercase tracking-wider text-[#ffc107]">
          Dashboard
        </h1>
        <p className="mb-6 text-[11px] text-[#5c6578]">
          Lock yield, hourly synthetic trades, and daily P&amp;L (UTC).{" "}
          <Link href="/lock" className="text-[#00e5ff] hover:underline">
            Lock liquidity
          </Link>{" "}
          ·{" "}
          <Link href="/balance" className="text-[#00e5ff] hover:underline">
            Balance
          </Link>
          .
        </p>

        {fetchError && (
          <p className="mb-4 text-[11px] text-[#ff5252]">{fetchError}</p>
        )}

        <div
          data-tour="tour-dashboard-overview"
          className="mb-6 grid gap-px bg-[#1e2430] sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              label: "Available USDC",
              value: hydrated ? formatUsd(balance) : "—",
              sub: "Wallet",
              color: "text-[#c8d0e0]",
            },
            {
              label: "Locked principal",
              value: activeLock ? formatUsd(lockedPrincipal) : "—",
              sub: activeLock ? "In active lock" : "No active lock",
              color: "text-[#00e5ff]",
            },
            {
              label: "Accumulated yield",
              value: activeLock ? formatUsd(openYield) : "—",
              sub: activeLock ? "This lock (server)" : "Start a lock to earn",
              color:
                !activeLock || openYield >= 0
                  ? "text-[#00c853]"
                  : "text-[#ff5252]",
            },
            {
              label: "Time left",
              value: activeLock ? formatDuration(remainingMs) : "—",
              sub: activeLock ? "Current lock" : "—",
              color: "text-[#ffc107]",
            },
          ].map((c) => (
            <div key={c.label} className="bg-[#12151c] px-5 py-4">
              <div className="text-[11px] uppercase tracking-wider text-[#5c6578]">
                {c.label}
              </div>
              <div className={`mt-1 font-mono text-xl ${c.color}`}>{c.value}</div>
              <div className="mt-0.5 text-[11px] text-[#5c6578]">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-[#5c6578]">
              Today (UTC, realized)
            </div>
            <div
              className={`font-mono text-2xl ${
                todayRealized >= 0 ? "text-[#00c853]" : "text-[#ff5252]"
              }`}
            >
              {hydrated ? formatUsd(todayRealized) : "—"}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5c6578]">
              Hourly lock yield credited today (UTC day).
            </p>
          </div>
          <div className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-[#5c6578]">
              All-time realized
            </div>
            <div
              className={`font-mono text-2xl ${
                totalRealized >= 0 ? "text-[#00c853]" : "text-[#ff5252]"
              }`}
            >
              {hydrated ? formatUsd(totalRealized) : "—"}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#5c6578]">
              Sum of daily P&amp;L from your account (server).
            </p>
          </div>
        </div>

        <section
          data-tour="tour-dashboard-pnl"
          className="mb-6 rounded border border-[#1e2430] bg-[#12151c] p-5"
        >
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[11px] uppercase tracking-wider text-[#5c6578]">
                Daily P&amp;L (USD, UTC)
              </h2>
              <p className="text-[11px] text-[#5c6578]">
                Last ~45 days · hourly lock yield
              </p>
            </div>
          </div>
          <DailyPnlChart rows={dailyRows} todayOpenSessionPnlUsd={0} />
        </section>

        <section className="rounded border border-[#1e2430] bg-[#12151c]">
          <div className="border-b border-[#1e2430] px-4 py-2.5">
            <h2 className="text-[11px] uppercase tracking-wider text-[#5c6578]">
              Executed trades (lock)
            </h2>
            <p className="text-[11px] text-[#5c6578]">
              Two synthetic trades per hourly accrual (your liquidity + platform).
            </p>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-x-3 border-b border-[#1e2430] px-4 py-2 font-mono text-[11px] text-[#5c6578]">
              <span>TIME (UTC)</span>
              <span>SOURCE</span>
              <span>SIDE</span>
              <span className="text-right">P&amp;L</span>
            </div>
            {trades.length === 0 && (
              <p className="px-4 py-6 text-center text-[11px] text-[#5c6578]">
                No trades yet. Yield accrues hourly while a lock is active.
              </p>
            )}
            {trades.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-x-3 border-b border-[#1a1f28] px-4 py-2 font-mono text-[11px]"
              >
                <span className="text-[#5c6578]">
                  {new Date(t.createdAt).toISOString().slice(0, 19).replace("T", " ")}
                </span>
                <span className="text-[#c8d0e0]">
                  {liquidityLabel(t.liquiditySource)}
                </span>
                <span
                  className={
                    t.side === "long" ? "text-[#00c853]" : "text-[#ff5252]"
                  }
                >
                  {t.side.toUpperCase()}
                </span>
                <span
                  className={`text-right text-[#5c6578] ${t.pnlUsd >= 0 ? "text-[#00c853]" : "text-[#ff5252]"}`}
                >
                  {formatUsd(t.pnlUsd)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
