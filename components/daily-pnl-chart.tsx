"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DailyPnlRow } from "@/lib/pnl-history";

function formatUsdCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  rows: DailyPnlRow[];
  /** Optional extra P&L to show for today (open session), not in rows yet */
  todayOpenSessionPnlUsd?: number;
};

/** SVG daily P&L bars — positive green, negative red. */
export function DailyPnlChart({ rows, todayOpenSessionPnlUsd = 0 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 320 });
  const rawId = useId();
  const gradPos = `pnl-pos-${rawId.replace(/:/g, "")}`;
  const gradNeg = `pnl-neg-${rawId.replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(260, Math.min(440, Math.floor(r.height) || 320));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const data = useMemo(() => {
    const today = new Date();
    const tk = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    const merged = rows.map((r) => ({ ...r }));
    const ti = merged.findIndex((r) => r.date === tk);
    if (todayOpenSessionPnlUsd !== 0) {
      if (ti >= 0)
        merged[ti] = {
          date: merged[ti]!.date,
          pnlUsd: merged[ti]!.pnlUsd + todayOpenSessionPnlUsd,
        };
      else merged.push({ date: tk, pnlUsd: todayOpenSessionPnlUsd });
    }
    merged.sort((a, b) => a.date.localeCompare(b.date));
    const tail = merged.slice(-45);
    return tail;
  }, [rows, todayOpenSessionPnlUsd]);

  const layout = useMemo(() => {
    if (data.length === 0) return null;
    const margin = { top: 12, right: 12, bottom: 40, left: 52 };
    const innerW = size.w - margin.left - margin.right;
    const innerH = size.h - margin.top - margin.bottom;
    const vals = data.map((d) => d.pnlUsd);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const pad = Math.max((hi - lo) * 0.08, 1);
    const yMin = lo - pad;
    const yMax = hi + pad;
    const zeroY = margin.top + ((yMax - 0) / (yMax - yMin)) * innerH;
    const scaleY = (v: number) =>
      margin.top + ((yMax - v) / (yMax - yMin)) * innerH;
    const n = data.length;
    const barGap = 2;
    const barW = Math.max(2, (innerW - barGap * (n + 1)) / n);
    const bars = data.map((d, i) => {
      const x = margin.left + barGap + i * (barW + barGap);
      const top = Math.min(scaleY(d.pnlUsd), zeroY);
      const bot = Math.max(scaleY(d.pnlUsd), zeroY);
      const h = Math.max(bot - top, 1);
      return {
        x,
        y: top,
        w: barW,
        h,
        fill: d.pnlUsd >= 0 ? `url(#${gradPos})` : `url(#${gradNeg})`,
        label: d.date.slice(5),
      };
    });
    const ticks: { y: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const v = yMin + (i / 4) * (yMax - yMin);
      ticks.push({ y: scaleY(v), label: formatUsdCompact(v) });
    }
    return { margin, innerW, innerH, zeroY, bars, ticks, yMin, yMax };
  }, [data, size, gradPos, gradNeg]);

  if (data.length === 0 || !layout) {
    return (
      <div
        ref={wrapRef}
        className="flex min-h-[260px] items-center justify-center font-mono text-[12px] text-[#5c6578]"
      >
        No daily P&L yet — completed lock sessions will appear here.
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="min-h-[260px] w-full">
      <svg
        width={size.w}
        height={size.h}
        className="block max-w-full"
        role="img"
        aria-label="Daily P and L bar chart"
      >
        <defs>
          <linearGradient id={gradPos} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c853" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#00c853" stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id={gradNeg} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5252" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#ff5252" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        {layout.ticks.map((t) => (
          <g key={t.label}>
            <line
              x1={layout.margin.left}
              x2={size.w - layout.margin.right}
              y1={t.y}
              y2={t.y}
              stroke="#1e2430"
              strokeDasharray="4 4"
            />
            <text
              x={layout.margin.left - 6}
              y={t.y + 4}
              textAnchor="end"
              className="fill-[#5c6578] font-mono text-[10px]"
            >
              {t.label}
            </text>
          </g>
        ))}
        <line
          x1={layout.margin.left}
          x2={size.w - layout.margin.right}
          y1={layout.zeroY}
          y2={layout.zeroY}
          stroke="#5c6578"
          strokeOpacity={0.5}
        />
        {layout.bars.map((b, i) => (
          <rect
            key={data[i]!.date}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill={b.fill}
            rx={1}
          />
        ))}
        {layout.bars.map((b, i) =>
          i % Math.max(1, Math.ceil(data.length / 8)) === 0 ||
          i === data.length - 1 ? (
            <text
              key={`xl-${data[i]!.date}`}
              x={b.x + b.w / 2}
              y={size.h - 10}
              textAnchor="middle"
              className="fill-[#5c6578] font-mono text-[9px]"
            >
              {b.label}
            </text>
          ) : null
        )}
      </svg>
      {todayOpenSessionPnlUsd !== 0 ? (
        <p className="mt-1 text-[10px] text-[#5c6578]">
          Today&apos;s bar includes open session P&L (unrealized until the lock
          settles).
        </p>
      ) : null}
    </div>
  );
}
