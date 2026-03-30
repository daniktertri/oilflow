"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";

export type PriceChartRow = {
  t: string;
  price: number;
};

function formatUsdCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** SVG area chart (no Recharts — avoids Webpack `originalFactory.call` / HMR bugs). */
export function PriceChart({ data }: { data: PriceChartRow[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 400 });
  const [hover, setHover] = useState<{
    i: number;
    x: number;
    y: number;
  } | null>(null);
  const rawId = useId();
  const gradientId = `oil-fill-${rawId.replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const rawH = Math.floor(r.height);
      const h = Math.max(280, rawH > 0 ? rawH : 400);
      setSize((prev) =>
        prev.w === w && prev.h === h ? prev : { w, h }
      );
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

  const layout = useMemo(() => {
    if (data.length === 0) return null;
    const margin = { top: 8, right: 12, bottom: 36, left: 48 };
    const innerW = size.w - margin.left - margin.right;
    const innerH = size.h - margin.top - margin.bottom;
    const prices = data.map((d) => d.price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const pad = Math.max((hi - lo) * 0.08, 0.25);
    const yMin = lo - pad;
    const yMax = hi + pad;
    const scaleY = (v: number) =>
      margin.top + ((yMax - v) / (yMax - yMin)) * innerH;
    const n = data.length;
    const scaleX = (i: number) =>
      n <= 1
        ? margin.left + innerW / 2
        : margin.left + (i / (n - 1)) * innerW;

    const pts = data.map((d, i) => ({
      x: scaleX(i),
      y: scaleY(d.price),
      t: d.t,
      price: d.price,
    }));

    const lineD = pts
      .map((p, i) =>
        `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
      )
      .join(" ");

    const yBottom = margin.top + innerH;
    const areaD = [
      `M ${pts[0].x.toFixed(2)} ${yBottom}`,
      `L ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`,
      ...pts.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
      `L ${pts[pts.length - 1].x.toFixed(2)} ${yBottom}`,
      "Z",
    ].join(" ");

    const ticks: { y: number; label: string }[] = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const v = yMin + (i / tickCount) * (yMax - yMin);
      ticks.push({ y: scaleY(v), label: formatUsdCompact(v) });
    }

    const xTickCount = Math.min(8, n);
    const xStep = Math.max(1, Math.ceil(n / xTickCount));
    const xTicks: { x: number; label: string }[] = [];
    for (let i = 0; i < n; i += xStep) {
      xTicks.push({ x: scaleX(i), label: data[i]?.t ?? "—" });
    }
    if (n > 1 && (n - 1) % xStep !== 0) {
      const last = n - 1;
      if (xTicks[xTicks.length - 1]?.x !== scaleX(last)) {
        xTicks.push({ x: scaleX(last), label: data[last]?.t ?? "—" });
      }
    }

    return {
      margin,
      innerW,
      innerH,
      ticks,
      xTicks,
      lineD,
      areaD,
      pts,
      yBottom,
    };
  }, [data, size.w, size.h]);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[min(52vh,400px)] w-full flex-1 items-center justify-center border border-dashed border-[#2a3140] bg-[#12151c] font-mono text-[13px] text-[#5c6578]">
        No candle data to display
      </div>
    );
  }

  if (!layout) return null;

  const { margin, innerW, ticks, xTicks, lineD, areaD, pts, yBottom } =
    layout;

  return (
    <div ref={wrapRef} className="relative h-full min-h-[280px] w-full flex-1">
      <svg
        width={size.w}
        height={size.h}
        className="block max-w-full"
        role="img"
        aria-label="Price area chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const n = pts.length;
          if (n <= 1) {
            setHover({ i: 0, x: mx, y: my });
            return;
          }
          const rel = mx - margin.left;
          const i = Math.max(
            0,
            Math.min(n - 1, Math.round((rel / innerW) * (n - 1)))
          );
          setHover({ i, x: mx, y: my });
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc107" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ffc107" stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={size.w} height={size.h} fill="#12151c" />

        {ticks.map((tk, idx) => (
          <g key={`gy-${idx}`}>
            <line
              x1={margin.left}
              x2={size.w - margin.right}
              y1={tk.y}
              y2={tk.y}
              stroke="#1e2430"
              strokeDasharray="3 3"
            />
            <text
              x={margin.left - 6}
              y={tk.y + 3}
              textAnchor="end"
              fill="#5c6578"
              fontSize={10}
              fontFamily="var(--font-jetbrains), ui-monospace, monospace"
            >
              {tk.label}
            </text>
          </g>
        ))}

        <path d={areaD} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={lineD}
          fill="none"
          stroke="#ffc107"
          strokeWidth={1.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {xTicks.map((xt, idx) => (
          <text
            key={`xt-${idx}`}
            x={xt.x}
            y={size.h - margin.bottom + 14}
            textAnchor="middle"
            fill="#5c6578"
            fontSize={9}
            fontFamily="var(--font-jetbrains), ui-monospace, monospace"
          >
            {xt.label.length > 14 ? `${xt.label.slice(0, 12)}…` : xt.label}
          </text>
        ))}

        <line
          x1={margin.left}
          x2={margin.left}
          y1={margin.top}
          y2={yBottom}
          stroke="#2a3140"
        />
        <line
          x1={margin.left}
          x2={size.w - margin.right}
          y1={yBottom}
          y2={yBottom}
          stroke="#2a3140"
        />
      </svg>

      {hover && pts[hover.i] && (
        <div
          className="pointer-events-none absolute z-10 rounded border border-[#2a3140] bg-[#12151c] px-2.5 py-1.5 font-mono text-[11px] text-[#c8d0e0] shadow-lg"
          style={{
            left: Math.min(size.w - 140, Math.max(8, hover.x - 60)),
            top: Math.max(8, hover.y - 44),
          }}
        >
          <div className="text-[#5c6578]">{pts[hover.i].t}</div>
          <div>{formatUsdCompact(pts[hover.i].price)}</div>
        </div>
      )}
    </div>
  );
}
