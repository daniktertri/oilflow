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
import {
  buildTradeRow,
  nextNotionalUsd,
  nextSide,
  pnlForMinute,
  type ActiveLiquidityLock,
} from "@/lib/session-trading";
import { fetchMarkFrom1m } from "@/lib/mark-price";
import {
  appendLedgerEntry,
  loadBalance,
  loadLedger,
  loadLock,
  saveBalance,
  saveLock,
  type WalletLedgerEntry,
} from "@/lib/wallet-storage";

type WalletCtx = {
  balance: number;
  hydrated: boolean;
  activeLock: ActiveLiquidityLock | null;
  tickNow: number;
  remainingMs: number;
  recentLedger: WalletLedgerEntry[];
  topUpUsd: (amountUsd: number) => void;
  withdrawUsd: (amountUsd: number) => { ok: true } | { ok: false; error: string };
  startLock: (params: {
    amountUsd: number;
    durationMs: number;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const WalletContext = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [activeLock, setActiveLock] = useState<ActiveLiquidityLock | null>(
    null
  );
  const [tickNow, setTickNow] = useState(Date.now());
  const [recentLedger, setRecentLedger] = useState<WalletLedgerEntry[]>([]);

  const lockRef = useRef<ActiveLiquidityLock | null>(null);
  lockRef.current = activeLock;
  const settledEndsAtRef = useRef<number | null>(null);

  const syncLedger = useCallback(() => {
    setRecentLedger(loadLedger());
  }, []);

  useEffect(() => {
    let b = loadBalance();
    const l = loadLock();
    if (l && Date.now() >= l.endsAt) {
      const returned = l.principalUsd + l.sessionPnlUsd;
      b += returned;
      saveBalance(b);
      saveLock(null);
      appendLedgerEntry("lock_settle", returned, b);
      setBalance(b);
      setActiveLock(null);
    } else {
      setBalance(b);
      if (l && Date.now() < l.endsAt) setActiveLock(l);
    }
    setRecentLedger(loadLedger());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBalance(balance);
  }, [balance, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeLock) saveLock(activeLock);
    else saveLock(null);
  }, [activeLock, hydrated]);

  useEffect(() => {
    const id = window.setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const L = lockRef.current;
    if (!L) {
      settledEndsAtRef.current = null;
      return;
    }
    if (tickNow < L.endsAt) return;
    if (settledEndsAtRef.current === L.endsAt) return;
    settledEndsAtRef.current = L.endsAt;
    const returned = L.principalUsd + L.sessionPnlUsd;
    setBalance((b) => {
      const next = b + returned;
      appendLedgerEntry("lock_settle", returned, next);
      syncLedger();
      return next;
    });
    setActiveLock(null);
    saveLock(null);
  }, [tickNow, activeLock, syncLedger]);

  const runMinuteTick = useCallback(async () => {
    const L = lockRef.current;
    if (!L) return;
    const now = Date.now();
    if (now >= L.endsAt) return;
    let mark: number;
    try {
      mark = await fetchMarkFrom1m();
    } catch {
      return;
    }
    const seq = L.trades.length + 1;
    const salt = L.startedAt / 1000 + seq * 17;
    const notional = nextNotionalUsd(L.principalUsd, salt);
    const side = nextSide(salt + 3.1);
    const { feeUsd, net } = pnlForMinute({
      side,
      prevMark: L.prevMark,
      mark,
      notionalUsd: notional,
    });
    const trade = buildTradeRow(seq, mark, side, notional, feeUsd, net);
    setActiveLock((prev) => {
      if (!prev || Date.now() >= prev.endsAt) return prev;
      return {
        ...prev,
        prevMark: mark,
        sessionPnlUsd: prev.sessionPnlUsd + net,
        trades: [trade, ...prev.trades].slice(0, 250),
      };
    });
  }, []);

  useEffect(() => {
    if (!activeLock || Date.now() >= activeLock.endsAt) return;
    const id = window.setInterval(() => {
      void runMinuteTick();
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer tied to lock session identity
  }, [activeLock?.endsAt, activeLock?.startedAt, runMinuteTick]);

  const topUpUsd = useCallback(
    (amountUsd: number) => {
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
      setBalance((b) => {
        const next = b + amountUsd;
        appendLedgerEntry("deposit", amountUsd, next);
        syncLedger();
        return next;
      });
    },
    [syncLedger]
  );

  const withdrawUsd = useCallback(
    (amountUsd: number): { ok: true } | { ok: false; error: string } => {
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        return { ok: false, error: "Enter a positive amount." };
      }
      if (amountUsd > balance) {
        return { ok: false, error: "Insufficient USDC balance." };
      }
      setBalance((b) => {
        const next = b - amountUsd;
        appendLedgerEntry("withdraw", amountUsd, next);
        syncLedger();
        return next;
      });
      return { ok: true };
    },
    [balance, syncLedger]
  );

  const startLock = useCallback(
    async (params: {
      amountUsd: number;
      durationMs: number;
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
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
        const mark = await fetchMarkFrom1m();
        const endsAt = Date.now() + durationMs;
        const next: ActiveLiquidityLock = {
          principalUsd: amountUsd,
          startedAt: Date.now(),
          endsAt,
          sessionPnlUsd: 0,
          trades: [],
          prevMark: mark,
        };
        setBalance((b) => {
          const nb = b - amountUsd;
          appendLedgerEntry("lock_in", amountUsd, nb);
          syncLedger();
          return nb;
        });
        setActiveLock(next);
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Could not start lock",
        };
      }
    },
    [balance, activeLock, syncLedger]
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
      topUpUsd,
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
      topUpUsd,
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
