"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DailyPnlChart } from "@/components/daily-pnl-chart";
import { useWallet } from "@/components/wallet-provider";
import {
  loadDailyPnl,
  sumRealizedPnl,
  type DailyPnlRow,
} from "@/lib/pnl-history";

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

function todayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { balance, hydrated, activeLock, remainingMs } = useWallet();
  const [dailyRows, setDailyRows] = useState<DailyPnlRow[]>([]);

  useEffect(() => {
    setDailyRows(loadDailyPnl());
  }, [hydrated, activeLock]);

  const tk = todayKey();
  const todayRealized = dailyRows.find((r) => r.date === tk)?.pnlUsd ?? 0;
  const totalRealized = useMemo(() => sumRealizedPnl(dailyRows), [dailyRows]);

  const openSessionPnl = activeLock?.sessionPnlUsd ?? 0;
  const lockedPrincipal = activeLock?.principalUsd ?? 0;

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#c8d0e0]">
      <div className="mx-auto max-w-4xl px-3 py-6">
        <h1 className="mb-1 font-mono text-[13px] uppercase tracking-wider text-[#ffc107]">
          Dashboard
        </h1>
        <p className="mb-6 text-[10px] text-[#5c6578]">
          Locked funds, session P&L, and realized P&L by day (from completed locks).{" "}
          <Link href="/lock" className="text-[#00e5ff] hover:underline">
            Lock liquidity
          </Link>{" "}
          ·{" "}
          <Link href="/balance" className="text-[#00e5ff] hover:underline">
            Balance
          </Link>
          .
        </p>

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
              label: "Session P&L",
              value: activeLock ? formatUsd(openSessionPnl) : "—",
              sub: activeLock ? "Open position" : "Start a lock to trade",
              color:
                !activeLock || openSessionPnl >= 0
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
            <div key={c.label} className="bg-[#12151c] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-[#5c6578]">
                {c.label}
              </div>
              <div className={`mt-1 font-mono text-lg ${c.color}`}>{c.value}</div>
              <div className="mt-0.5 text-[9px] text-[#5c6578]">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-[#1e2430] bg-[#12151c] p-4">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[#5c6578]">
              Today (realized)
            </div>
            <div
              className={`font-mono text-xl ${
                todayRealized >= 0 ? "text-[#00c853]" : "text-[#ff5252]"
              }`}
            >
              {hydrated ? formatUsd(todayRealized) : "—"}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-[#5c6578]">
              Settled lock P&L credited today. Open session P&L is merged into the
              chart below.
            </p>
          </div>
          <div className="rounded border border-[#1e2430] bg-[#12151c] p-4">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[#5c6578]">
              All-time realized
            </div>
            <div
              className={`font-mono text-xl ${
                totalRealized >= 0 ? "text-[#00c853]" : "text-[#ff5252]"
              }`}
            >
              {hydrated ? formatUsd(totalRealized) : "—"}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-[#5c6578]">
              Sum of daily realized P&L from completed liquidity locks in this
              browser.
            </p>
          </div>
        </div>

        <section
          data-tour="tour-dashboard-pnl"
          className="rounded border border-[#1e2430] bg-[#12151c] p-4"
        >
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[10px] uppercase tracking-wider text-[#5c6578]">
                Daily P&L (realized)
              </h2>
              <p className="text-[9px] text-[#5c6578]">
                Last ~45 days · USDC · local calendar day
              </p>
            </div>
          </div>
          <DailyPnlChart
            rows={dailyRows}
            todayOpenSessionPnlUsd={activeLock ? openSessionPnl : 0}
          />
        </section>
      </div>
    </div>
  );
}
