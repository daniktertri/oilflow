"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { getSolUsdcDepositAddress } from "@/lib/deposit-config";
import type { WalletLedgerEntry } from "@/lib/wallet-storage";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function kindLabel(k: WalletLedgerEntry["kind"]): string {
  switch (k) {
    case "deposit":
      return "Deposit";
    case "withdraw":
      return "Withdraw";
    case "lock_in":
      return "Lock in";
    case "lock_settle":
      return "Lock settle";
    default:
      return k;
  }
}

export default function BalancePage() {
  const {
    balance,
    hydrated,
    topUpUsd,
    withdrawUsd,
    recentLedger,
  } = useWallet();
  const [topUp, setTopUp] = useState("");
  const [withdraw, setWithdraw] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const depositAddress = useMemo(() => getSolUsdcDepositAddress(), []);
  const qrSrc = useMemo(
    () => `/api/qr?data=${encodeURIComponent(depositAddress)}`,
    [depositAddress]
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const onTopUp = () => {
    const n = Number(topUp);
    if (!Number.isFinite(n) || n <= 0) return;
    topUpUsd(n);
    setTopUp("");
  };

  const onWithdraw = () => {
    setWithdrawError(null);
    const n = Number(withdraw);
    const r = withdrawUsd(n);
    if (!r.ok) {
      setWithdrawError(r.error);
      return;
    }
    setWithdraw("");
  };

  const ledgerRows = [...recentLedger].reverse();

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#c8d0e0]">
      <div className="mx-auto max-w-3xl px-3 py-6">
        <h1 className="mb-1 font-mono text-[13px] uppercase tracking-wider text-[#ffc107]">
          Balance
        </h1>
        <p className="mb-6 text-[10px] text-[#5c6578]">
          USDC on Solana (SPL). Send USDC to the address below, then record a
          simulated credit here until on-chain sync is wired.
        </p>

        <section
          data-tour="tour-balance-available"
          className="mb-6 rounded border border-[#1e2430] bg-[#12151c] p-4"
        >
          <div className="mb-2 text-[10px] uppercase tracking-wider text-[#5c6578]">
            Available
          </div>
          <div className="font-mono text-xl text-[#c8d0e0]">
            {hydrated ? formatUsd(balance) : "—"}
          </div>
        </section>

        <section
          data-tour="tour-balance-deposit"
          className="mb-6 rounded border border-[#1e2430] bg-[#12151c] p-4"
        >
          <h2 className="mb-3 text-[10px] uppercase tracking-wider text-[#5c6578]">
            Deposit (Solana · USDC)
          </h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="rounded bg-white p-3">
              <img
                src={qrSrc}
                alt=""
                width={160}
                height={160}
                className="block h-[160px] w-[160px]"
                decoding="async"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[10px] text-[#5c6578]">
                Deposit address
              </label>
              <div className="mb-2 break-all font-mono text-[11px] leading-relaxed text-[#e0e0e0]">
                {depositAddress}
              </div>
              <button
                type="button"
                onClick={() => void onCopy()}
                className="border border-[#2a3140] px-3 py-1.5 text-[10px] font-mono uppercase text-[#00e5ff] hover:border-[#00e5ff]"
              >
                {copied ? "Copied" : "Copy address"}
              </button>
              <p className="mt-3 text-[10px] leading-relaxed text-[#5c6578]">
                Set{" "}
                <code className="text-[#5c6578]">
                  NEXT_PUBLIC_SOL_USDC_DEPOSIT_ADDRESS
                </code>{" "}
                in <code className="text-[#5c6578]">.env.local</code> for your
                production vault.
              </p>
            </div>
          </div>
        </section>

        <section
          data-tour="tour-balance-actions"
          className="mb-6 grid gap-4 sm:grid-cols-2"
        >
          <div className="rounded border border-[#1e2430] bg-[#12151c] p-4">
            <h2 className="mb-3 text-[10px] uppercase tracking-wider text-[#5c6578]">
              Top-up (simulated)
            </h2>
            <div className="flex gap-1">
              <input
                type="number"
                min={1}
                step={1}
                placeholder="Amount (USDC)"
                className="min-w-0 flex-1 border border-[#2a3140] bg-[#0c0e12] px-2 py-1.5 font-mono text-[10px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value)}
              />
              <button
                type="button"
                onClick={onTopUp}
                className="border border-[#2a3140] px-2 py-1.5 text-[10px] font-mono uppercase text-[#ffc107] hover:border-[#ffc107]"
              >
                Add
              </button>
            </div>
            <p className="mt-2 text-[10px] text-[#5c6578]">
              Credits your in-app balance after you send on-chain (demo).
            </p>
          </div>
          <div className="rounded border border-[#1e2430] bg-[#12151c] p-4">
            <h2 className="mb-3 text-[10px] uppercase tracking-wider text-[#5c6578]">
              Withdraw (simulated)
            </h2>
            <div className="flex gap-1">
              <input
                type="number"
                min={1}
                step={1}
                placeholder="Amount (USDC)"
                className="min-w-0 flex-1 border border-[#2a3140] bg-[#0c0e12] px-2 py-1.5 font-mono text-[10px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
                value={withdraw}
                onChange={(e) => setWithdraw(e.target.value)}
              />
              <button
                type="button"
                onClick={onWithdraw}
                className="border border-[#2a3140] px-2 py-1.5 text-[10px] font-mono uppercase text-[#ff5252] hover:border-[#ff5252]"
              >
                Withdraw
              </button>
            </div>
            {withdrawError && (
              <p className="mt-2 text-[10px] text-[#ff5252]">{withdrawError}</p>
            )}
          </div>
        </section>

        <section
          data-tour="tour-balance-ledger"
          className="rounded border border-[#1e2430] bg-[#12151c]"
        >
          <div className="border-b border-[#1e2430] px-4 py-2 text-[10px] uppercase tracking-wider text-[#5c6578]">
            Recent transactions
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 border-b border-[#1e2430] px-4 py-1.5 font-mono text-[10px] text-[#5c6578]">
              <span>TIME</span>
              <span>KIND</span>
              <span className="text-right">AMOUNT</span>
              <span className="text-right">BAL AFTER</span>
            </div>
            {ledgerRows.length === 0 && (
              <p className="px-4 py-6 text-center text-[10px] text-[#5c6578]">
                No ledger entries yet.
              </p>
            )}
            {ledgerRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 border-b border-[#1a1f28] px-4 py-1.5 font-mono text-[10px]"
              >
                <span className="text-[#5c6578]">{formatTime(row.time)}</span>
                <span>{kindLabel(row.kind)}</span>
                <span
                  className={`text-right ${
                    row.kind === "withdraw" || row.kind === "lock_in"
                      ? "text-[#ff8a80]"
                      : "text-[#00c853]"
                  }`}
                >
                  {row.kind === "withdraw" || row.kind === "lock_in" ? "−" : "+"}
                  {formatUsd(row.amountUsd)}
                </span>
                <span className="text-right text-[#c8d0e0]">
                  {formatUsd(row.balanceAfter)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
