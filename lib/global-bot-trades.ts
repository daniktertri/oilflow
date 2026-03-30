/** Deterministic “global bot” fills derived from candle series (prices & times). */

export type GlobalBotTrade = {
  id: string;
  time: number;
  side: "long" | "short";
  price: number;
  notionalUsd: number;
};

type Point = { t: number; price: number };

function hashSeed(points: Point[]): number {
  let h = 2166136261;
  const mix = (n: number) => {
    h ^= n;
    h = Math.imul(h, 16777619);
  };
  for (let i = 0; i < points.length; i++) {
    mix(points[i].t | 0);
    mix((points[i].price * 1e6) | 0);
  }
  mix(points.length);
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a feed of bot executions tied to the visible candle path (segment prices,
 * segment times). Stable for the same `points` array.
 */
export function synthesizeGlobalBotTrades(
  points: Point[],
  opts?: { count?: number; dayVolUsd?: number | null }
): GlobalBotTrade[] {
  const count = Math.min(48, Math.max(12, opts?.count ?? 28));
  const vol = opts?.dayVolUsd;
  const scaleNotional =
    vol != null && Number.isFinite(vol) && vol > 0
      ? Math.min(2.5, Math.max(0.35, vol / 8e8))
      : 1;

  if (points.length >= 2) {
    const rand = mulberry32(hashSeed(points));
    const out: GlobalBotTrade[] = [];
    for (let k = 0; k < count; k++) {
      const bias = Math.pow(rand(), 0.85);
      const seg = Math.min(
        points.length - 2,
        Math.floor(bias * (points.length - 1))
      );
      const a = points[seg];
      const b = points[seg + 1];
      const u = rand();
      const time = Math.round(a.t + u * (b.t - a.t));
      const base = a.price + u * (b.price - a.price);
      const wiggle = (rand() - 0.5) * 0.0012 * base;
      const price = Math.max(0.01, base + wiggle);
      const delta = b.price - a.price;
      const trend = delta >= 0 ? 1 : -1;
      const longBias = 0.42 + trend * 0.18;
      const side: "long" | "short" = rand() < longBias ? "long" : "short";
      const mag = 35_000 + rand() * 920_000;
      const notionalUsd = Math.round(mag * scaleNotional);
      out.push({
        id: `gb-${time}-${k}-${seg}`,
        time,
        side,
        price,
        notionalUsd,
      });
    }
    out.sort((x, y) => y.time - x.time);
    return out;
  }

  if (points.length === 1) {
    const p = points[0].price;
    const t0 = points[0].t;
    const rand = mulberry32(hashSeed(points));
    const out: GlobalBotTrade[] = [];
    for (let k = 0; k < Math.min(16, count); k++) {
      const time = t0 - k * (45_000 + Math.floor(rand() * 90_000));
      const price = p * (1 + (rand() - 0.5) * 0.0015);
      const side: "long" | "short" = rand() > 0.5 ? "long" : "short";
      const notionalUsd = Math.round((40_000 + rand() * 600_000) * scaleNotional);
      out.push({
        id: `gb-${time}-${k}`,
        time,
        side,
        price,
        notionalUsd,
      });
    }
    out.sort((x, y) => y.time - x.time);
    return out;
  }

  return [];
}
