"use client";

import { useEffect, useState } from "react";

type Brief = {
  brief_date: string;
  summary: string;
  outlook: string | null;
  key_drivers: string | null;
  sentiment: string | null;
};

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: "text-terminal-green",
  bearish: "text-terminal-red",
  neutral: "text-terminal-amber",
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
          No brief available. Configure OPENAI_API_KEY and run the daily brief cron.
        </div>
      </div>
    );
  }

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
          {brief.sentiment && (
            <span
              className={`rounded border px-2 py-0.5 text-[10px] uppercase ${
                SENTIMENT_COLORS[brief.sentiment] ?? "text-terminal-muted"
              } ${
                brief.sentiment === "bullish"
                  ? "border-terminal-green/30 bg-terminal-green/10"
                  : brief.sentiment === "bearish"
                    ? "border-terminal-red/30 bg-terminal-red/10"
                    : "border-terminal-amber/30 bg-terminal-amber/10"
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
