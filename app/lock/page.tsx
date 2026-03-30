"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@/components/wallet-provider";

const DAY_MS = 24 * 60 * 60_000;

const LOCK_PRESETS = [
  {
    days: 30,
    ms: 30 * DAY_MS,
    title: "30 days",
    guaranteed: false,
    line:
      "Standard lock. Hourly yield accrues on the server; principal returns at expiry.",
  },
  {
    days: 60,
    ms: 60 * DAY_MS,
    title: "60 days",
    guaranteed: false,
    line:
      "Longer runway with the same hourly yield schedule. Same unlock at the end.",
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

export default function LockLiquidityPage() {
  const {
    balance,
    hydrated,
    activeLock,
    remainingMs,
    startLock,
  } = useWallet();
  const [lockAmount, setLockAmount] = useState("");
  const [lockPresetMs, setLockPresetMs] = useState(LOCK_PRESETS[0].ms);
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
          Lock USDC for 30, 60, or 90 days. Hourly yield accrues on the server;
          principal returns at expiry. Need funds?{" "}
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
                  Lock &amp; run
                </button>
                {lockUiError && (
                  <p className="mb-2 text-[11px] text-[#ff5252]">{lockUiError}</p>
                )}
                <p className="text-[11px] leading-relaxed text-[#5c6578]">
                  Locked funds earn hourly yield on the server (random between
                  0.039% and 0.05% of principal per hour). See executed trades on
                  the dashboard.
                </p>
              </div>
            ) : (
              <div data-tour="tour-lock-form" className="space-y-2 text-[11px]">
                <div className="flex justify-between font-mono text-[#c8d0e0]">
                  <span className="text-[#5c6578]">Locked</span>
                  <span>{formatUsd(activeLock.principalUsd)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#5c6578]">Accumulated yield</span>
                  <span
                    className={
                      activeLock.accumulatedYieldUsd >= 0
                        ? "text-[#00c853]"
                        : "text-[#ff5252]"
                    }
                  >
                    {formatUsd(activeLock.accumulatedYieldUsd)}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[#00e5ff]">
                  <span className="text-[#5c6578]">Time left</span>
                  <span>{formatDuration(remainingMs)}</span>
                </div>
                <p className="leading-relaxed text-[#5c6578]">
                  Yield credits to your available balance each hour while the lock
                  is active; principal returns at expiry.
                </p>
              </div>
            )}
          </section>

          <section className="rounded border border-[#1e2430] bg-[#12151c] px-4 py-4">
            <p className="text-[11px] leading-relaxed text-[#5c6578]">
              Per-trade P&amp;L and charts live on{" "}
              <Link href="/dashboard" className="text-[#00e5ff] hover:underline">
                Dashboard
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
