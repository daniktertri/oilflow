"use client";

import { useEffect, useState } from "react";

type Brief = {
  brief_date: string;
  summary: string;
  outlook: string | null;
  key_drivers: string | null;
  sentiment: string | null;
  direction: string | null;
  conviction: string | null;
  risks: string | null;
};

const DIRECTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  LONG: { label: "LONG", color: "text-terminal-green", bg: "bg-terminal-green/15", border: "border-terminal-green/40" },
  SHORT: { label: "SHORT", color: "text-terminal-red", bg: "bg-terminal-red/15", border: "border-terminal-red/40" },
  NEUTRAL: { label: "NEUTRAL", color: "text-terminal-amber", bg: "bg-terminal-amber/15", border: "border-terminal-amber/40" },
};

export function MarketBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ai/brief", { cache: "no-store" });
        const data = (await res.json()) as { brief?: Brief | null };
        if (data.brief) setBrief(data.brief);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="border border-terminal-border bg-terminal-panel p-4">
        <div className="text-[11px] uppercase tracking-wider text-terminal-muted">
          AI Market Brief
        </div>
        <div className="mt-2 text-[12px] text-terminal-muted">Loading...</div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="border border-terminal-border bg-terminal-panel p-4">
        <div className="text-[11px] uppercase tracking-wider text-terminal-muted">
          AI Market Brief
        </div>
        <div className="mt-2 text-[12px] text-terminal-muted">
          No brief available yet. Run /api/seed to generate.
        </div>
      </div>
    );
  }

  const dir = DIRECTION_CONFIG[brief.direction ?? "NEUTRAL"] ?? DIRECTION_CONFIG.NEUTRAL;

  return (
    <div className="border border-terminal-border bg-terminal-panel">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#0c0e12]/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-terminal-amber">
            AI Market Brief
          </span>
          <span className="text-[11px] text-terminal-muted">{brief.brief_date}</span>

          {/* Direction signal */}
          {brief.direction && (
            <span className={`rounded border px-2.5 py-0.5 text-[11px] font-bold ${dir.color} ${dir.bg} ${dir.border}`}>
              {dir.label}
            </span>
          )}
          {brief.conviction && (
            <span className="text-[10px] text-terminal-muted">
              {brief.conviction} conviction
            </span>
          )}
          {brief.sentiment && brief.sentiment !== brief.direction?.toLowerCase() && (
            <span
              className={`rounded border px-2 py-0.5 text-[10px] uppercase ${
                brief.sentiment === "bullish"
                  ? "border-terminal-green/30 bg-terminal-green/10 text-terminal-green"
                  : brief.sentiment === "bearish"
                    ? "border-terminal-red/30 bg-terminal-red/10 text-terminal-red"
                    : "border-terminal-amber/30 bg-terminal-amber/10 text-terminal-amber"
              }`}
            >
              {brief.sentiment}
            </span>
          )}
        </div>
        <span className="text-[12px] text-terminal-muted">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-terminal-border px-4 py-3">
          <p className="text-[13px] leading-relaxed text-[#c8d0e0]">{brief.summary}</p>

          {brief.outlook && (
            <p className="mt-2 text-[12px] text-terminal-cyan">
              <span className="text-terminal-muted">Outlook:</span> {brief.outlook}
            </p>
          )}

          {brief.risks && (
            <p className="mt-2 text-[12px] text-terminal-red/80">
              <span className="text-terminal-muted">Risks:</span> {brief.risks}
            </p>
          )}

          {brief.key_drivers && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brief.key_drivers.split(",").map((d, i) => (
                <span
                  key={i}
                  className="rounded border border-terminal-border bg-[#0c0e12] px-2 py-0.5 text-[10px] text-terminal-muted"
                >
                  {d.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

