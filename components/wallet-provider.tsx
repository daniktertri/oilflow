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
  activeLock: ActiveLiquidityLock | null;
  tickNow: number;
  remainingMs: number;
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
  const [activeLock, setActiveLock] = useState<ActiveLiquidityLock | null>(
    null
  );
  const [tickNow, setTickNow] = useState(Date.now());
  const [recentLedger, setRecentLedger] = useState<WalletLedgerEntry[]>([]);
  const [depositPubkey, setDepositPubkey] = useState<string | null>(null);

  const lockRef = useRef<ActiveLiquidityLock | null>(null);
  lockRef.current = activeLock;
  const settledEndsAtRef = useRef<number | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!user?.id) {
      setBalance(0);
      setRecentLedger([]);
      setDepositPubkey(null);
      setActiveLock(null);
      return;
    }
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        usdcAvailable: number;
        activeLock: ApiActiveLock | null;
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
      if (data.activeLock) {
        setActiveLock(mapActiveLock(data.activeLock));
      } else {
        setActiveLock(null);
      }
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

  const settleLockOnServer = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/wallet/lock-settle", {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        balanceAfter?: number;
        error?: string;
      };
      if (!res.ok) {
        console.error("[wallet] lock-settle", data.error);
        settledEndsAtRef.current = null;
        return;
      }
      if (typeof data.balanceAfter === "number") {
        setBalance(data.balanceAfter);
      }
      await refreshWallet();
      setActiveLock(null);
      saveLock(null);
    } catch (e) {
      console.error("[wallet] lock-settle", e);
      settledEndsAtRef.current = null;
    }
  }, [user?.id, refreshWallet]);

  useEffect(() => {
    if (!user?.id || !hydrated) return;
    const L = lockRef.current;
    if (!L) {
      settledEndsAtRef.current = null;
      return;
    }
    if (tickNow < L.endsAt) return;
    if (settledEndsAtRef.current === L.endsAt) return;
    settledEndsAtRef.current = L.endsAt;
    void settleLockOnServer();
  }, [tickNow, activeLock, user?.id, hydrated, settleLockOnServer]);

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
      if (activeLock) {
        return { ok: false, error: "A liquidity lock is already active." };
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
        if (lockData.lock) {
          setActiveLock(mapActiveLock(lockData.lock));
        } else {
          await refreshWallet();
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
    [user?.id, balance, activeLock, refreshWallet]
  );

  const remainingMs = activeLock
    ? Math.max(0, activeLock.endsAt - tickNow)
    : 0;

  const value = useMemo(
    () => ({
      balance,
      hydrated,
      activeLock,
      tickNow,
      remainingMs,
      recentLedger,
      depositPubkey,
      refreshWallet,
      withdrawUsd,
      startLock,
    }),
    [
      balance,
      hydrated,
      activeLock,
      tickNow,
      remainingMs,
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
