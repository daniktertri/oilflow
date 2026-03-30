export type TradeSide = "long" | "short";

export type ExecutedTrade = {
  id: string;
  time: number;
  side: TradeSide;
  price: number;
  notionalUsd: number;
  feeUsd: number;
  pnlUsd: number;
};

/** Client-side mirror of server `liquidity_locks` + hourly yield. */
export type ActiveLiquidityLock = {
  lockId: string;
  principalUsd: number;
  startedAt: number;
  endsAt: number;
  accumulatedYieldUsd: number;
};

const FEE_BPS = 3.5;

function frac01(x: number): number {
  const u = Math.abs(Math.sin(x) * 43758.5453123);
  return u - Math.floor(u);
}

/** Notional as fraction of locked principal (2%–10%). */
export function nextNotionalUsd(lockedUsd: number, salt: number): number {
  const r = frac01(salt * 12.9898);
  const frac = 0.02 + r * 0.08;
  return Math.min(lockedUsd * frac, lockedUsd * 0.12);
}

export function nextSide(salt: number): TradeSide {
  return frac01(salt * 7.13) > 0.5 ? "long" : "short";
}

export function pnlForMinute(params: {
  side: TradeSide;
  prevMark: number;
  mark: number;
  notionalUsd: number;
}): { gross: number; feeUsd: number; net: number } {
  const { side, prevMark, mark, notionalUsd } = params;
  if (prevMark <= 0 || mark <= 0) {
    return { gross: 0, feeUsd: 0, net: 0 };
  }
  const gross =
    side === "long"
      ? notionalUsd * (mark - prevMark) / prevMark
      : notionalUsd * (prevMark - mark) / prevMark;
  const feeUsd = (notionalUsd * FEE_BPS) / 10_000;
  return { gross, feeUsd, net: gross - feeUsd };
}

export function buildTradeRow(
  seq: number,
  mark: number,
  side: TradeSide,
  notionalUsd: number,
  feeUsd: number,
  pnlUsd: number
): ExecutedTrade {
  return {
    id: `${Date.now()}-${seq}`,
    time: Date.now(),
    side,
    price: mark,
    notionalUsd,
    feeUsd,
    pnlUsd,
  };
}
