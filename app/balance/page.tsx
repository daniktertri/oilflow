"use client";

import { useEffect, useMemo, useState } from "react";
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

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded border border-[#1e2430] bg-[#12151c] p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="balance-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="balance-modal-title"
            className="font-mono text-[11px] uppercase tracking-wider text-[#ffc107]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 border border-[#2a3140] px-2 py-0.5 font-mono text-[12px] leading-none text-[#5c6578] hover:border-[#5c6578] hover:text-[#c8d0e0]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
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
      setWithdrawOpen(false);
      await refreshWallet();
    } finally {
      setWithdrawBusy(false);
    }
  };

  const setMaxWithdraw = () => {
    if (!Number.isFinite(balance) || balance <= 0) {
      setWithdrawAmount("");
      return;
    }
    setWithdrawAmount(balance.toFixed(2));
  };

  const ledgerRows = [...recentLedger].reverse();

  const showSignIn = !authLoading && !user;
  const showNoDeposit = Boolean(user && hydrated && !depositAddress);
  const topUpLoadingWallet = Boolean(user && !hydrated);
  const actionsDisabled = !user;

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

        <div
          data-tour="tour-balance-actions"
          className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <button
            type="button"
            data-tour="tour-balance-deposit"
            disabled={actionsDisabled}
            onClick={() => setTopUpOpen(true)}
            className="rounded border-2 border-[#00e5ff]/40 bg-[#0a1620] px-4 py-5 text-center font-mono text-[13px] uppercase tracking-wide text-[#00e5ff] transition hover:border-[#00e5ff] hover:bg-[#0c1a24] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Top up
          </button>
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() => {
              setWithdrawError(null);
              setWithdrawOpen(true);
            }}
            className="rounded border-2 border-[#ff5252]/40 bg-[#1a0c0c] px-4 py-5 text-center font-mono text-[13px] uppercase tracking-wide text-[#ff8a80] transition hover:border-[#ff5252] hover:bg-[#221010] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Withdraw
          </button>
        </div>

        <Modal
          open={topUpOpen}
          title="Top up — Solana USDC"
          onClose={() => setTopUpOpen(false)}
        >
          {topUpLoadingWallet ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div
                className="h-10 w-10 rounded-full border-2 border-[#2a3140] border-t-[#ffc107] animate-spin"
                aria-hidden
              />
              <p className="text-[10px] text-[#5c6578]">Loading wallet…</p>
            </div>
          ) : showNoDeposit ? (
            <div className="flex flex-col items-center gap-5 py-2 text-center">
              <div
                className="h-12 w-12 rounded-full border-2 border-[#2a3140] border-t-[#00e5ff] animate-spin"
                aria-hidden
              />
              <div>
                <p className="mb-2 font-mono text-[11px] text-[#c8d0e0]">
                  Generating your deposit address…
                </p>
                <p className="text-[10px] leading-relaxed text-[#5c6578]">
                  This can take a minute while the custody worker provisions your
                  wallet. You can close this dialog and come back shortly, or
                  refresh the page.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded bg-white p-3">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt=""
                    width={176}
                    height={176}
                    className="block h-[176px] w-[176px]"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-[176px] w-[176px] items-center justify-center bg-[#eee] text-[10px] text-[#666]">
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
        </Modal>

        <Modal
          open={withdrawOpen}
          title="Withdraw on-chain"
          onClose={() => !withdrawBusy && setWithdrawOpen(false)}
        >
          <p className="mb-4 text-[10px] leading-relaxed text-[#5c6578]">
            Request a transfer from the app treasury to your Solana wallet. The
            amount is deducted from your available balance; the custody worker
            signs and sends USDC.
          </p>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#5c6578]">
              Available to withdraw
            </span>
            <span className="font-mono text-[12px] text-[#c8d0e0]">
              {!user || !hydrated ? "—" : formatUsd(balance)}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Destination Solana address"
              className="w-full border border-[#2a3140] bg-[#0c0e12] px-2 py-2 font-mono text-[10px] text-[#c8d0e0] outline-none focus:border-[#ffc107]"
              value={withdrawDest}
              onChange={(e) => setWithdrawDest(e.target.value)}
              disabled={!user || withdrawBusy}
              autoComplete="off"
            />
            <div className="flex flex-wrap items-stretch gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="Amount (USDC)"
                className="min-w-0 flex-1 border border-[#2a3140] bg-[#0c0e12] px-2 py-2 font-mono text-[10px] text-[#c8d0e0] outline-none [appearance:textfield] focus:border-[#ffc107] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!user || withdrawBusy}
              />
              <button
                type="button"
                onClick={setMaxWithdraw}
                disabled={
                  !user || withdrawBusy || !hydrated || balance <= 0
                }
                className="shrink-0 border border-[#2a3140] px-3 py-2 text-[10px] font-mono uppercase text-[#ffc107] hover:border-[#ffc107] disabled:opacity-40"
              >
                Max
              </button>
            </div>
            <button
              type="button"
              onClick={() => void onWithdraw()}
              disabled={!user || withdrawBusy}
              className="border border-[#ff5252]/60 bg-[#1a0c0c] py-2.5 text-[11px] font-mono uppercase text-[#ff8a80] hover:border-[#ff5252] disabled:opacity-40"
            >
              {withdrawBusy ? "Submitting…" : "Confirm withdrawal"}
            </button>
          </div>
          {withdrawError && (
            <p className="mt-3 text-[10px] text-[#ff5252]">{withdrawError}</p>
          )}
        </Modal>

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
