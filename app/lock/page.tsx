"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@/components/wallet-provider";

const LOCK_PRESETS: { label: string; ms: number }[] = [
  { label: "15 min", ms: 15 * 60_000 },
  { label: "1 hour", ms: 60 * 60_000 },
  { label: "4 hours", ms: 4 * 60 * 60_000 },
  { label: "1 day", ms: 24 * 60 * 60_000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60_000 },
];

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

export default function LockLiquidityPage() {
  const {
    balance,
    hydrated,
    activeLock,
    remainingMs,
    startLock,
  } = useWallet();
  const [lockAmount, setLockAmount] = useState("");
  const [lockPresetMs, setLockPresetMs] = useState(LOCK_PRESETS[1].ms);
  const [lockUiError, setLockUiError] = useState<string | null>(null);

  const onStartLock = async () => {
    setLockUiError(null);
    const amt = Number(lockAmount);
    const r = await startLock({ amountUsd: amt, durationMs: lockPresetMs });
    if (!r.ok) {
      setLockUiError(r.error);
      return;
    }
    setLockAmount("");
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#c8d0e0]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 font-mono text-[14px] uppercase tracking-wider text-[#ffc107]">
          Lock liquidity
        </h1>
        <p className="mb-6 text-[11px] text-[#5c6578]">
          Lock USDC for a window to run automated execution on WTIOIL-USDC. One
          fill per minute while active. Principal and session P&amp;L return at
          expiry. Need funds?{" "}
          <Link href="/balance" className="text-[#00e5ff] hover:underline">
            Balance
          </Link>
          .
        </p>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <section
            data-tour="tour-lock-wallet"
            className="rounded border border-[#1e2430] bg-[#12151c] p-5"
          >
            <div className="mb-2 text-[11px] uppercase tracking-wider text-[#5c6578]">
              Wallet (USDC)
            </div>
            <div className="mb-4 font-mono text-xl text-[#c8d0e0]">
              {hydrated ? formatUsd(balance) : "—"}
            </div>

            {!activeLock ? (
              <div data-tour="tour-lock-form">
                <label className="mb-1 block text-[11px] text-[#5c6578]">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  min={10}
                  step={1}
                  className="mb-3 min-h-[2.5rem] w-full border border-[#2a3140] bg-[#0c0e12] px-3 py-2 font-mono text-[11px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
                  value={lockAmount}
                  onChange={(e) => setLockAmount(e.target.value)}
                />
                <label className="mb-1 block text-[11px] text-[#5c6578]">
                  Lock duration
                </label>
                <select
                  className="mb-3 min-h-[2.5rem] w-full border border-[#2a3140] bg-[#0c0e12] px-3 py-2 font-mono text-[11px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
                  value={lockPresetMs}
                  onChange={(e) => setLockPresetMs(Number(e.target.value))}
                >
                  {LOCK_PRESETS.map((p) => (
                    <option key={p.ms} value={p.ms}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void onStartLock()}
                  className="mb-2 min-h-[2.75rem] w-full border border-[#00c853] bg-[#0d1f14] py-2.5 text-[11px] font-mono uppercase text-[#00c853] hover:bg-[#122018]"
                >
                  Lock &amp; run
                </button>
                {lockUiError && (
                  <p className="mb-2 text-[11px] text-[#ff5252]">{lockUiError}</p>
                )}
                <p className="text-[11px] leading-relaxed text-[#5c6578]">
                  Locked funds route into automated execution for the chosen
                  window. One fill per minute while the lock is active.
                </p>
              </div>
            ) : (
              <div data-tour="tour-lock-form" className="space-y-2 text-[11px]">
                <div className="flex justify-between font-mono text-[#c8d0e0]">
                  <span className="text-[#5c6578]">Locked</span>
                  <span>{formatUsd(activeLock.principalUsd)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#5c6578]">Session P&amp;L</span>
                  <span
                    className={
                      activeLock.sessionPnlUsd >= 0
                        ? "text-[#00c853]"
                        : "text-[#ff5252]"
                    }
                  >
                    {formatUsd(activeLock.sessionPnlUsd)}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[#00e5ff]">
                  <span className="text-[#5c6578]">Time left</span>
                  <span>{formatDuration(remainingMs)}</span>
                </div>
                <p className="leading-relaxed text-[#5c6578]">
                  Execution continues until the lock expires; principal and
                  P&amp;L return to your wallet at expiry.
                </p>
              </div>
            )}
          </section>

          <section
            data-tour="tour-lock-trades"
            className="rounded border border-[#1e2430] bg-[#12151c]"
          >
            <div className="border-b border-[#1e2430] px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#5c6578]">
              Executed trades
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-x-3 border-b border-[#1e2430] px-4 py-2 font-mono text-[11px] text-[#5c6578]">
                <span>TIME (UTC)</span>
                <span>SIDE</span>
                <span className="text-right">PRICE</span>
                <span className="text-right">NOTIONAL</span>
                <span className="text-right">FEE</span>
                <span className="text-right">P&amp;L</span>
              </div>
              {activeLock && activeLock.trades.length === 0 && (
                <p className="px-4 py-6 text-center text-[11px] text-[#5c6578]">
                  Fills appear every minute while a liquidity lock is active.
                </p>
              )}
              {activeLock?.trades.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-x-3 border-b border-[#1a1f28] px-4 py-2 font-mono text-[11px]"
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
                  <span className="text-right">{formatUsd(t.notionalUsd)}</span>
                  <span className="text-right text-[#5c6578]">
                    {formatUsd(t.feeUsd)}
                  </span>
                  <span
                    className={`text-right ${t.pnlUsd >= 0 ? "text-[#00c853]" : "text-[#ff5252]"}`}
                  >
                    {formatUsd(t.pnlUsd)}
                  </span>
                </div>
              ))}
              {!activeLock && (
                <p className="px-4 py-6 text-center text-[11px] text-[#5c6578]">
                  No executions yet. Start a liquidity lock to trade.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
