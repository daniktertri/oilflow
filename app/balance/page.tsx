"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { useTelegramAuth } from "@/components/telegram-auth-provider";
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
    case "withdraw_refund":
      return "Withdraw refund";
    case "lock_in":
      return "Lock in";
    case "lock_settle":
      return "Lock settle";
    default:
      return k;
  }
}

export default function BalancePage() {
  const { user, loading: authLoading } = useTelegramAuth();
  const {
    balance,
    hydrated,
    recentLedger,
    depositPubkey,
    refreshWallet,
    withdrawUsd,
  } = useWallet();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const depositAddress = depositPubkey ?? "";
  const qrSrc = useMemo(
    () =>
      depositAddress
        ? `/api/qr?data=${encodeURIComponent(depositAddress)}`
        : "",
    [depositAddress]
  );

  const onCopy = async () => {
    if (!depositAddress) return;
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const onWithdraw = async () => {
    setWithdrawError(null);
    const n = Number(withdrawAmount);
    const dest = withdrawDest.trim();
    if (!Number.isFinite(n) || n <= 0) {
      setWithdrawError("Enter a positive amount.");
      return;
    }
    if (!dest) {
      setWithdrawError("Enter a Solana destination address.");
      return;
    }
    setWithdrawBusy(true);
    try {
      const r = await withdrawUsd(n, dest);
      if (!r.ok) {
        setWithdrawError(r.error);
        return;
      }
      setWithdrawAmount("");
      setWithdrawDest("");
      await refreshWallet();
    } finally {
      setWithdrawBusy(false);
    }
  };

  const ledgerRows = [...recentLedger].reverse();

  const showSignIn = !authLoading && !user;
  const showNoDeposit = user && hydrated && !depositAddress;

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#c8d0e0]">
      <div className="mx-auto max-w-3xl px-3 py-6">
        <h1 className="mb-1 font-mono text-[13px] uppercase tracking-wider text-[#ffc107]">
          Balance
        </h1>
        <p className="mb-6 text-[10px] text-[#5c6578]">
          USDC on Solana (SPL). Deposits are credited after the custody worker
          confirms your on-chain transfer. Withdrawals are sent from the treasury
          wallet after you request them.
        </p>

        {showSignIn && (
          <p className="mb-6 rounded border border-[#2a3140] bg-[#12151c] p-3 text-[10px] text-[#5c6578]">
            Sign in with Telegram to see your deposit address and balance.
          </p>
        )}

        <section
          data-tour="tour-balance-available"
          className="mb-6 rounded border border-[#1e2430] bg-[#12151c] p-4"
        >
          <div className="mb-2 text-[10px] uppercase tracking-wider text-[#5c6578]">
            Available
          </div>
          <div className="font-mono text-xl text-[#c8d0e0]">
            {!user || !hydrated ? "—" : formatUsd(balance)}
          </div>
        </section>

        <section
          data-tour="tour-balance-deposit"
          className="mb-6 rounded border border-[#1e2430] bg-[#12151c] p-4"
        >
          <h2 className="mb-3 text-[10px] uppercase tracking-wider text-[#5c6578]">
            Deposit (Solana · USDC)
          </h2>
          {showNoDeposit ? (
            <p className="text-[10px] leading-relaxed text-[#5c6578]">
              Your personal deposit address is not ready yet. Run the custody
              worker on your VPS (see{" "}
              <code className="text-[#5c6578]">scripts/solana-custody</code>) so
              it can provision wallets in the database.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded bg-white p-3">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt=""
                    width={160}
                    height={160}
                    className="block h-[160px] w-[160px]"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-[160px] w-[160px] items-center justify-center bg-[#eee] text-[10px] text-[#666]">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-[10px] text-[#5c6578]">
                  Your deposit address
                </label>
                <div className="mb-2 break-all font-mono text-[11px] leading-relaxed text-[#e0e0e0]">
                  {depositAddress || "—"}
                </div>
                <button
                  type="button"
                  onClick={() => void onCopy()}
                  disabled={!depositAddress}
                  className="border border-[#2a3140] px-3 py-1.5 text-[10px] font-mono uppercase text-[#00e5ff] hover:border-[#00e5ff] disabled:opacity-40"
                >
                  {copied ? "Copied" : "Copy address"}
                </button>
                <p className="mt-3 text-[10px] leading-relaxed text-[#5c6578]">
                  Send only USDC (SPL) on Solana to this address. Other assets may
                  be lost.
                </p>
              </div>
            </div>
          )}
        </section>

        <section
          data-tour="tour-balance-actions"
          className="mb-6 rounded border border-[#1e2430] bg-[#12151c] p-4"
        >
          <h2 className="mb-3 text-[10px] uppercase tracking-wider text-[#5c6578]">
            Withdraw (on-chain)
          </h2>
          <p className="mb-3 text-[10px] leading-relaxed text-[#5c6578]">
            Request a transfer from the app treasury to your Solana wallet. Amount
            is deducted from your available balance; the VPS worker signs and
            sends USDC.
          </p>
          <div className="flex flex-col gap-2 sm:max-w-md">
            <input
              type="text"
              placeholder="Destination Solana address"
              className="w-full border border-[#2a3140] bg-[#0c0e12] px-2 py-1.5 font-mono text-[10px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
              value={withdrawDest}
              onChange={(e) => setWithdrawDest(e.target.value)}
              disabled={!user}
            />
            <div className="flex gap-1">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount (USDC)"
                className="min-w-0 flex-1 border border-[#2a3140] bg-[#0c0e12] px-2 py-1.5 font-mono text-[10px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!user}
              />
              <button
                type="button"
                onClick={() => void onWithdraw()}
                disabled={!user || withdrawBusy}
                className="border border-[#2a3140] px-2 py-1.5 text-[10px] font-mono uppercase text-[#ff5252] hover:border-[#ff5252] disabled:opacity-40"
              >
                {withdrawBusy ? "…" : "Withdraw"}
              </button>
            </div>
          </div>
          {withdrawError && (
            <p className="mt-2 text-[10px] text-[#ff5252]">{withdrawError}</p>
          )}
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
                    row.kind === "withdraw" ||
                    row.kind === "lock_in" ||
                    row.kind === "withdraw_refund"
                      ? row.kind === "withdraw_refund"
                        ? "text-[#00c853]"
                        : "text-[#ff8a80]"
                      : "text-[#00c853]"
                  }`}
                >
                  {row.kind === "withdraw" || row.kind === "lock_in"
                    ? "−"
                    : "+"}
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
