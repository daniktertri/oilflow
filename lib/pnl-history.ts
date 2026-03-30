const KEY = "oilflow_daily_pnl_v1";

export type DailyPnlRow = {
  date: string;
  /** Realized session P&L (USDC) for completed locks on this calendar day (local) */
  pnlUsd: number;
};

function dayKeyFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadDailyPnl(): DailyPnlRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x): x is DailyPnlRow =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as DailyPnlRow).date === "string" &&
          typeof (x as DailyPnlRow).pnlUsd === "number"
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function saveDailyPnl(rows: DailyPnlRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** Call when a liquidity lock settles — adds session P&L to that calendar day. */
export function addSessionPnlToDay(ts: number, sessionPnlUsd: number): void {
  if (!Number.isFinite(sessionPnlUsd) || sessionPnlUsd === 0) return;
  const date = dayKeyFromTs(ts);
  const rows = loadDailyPnl();
  const idx = rows.findIndex((r) => r.date === date);
  if (idx >= 0) rows[idx] = { ...rows[idx]!, pnlUsd: rows[idx]!.pnlUsd + sessionPnlUsd };
  else rows.push({ date, pnlUsd: sessionPnlUsd });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  saveDailyPnl(rows);
}

export function sumRealizedPnl(rows: DailyPnlRow[]): number {
  return rows.reduce((s, r) => s + r.pnlUsd, 0);
}
