"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActiveLiquidityLock } from "@/lib/session-trading";
import { loadLock, saveLock, type WalletLedgerEntry } from "@/lib/wallet-storage";
import { useTelegramAuth } from "@/components/telegram-auth-provider";

type WalletCtx = {
  balance: number;
  hydrated: boolean;
  /** All active liquidity locks (server). */
  activeLocks: ActiveLiquidityLock[];
  /** Sum of principal still locked across positions. */
  totalLockedPrincipalUsd: number;
  /** Milliseconds until the soonest lock ends (0 if none). */
  remainingMs: number;
  tickNow: number;
  recentLedger: WalletLedgerEntry[];
  depositPubkey: string | null;
  refreshWallet: () => Promise<void>;
  withdrawUsd: (
    amountUsd: number,
    destinationPubkey: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  startLock: (params: {
    amountUsd: number;
    durationMs: number;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const WalletContext = createContext<WalletCtx | null>(null);

function mapServerLedger(
  rows: {
    id: string;
    kind: string;
    amount: number;
    balanceAfter: number;
    createdAt: string;
  }[]
): WalletLedgerEntry[] {
  return rows.map((row) => ({
    id: row.id,
    time: new Date(row.createdAt).getTime(),
    kind: row.kind as WalletLedgerEntry["kind"],
    amountUsd: row.amount,
    balanceAfter: row.balanceAfter,
  }));
}

type ApiActiveLock = {
  id: string;
  principalUsd: number;
  accumulatedYieldUsd: number;
  startedAt: string;
  endsAt: string;
};

function mapActiveLock(api: ApiActiveLock): ActiveLiquidityLock {
  return {
    lockId: api.id,
    principalUsd: api.principalUsd,
    startedAt: new Date(api.startedAt).getTime(),
    endsAt: new Date(api.endsAt).getTime(),
    accumulatedYieldUsd: api.accumulatedYieldUsd,
  };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useTelegramAuth();
  const [balance, setBalance] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [activeLocks, setActiveLocks] = useState<ActiveLiquidityLock[]>([]);
  const [tickNow, setTickNow] = useState(Date.now());
  const [recentLedger, setRecentLedger] = useState<WalletLedgerEntry[]>([]);
  const [depositPubkey, setDepositPubkey] = useState<string | null>(null);

  const settleInFlight = useRef(false);

  const totalLockedPrincipalUsd = useMemo(
    () => activeLocks.reduce((s, l) => s + l.principalUsd, 0),
    [activeLocks]
  );

  const remainingMs = useMemo(() => {
    if (activeLocks.length === 0) return 0;
    const soonest = Math.min(...activeLocks.map((l) => l.endsAt));
    return Math.max(0, soonest - tickNow);
  }, [activeLocks, tickNow]);

  const refreshWallet = useCallback(async () => {
    if (!user?.id) {
      setBalance(0);
      setRecentLedger([]);
      setDepositPubkey(null);
      setActiveLocks([]);
      return;
    }
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        usdcAvailable: number;
        activeLocks: ApiActiveLock[];
        ledger: {
          id: string;
          kind: string;
          amount: number;
          balanceAfter: number;
          createdAt: string;
        }[];
        depositPubkey: string | null;
      };
      setBalance(data.usdcAvailable);
      setRecentLedger(mapServerLedger(data.ledger));
      setDepositPubkey(data.depositPubkey);
      setActiveLocks((data.activeLocks ?? []).map(mapActiveLock));
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    void (async () => {
      if (!user?.id) {
        setHydrated(true);
        return;
      }
      saveLock(null);
      loadLock();
      await refreshWallet();
      setHydrated(true);
    })();
  }, [user?.id, refreshWallet]);

  useEffect(() => {
    if (!user?.id) return;
    const id = window.setInterval(() => {
      void refreshWallet();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [user?.id, refreshWallet]);

  useEffect(() => {
    const id = window.setInterval(() => setTickNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const settleExpiredLocksOnServer = useCallback(async () => {
    if (!user?.id) return;
    if (settleInFlight.current) return;
    settleInFlight.current = true;
    try {
      const res = await fetch("/api/wallet/lock-settle", {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        balanceAfter?: number;
        settledCount?: number;
        error?: string;
      };
      if (!res.ok) {
        console.error("[wallet] lock-settle", data.error);
        return;
      }
      if (typeof data.balanceAfter === "number") {
        setBalance(data.balanceAfter);
      }
      await refreshWallet();
      saveLock(null);
    } catch (e) {
      console.error("[wallet] lock-settle", e);
    } finally {
      settleInFlight.current = false;
    }
  }, [user?.id, refreshWallet]);

  useEffect(() => {
    if (!user?.id || !hydrated) return;
    const hasExpired = activeLocks.some((L) => tickNow >= L.endsAt);
    if (!hasExpired) return;
    void settleExpiredLocksOnServer();
  }, [tickNow, activeLocks, user?.id, hydrated, settleExpiredLocksOnServer]);

  const withdrawUsd = useCallback(
    async (
      amountUsd: number,
      destinationPubkey: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user?.id) {
        return { ok: false, error: "Sign in required." };
      }
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        return { ok: false, error: "Enter a positive amount." };
      }
      try {
        const res = await fetch("/api/wallet/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountUsd, destinationPubkey }),
        });
        const data = (await res.json()) as { error?: string; balanceAfter?: number };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Withdrawal failed." };
        }
        if (typeof data.balanceAfter === "number") {
          setBalance(data.balanceAfter);
        }
        await refreshWallet();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Withdrawal failed.",
        };
      }
    },
    [user?.id, refreshWallet]
  );

  const startLock = useCallback(
    async (params: {
      amountUsd: number;
      durationMs: number;
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user?.id) {
        return { ok: false, error: "Sign in with Telegram first." };
      }
      const { amountUsd, durationMs } = params;
      if (!Number.isFinite(amountUsd) || amountUsd < 10) {
        return { ok: false, error: "Minimum lock is $10." };
      }
      if (amountUsd > balance) {
        return { ok: false, error: "Insufficient USDC balance." };
      }
      try {
        const lockRes = await fetch("/api/wallet/lock-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountUsd, durationMs }),
        });
        const lockData = (await lockRes.json()) as {
          error?: string;
          balanceAfter?: number;
          lock?: ApiActiveLock;
        };
        if (!lockRes.ok) {
          return { ok: false, error: lockData.error ?? "Could not lock funds." };
        }
        if (typeof lockData.balanceAfter === "number") {
          setBalance(lockData.balanceAfter);
        }
        await refreshWallet();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Could not start lock",
        };
      }
    },
    [user?.id, balance, refreshWallet]
  );

  const value = useMemo(
    () => ({
      balance,
      hydrated,
      activeLocks,
      totalLockedPrincipalUsd,
      remainingMs,
      tickNow,
      recentLedger,
      depositPubkey,
      refreshWallet,
      withdrawUsd,
      startLock,
    }),
    [
      balance,
      hydrated,
      activeLocks,
      totalLockedPrincipalUsd,
      remainingMs,
      tickNow,
      recentLedger,
      depositPubkey,
      refreshWallet,
      withdrawUsd,
      startLock,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const v = useContext(WalletContext);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
