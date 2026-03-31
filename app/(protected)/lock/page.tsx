"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ActiveLiquidityLock } from "@/lib/session-trading";
import { useWallet } from "@/components/wallet-provider";

const DAY_MS = 24 * 60 * 60_000;

/** Past performance band for illustrative estimates only (not guaranteed). */
const EST_MONTHLY_PCT_LOW = 0.3;
const EST_MONTHLY_PCT_HIGH = 0.35;

const LOCK_PRESETS = [
  {
    days: 30,
    ms: 30 * DAY_MS,
    title: "30 days",
    guaranteed: false,
    line:
      "Standard lock. P&L runs while the position is open; principal unlocks at expiry.",
  },
  {
    days: 60,
    ms: 60 * DAY_MS,
    title: "60 days",
    guaranteed: false,
    line:
      "Longer runway, same mechanics. Principal unlocks when the term ends.",
  },
  {
    days: 90,
    ms: 90 * DAY_MS,
    title: "90 days",
    line:
      "Maximum term. Locked principal is guaranteed for the full lock period.",
    guaranteed: true,
  },
] as const;

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

function formatUnlockCountdown(ms: number) {
  if (ms <= 0) return "Unlocking…";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) {
    return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return formatDuration(ms);
}

function roiPercent(principal: number, yieldUsd: number): string {
  if (!Number.isFinite(principal) || principal <= 0) return "—";
  const pct = (yieldUsd / principal) * 100;
  return `${pct >= 0 ? "" : "−"}${Math.abs(pct).toFixed(2)}%`;
}

function shortLockId(lockId: string): string {
  return lockId.replace(/-/g, "").slice(0, 8);
}

function LockGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-[18px] w-[18px] shrink-0"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function remainingForLock(lock: ActiveLiquidityLock, tickNow: number): number {
  return Math.max(0, lock.endsAt - tickNow);
}

export default function LockLiquidityPage() {
  const {
    balance,
    hydrated,
    activeLocks,
    tickNow,
    startLock,
  } = useWallet();
  const [lockAmount, setLockAmount] = useState("");
  const [lockPresetMs, setLockPresetMs] = useState(LOCK_PRESETS[0].ms);
  const [lockUiError, setLockUiError] = useState<string | null>(null);

  const sortedLocks = useMemo(
    () => [...activeLocks].sort((a, b) => a.endsAt - b.endsAt),
    [activeLocks]
  );

  const lockAmountNum = useMemo(() => {
    const n = Number(lockAmount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [lockAmount]);

  const illustrativeProfitRange = useMemo(() => {
    if (lockAmountNum == null) return null;
    const preset = LOCK_PRESETS.find((p) => p.ms === lockPresetMs);
    if (!preset) return null;
    const months = preset.days / 30;
    const low = lockAmountNum * EST_MONTHLY_PCT_LOW * months;
    const high = lockAmountNum * EST_MONTHLY_PCT_HIGH * months;
    return {
      low,
      high,
      days: preset.days,
      title: preset.title,
      principalUsd: lockAmountNum,
    };
  }, [lockAmountNum, lockPresetMs]);

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
          You can run <strong className="text-[#c8d0e0]">multiple locks</strong> at
          once (same or different terms). Profits from your positions go to your{" "}
          <strong className="text-[#00c853]">available balance</strong> and can be
          withdrawn anytime; only the{" "}
          <strong className="text-[#00e5ff]">principal</strong> stays locked until
          each position expires. Need funds?{" "}
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

            <div data-tour="tour-lock-form">
              <label className="mb-1 block text-[11px] text-[#5c6578]">
                New lock — amount (USDC)
              </label>
              <input
                type="number"
                min={10}
                step={1}
                className="mb-3 min-h-[2.5rem] w-full border border-[#2a3140] bg-[#0c0e12] px-3 py-2 font-mono text-[11px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
              />
              <div className="mb-1 text-[11px] text-[#5c6578]">
                Lock duration
              </div>
              <div className="mb-2 grid grid-cols-3 gap-2">
                {LOCK_PRESETS.map((p) => (
                  <button
                    key={p.ms}
                    type="button"
                    onClick={() => setLockPresetMs(p.ms)}
                    className={
                      lockPresetMs === p.ms
                        ? "min-h-[2.5rem] border border-[#ffc107] bg-[#0c0e12] px-2 py-2 text-center font-mono text-[11px] leading-tight text-[#ffc107] outline-none"
                        : "min-h-[2.5rem] border border-[#2a3140] bg-[#0c0e12] px-2 py-2 text-center font-mono text-[11px] leading-tight text-[#c8d0e0] outline-none hover:border-[#ffc107]"
                    }
                  >
                    {p.title}
                  </button>
                ))}
              </div>
              <div className="mb-3 rounded border border-[#1e2430] bg-[#0a0c10] p-3 text-[11px] leading-relaxed text-[#5c6578]">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#5c6578]">
                  Compared
                </div>
                <ul className="space-y-2">
                  {LOCK_PRESETS.map((p) => (
                    <li
                      key={p.ms}
                      className={
                        p.guaranteed
                          ? "border-l-2 border-[#00c853] pl-2"
                          : "border-l-2 border-[#2a3140] pl-2"
                      }
                    >
                      <span className="font-mono text-[#c8d0e0]">
                        {p.title}
                      </span>
                      {p.guaranteed ? (
                        <span className="ml-1.5 rounded border border-[#00c853]/50 bg-[#0d1f14] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[#00c853]">
                          Guaranteed
                        </span>
                      ) : null}
                      <span className="mt-0.5 block">— {p.line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => void onStartLock()}
                className="mb-2 min-h-[2.75rem] w-full border border-[#00c853] bg-[#0d1f14] py-2.5 text-[11px] font-mono uppercase text-[#00c853] hover:bg-[#122018]"
              >
                Add lock
              </button>
              {lockUiError && (
                <p className="mb-2 text-[11px] text-[#ff5252]">{lockUiError}</p>
              )}
              <p className="text-[11px] leading-relaxed text-[#5c6578]">
                Past performance for comparable programs has averaged roughly{" "}
                <strong className="text-[#c8d0e0]">30–35% per month</strong>—for
                illustration only;{" "}
                <strong className="text-[#c8d0e0]">not guaranteed</strong>. Enter an
                amount and pick a term to see a rough profit band for that lock
                length; actual results vary. Track activity on the{" "}
                <Link href="/dashboard" className="text-[#00e5ff] hover:underline">
                  Dashboard
                </Link>
                .
              </p>
              {illustrativeProfitRange ? (
                <p className="mt-2 text-[11px] leading-relaxed text-[#5c6578]">
                  <span className="font-mono text-[#00c853]">
                    {formatUsd(illustrativeProfitRange.low)} –{" "}
                    {formatUsd(illustrativeProfitRange.high)}
                  </span>{" "}
                  estimated total profit for{" "}
                  <span className="text-[#c8d0e0]">
                    {illustrativeProfitRange.title}
                  </span>{" "}
                  at {formatUsd(illustrativeProfitRange.principalUsd)} principal
                  (scaled from 30–35% / month to this term; not guaranteed).
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <div className="mb-3 text-[11px] uppercase tracking-wider text-[#5c6578]">
              Active locks ({activeLocks.length})
            </div>
            {sortedLocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[#2a3140] text-[#3d4555]">
                  <LockGlyph className="h-6 w-6" />
                </span>
                <p className="max-w-[260px] text-[11px] leading-relaxed text-[#5c6578]">
                  No positions yet. Add a lock on the left — each one gets its own
                  countdown, P&amp;L, and ROI.
                </p>
              </div>
            ) : (
              <ul className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pr-1">
                {sortedLocks.map((lock) => {
                  const rem = remainingForLock(lock, tickNow);
                  return (
                    <li
                      key={lock.lockId}
                      className="rounded border border-[#1e2430] bg-[#0c0e12] p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#ffc107]/40 bg-[#1a1608] text-[#ffc107]">
                            <LockGlyph />
                          </span>
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] uppercase tracking-wider text-[#5c6578]">
                              Lock · {shortLockId(lock.lockId)}
                            </div>
                            <div className="truncate font-mono text-[13px] text-[#c8d0e0]">
                              {formatUsd(lock.principalUsd)} principal
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 rounded border border-[#1e2430] bg-[#12151c] px-3 py-2">
                        <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#5c6578]">
                          Unlocks in
                        </div>
                        <div className="font-mono text-lg tabular-nums text-[#00e5ff]">
                          {formatUnlockCountdown(rem)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded border border-[#1e2430] bg-[#12151c] px-2 py-2">
                          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#5c6578]">
                            P&amp;L from this lock
                          </div>
                          <div
                            className={`font-mono text-[15px] ${
                              lock.accumulatedYieldUsd >= 0
                                ? "text-[#00c853]"
                                : "text-[#ff5252]"
                            }`}
                          >
                            {formatUsd(lock.accumulatedYieldUsd)}
                          </div>
                        </div>
                        <div className="rounded border border-[#1e2430] bg-[#12151c] px-2 py-2">
                          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[#5c6578]">
                            ROI (this lock)
                          </div>
                          <div
                            className={`font-mono text-[15px] ${
                              lock.accumulatedYieldUsd >= 0
                                ? "text-[#00c853]"
                                : "text-[#ff5252]"
                            }`}
                          >
                            {roiPercent(
                              lock.principalUsd,
                              lock.accumulatedYieldUsd
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
