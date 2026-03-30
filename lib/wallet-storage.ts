import type { ActiveLiquidityLock } from "@/lib/session-trading";

const BALANCE_KEY = "oilflow_usdc_balance_v1";
const LOCK_KEY = "oilflow_liquidity_lock_v1";
const TX_KEY = "oilflow_wallet_ledger_v1";

/** One-time read from pre-rename keys; migrated on first access. */
const LEGACY_BALANCE = "polyflow_usdc_balance_v1";
const LEGACY_LOCK = "polyflow_liquidity_lock_v1";
const LEGACY_TX = "polyflow_wallet_ledger_v1";

function migrateStringKey(newKey: string, legacyKey: string): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(newKey) != null) return;
    const v = localStorage.getItem(legacyKey);
    if (v == null) return;
    localStorage.setItem(newKey, v);
    localStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}
const MAX_LEDGER = 100;

export type WalletLedgerKind =
  | "deposit"
  | "withdraw"
  | "lock_in"
  | "lock_settle";

export type WalletLedgerEntry = {
  id: string;
  time: number;
  kind: WalletLedgerKind;
  amountUsd: number;
  balanceAfter: number;
};

export function loadBalance(): number {
  if (typeof window === "undefined") return 0;
  try {
    migrateStringKey(BALANCE_KEY, LEGACY_BALANCE);
    const raw = localStorage.getItem(BALANCE_KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBalance(n: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BALANCE_KEY, String(Math.max(0, n)));
  } catch {
    /* ignore */
  }
}

export function loadLock(): ActiveLiquidityLock | null {
  if (typeof window === "undefined") return null;
  try {
    migrateStringKey(LOCK_KEY, LEGACY_LOCK);
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ActiveLiquidityLock;
    if (
      typeof p.principalUsd !== "number" ||
      typeof p.endsAt !== "number" ||
      typeof p.prevMark !== "number"
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function saveLock(lock: ActiveLiquidityLock | null): void {
  if (typeof window === "undefined") return;
  try {
    if (lock == null) localStorage.removeItem(LOCK_KEY);
    else localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  } catch {
    /* ignore */
  }
}

export function loadLedger(): WalletLedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    migrateStringKey(TX_KEY, LEGACY_TX);
    const raw = localStorage.getItem(TX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x): x is WalletLedgerEntry =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as WalletLedgerEntry).id === "string" &&
          typeof (x as WalletLedgerEntry).time === "number" &&
          typeof (x as WalletLedgerEntry).amountUsd === "number" &&
          typeof (x as WalletLedgerEntry).balanceAfter === "number"
      )
      .slice(-MAX_LEDGER);
  } catch {
    return [];
  }
}

function saveLedger(entries: WalletLedgerEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const slice = entries.slice(-MAX_LEDGER);
    localStorage.setItem(TX_KEY, JSON.stringify(slice));
  } catch {
    /* ignore */
  }
}

export function appendLedgerEntry(
  kind: WalletLedgerKind,
  amountUsd: number,
  balanceAfter: number
): void {
  const prev = loadLedger();
  const entry: WalletLedgerEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    time: Date.now(),
    kind,
    amountUsd,
    balanceAfter,
  };
  saveLedger([...prev, entry]);
}
