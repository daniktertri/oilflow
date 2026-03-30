"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

export type CandleChartRow = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
};

function formatUsdCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function CandleChart({ data }: { data: CandleChartRow[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 360 });
  const [hover, setHover] = useState<{
    i: number;
    x: number;
    y: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(280, Math.min(480, Math.floor(r.height) || 360));
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
    const lows = data.map((d) => d.l);
    const highs = data.map((d) => d.h);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const pad = Math.max((max - min) * 0.08, 0.25);
    const yMin = min - pad;
    const yMax = max + pad;
    const scaleY = (v: number) =>
      margin.top + ((yMax - v) / (yMax - yMin)) * innerH;
    const n = data.length;
    const slot = innerW / n;
    const bodyW = Math.max(1, Math.min(10, slot * 0.65));
    const cx = (i: number) => margin.left + slot * (i + 0.5);

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
      xTicks.push({
        x: cx(i),
        label: data[i]?.t ?? "—",
      });
    }
    if (n > 1 && (n - 1) % xStep !== 0) {
      const last = n - 1;
      if (xTicks[xTicks.length - 1]?.x !== cx(last)) {
        xTicks.push({ x: cx(last), label: data[last]?.t ?? "—" });
      }
    }

    return {
      margin,
      innerW,
      innerH,
      scaleY,
      cx,
      bodyW,
      yMin,
      yMax,
      ticks,
      xTicks,
      slot,
    };
  }, [data, size.w, size.h]);

  if (data.length === 0) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center border border-dashed border-[#2a3140] bg-[#0c0e12]/50 font-mono text-[12px] text-[#5c6578]">
        No candle data to display
      </div>
    );
  }

  if (!layout) return null;

  const { margin, scaleY, cx, bodyW, ticks, xTicks } = layout;

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{
        height: "clamp(280px, 42vh, 420px)",
        minHeight: 320,
      }}
    >
      <svg
        width={size.w}
        height={size.h}
        className="block max-w-full"
        role="img"
        aria-label="OHLC candlestick chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const n = data.length;
          const slot = layout.slot;
          const rel = mx - margin.left;
          const i = Math.max(
            0,
            Math.min(n - 1, Math.floor(rel / slot))
          );
          setHover({ i, x: mx, y: my });
        }}
      >
        <rect
          x={0}
          y={0}
          width={size.w}
          height={size.h}
          fill="#0c0e12"
        />

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

        {data.map((d, i) => {
          const x = cx(i);
          const yH = scaleY(d.h);
          const yL = scaleY(d.l);
          const yO = scaleY(d.o);
          const yC = scaleY(d.c);
          const up = d.c >= d.o;
          const bodyTop = Math.min(yO, yC);
          const bodyBot = Math.max(yO, yC);
          const bodyH = Math.max(1, bodyBot - bodyTop);
          const stroke = up ? "#00c853" : "#ff5252";
          const fill = up ? "#00c853" : "#ff5252";
          return (
            <g key={`c-${i}`}>
              <line
                x1={x}
                x2={x}
                y1={yH}
                y2={yL}
                stroke={stroke}
                strokeWidth={1}
              />
              <rect
                x={x - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={bodyH}
                fill={bodyH <= 1.5 ? stroke : fill}
                stroke={stroke}
                strokeWidth={1}
                opacity={0.92}
              />
            </g>
          );
        })}

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
          y2={size.h - margin.bottom}
          stroke="#2a3140"
        />
        <line
          x1={margin.left}
          x2={size.w - margin.right}
          y1={size.h - margin.bottom}
          y2={size.h - margin.bottom}
          stroke="#2a3140"
        />
      </svg>

      {hover && data[hover.i] && (
        <div
          className="pointer-events-none absolute z-10 rounded border border-[#2a3140] bg-[#12151c] px-2 py-1 font-mono text-[10px] text-[#c8d0e0] shadow-lg"
          style={{
            left: Math.min(
              size.w - 160,
              Math.max(8, hover.x - 70)
            ),
            top: Math.max(8, hover.y - 52),
          }}
        >
          <div className="text-[#5c6578]">{data[hover.i].t}</div>
          <div>
            O {formatUsdCompact(data[hover.i].o)} · H{" "}
            {formatUsdCompact(data[hover.i].h)}
          </div>
          <div>
            L {formatUsdCompact(data[hover.i].l)} · C{" "}
            {formatUsdCompact(data[hover.i].c)}
          </div>
        </div>
      )}
    </div>
  );
}
