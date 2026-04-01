"use client";

import { useEffect, useState, useCallback } from "react";

type Post = {
  id: string;
  source: string;
  sourceName: string;
  title: string | null;
  text: string;
  url: string | null;
  publishedAt: string;
  summary: string | null;
  direction: string | null;
  impactLevel: string | null;
  priceImpact: string | null;
  confidence: string | null;
  affectedBenchmarks: string | null;
  category: string | null;
};

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  telegram: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  oilprice: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  eia: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  cnbc: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  reuters: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
};

const CATEGORIES = [
  "all", "opec", "geopolitics", "supply", "demand", "macro",
  "inventory", "refining", "shipping", "policy",
] as const;

const SOURCES = ["all", "telegram", "oilprice", "eia", "cnbc"] as const;

function formatPosted(iso: string) {
  try {
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function DirectionBadge({ direction }: { direction: string | null }) {
  if (!direction) return null;
  const config = {
    bullish: { symbol: "▲", color: "text-terminal-green", bg: "bg-terminal-green/10", border: "border-terminal-green/30", label: "BULLISH" },
    bearish: { symbol: "▼", color: "text-terminal-red", bg: "bg-terminal-red/10", border: "border-terminal-red/30", label: "BEARISH" },
    neutral: { symbol: "—", color: "text-terminal-muted", bg: "bg-terminal-muted/10", border: "border-terminal-muted/30", label: "NEUTRAL" },
  }[direction] ?? { symbol: "—", color: "text-terminal-muted", bg: "bg-terminal-muted/10", border: "border-terminal-muted/30", label: direction.toUpperCase() };

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${config.color} ${config.bg} ${config.border}`}>
      <span className="text-[11px]">{config.symbol}</span> {config.label}
    </span>
  );
}

function ImpactBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const config = {
    high: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
    medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    low: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/30" },
  }[level] ?? { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/30" };

  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase ${config.color} ${config.bg} ${config.border}`}>
      {level}
    </span>
  );
}

function SourceBadge({ source, name }: { source: string; name: string }) {
  const s = SOURCE_COLORS[source] ?? SOURCE_COLORS.telegram;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${s.text} ${s.bg} ${s.border}`}>
      {name}
    </span>
  );
}

export default function NewsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (category !== "all") params.set("category", category);
      if (source !== "all") params.set("source", source);
      const res = await fetch(`/api/news/feed?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { posts?: Post[] };
      setPosts(data.posts ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [category, source]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
    const id = setInterval(fetchPosts, 60_000);
    return () => clearInterval(id);
  }, [fetchPosts]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-terminal-border bg-[#0a0c10] px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] uppercase tracking-wider text-terminal-amber">
            News Terminal
          </h1>
          <div className="h-2 w-2 animate-pulse rounded-full bg-terminal-green" />
          <span className="text-[10px] text-terminal-muted">LIVE</span>
        </div>

        {/* Source filter */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[9px] uppercase text-terminal-muted">Source:</span>
          {SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`px-2 py-1 text-[10px] uppercase transition-colors ${
                source === s
                  ? "border border-terminal-cyan bg-[#0c0e12] text-terminal-cyan"
                  : "border border-terminal-border text-terminal-muted hover:text-[#c8d0e0]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[9px] uppercase text-terminal-muted">Topic:</span>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-2 py-1 text-[10px] uppercase transition-colors ${
                category === c
                  ? "border border-terminal-amber bg-[#0c0e12] text-terminal-amber"
                  : "border border-terminal-border text-terminal-muted hover:text-[#c8d0e0]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <p className="text-[12px] text-terminal-muted">Loading feed...</p>
        )}
        {!loading && posts.length === 0 && (
          <p className="text-[12px] text-terminal-muted">
            No articles found. Run /api/seed to populate.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {posts.map((p) => {
            const isExpanded = expanded.has(p.id);
            const isLong = p.text.length > 200;

            return (
              <article
                key={p.id}
                className="rounded border border-terminal-border bg-terminal-panel/80 px-3 py-2.5"
              >
                {/* Header row: time, source, direction, impact */}
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-terminal-muted">
                    {formatPosted(p.publishedAt)}
                  </span>
                  <SourceBadge source={p.source} name={p.sourceName} />
                  <DirectionBadge direction={p.direction} />
                  <ImpactBadge level={p.impactLevel} />
                  {p.priceImpact && (
                    <span className="text-[10px] text-terminal-cyan">{p.priceImpact}</span>
                  )}
                  {p.category && (
                    <span className="rounded bg-[#0c0e12] px-1.5 py-0.5 text-[9px] uppercase text-terminal-muted">
                      {p.category}
                    </span>
                  )}
                </div>

                {/* Title if available */}
                {p.title && (
                  <h3 className="mb-1 text-[13px] font-medium text-[#e0e0e0]">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-terminal-cyan hover:underline">
                        {p.title}
                      </a>
                    ) : p.title}
                  </h3>
                )}

                {/* AI Summary */}
                {p.summary && (
                  <p className="mb-1 text-[12px] leading-relaxed text-[#c8d0e0]">
                    {p.summary}
                  </p>
                )}

                {/* Affected benchmarks */}
                {p.affectedBenchmarks && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {p.affectedBenchmarks.split(",").map((b) => (
                      <span
                        key={b}
                        className="rounded border border-terminal-border bg-[#0c0e12] px-1.5 py-0.5 text-[9px] text-terminal-amber"
                      >
                        {b.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Body text (expandable) */}
                {!p.summary && (
                  <p className={`text-[12px] leading-snug text-[#9ca3af] ${!isExpanded && isLong ? "line-clamp-3" : ""}`}>
                    {p.text}
                  </p>
                )}
                {isLong && !p.summary && (
                  <button
                    onClick={() => toggle(p.id)}
                    className="mt-1 text-[10px] text-terminal-cyan hover:underline"
                  >
                    {isExpanded ? "Show less" : "Read full"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
