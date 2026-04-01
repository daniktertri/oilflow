"use client";

import { useEffect, useState, useCallback } from "react";

type Post = {
  id: string;
  channel: string | null;
  text: string;
  postedAt: string;
  summary: string | null;
  sentiment: number | null;
  category: string | null;
};

const CATEGORIES = [
  { key: null, label: "All" },
  { key: "opec", label: "OPEC" },
  { key: "geopolitics", label: "Geopolitics" },
  { key: "supply", label: "Supply" },
  { key: "demand", label: "Demand" },
  { key: "market", label: "Market" },
  { key: "refining", label: "Refining" },
  { key: "shipping", label: "Shipping" },
  { key: "policy", label: "Policy" },
];

function formatPosted(iso: string) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function sentimentLabel(score: number | null): { label: string; color: string } | null {
  if (score == null) return null;
  if (score > 0.6) return { label: "Bullish", color: "text-terminal-green border-terminal-green/30 bg-terminal-green/10" };
  if (score < 0.4) return { label: "Bearish", color: "text-terminal-red border-terminal-red/30 bg-terminal-red/10" };
  return { label: "Neutral", color: "text-terminal-amber border-terminal-amber/30 bg-terminal-amber/10" };
}

export default function NewsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (category) params.set("category", category);
      const res = await fetch(`/api/news/feed?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { posts?: Post[] };
      setPosts(data.posts ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPosts();
    const id = setInterval(fetchPosts, 60_000);
    return () => clearInterval(id);
  }, [fetchPosts]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-terminal-border bg-[#0a0c10] px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] uppercase tracking-wider text-terminal-amber">
            News Terminal
          </h1>
          <span className="text-[11px] text-terminal-muted">
            Telegram Channels · {posts.length} articles
          </span>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 h-2 w-2 animate-pulse-glow rounded-full bg-terminal-green" />
            <span className="text-[10px] text-terminal-muted">Live</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={label}
              onClick={() => setCategory(key)}
              className={`px-2.5 py-1 text-[10px] uppercase transition-colors ${
                category === key
                  ? "border border-terminal-amber bg-terminal-amber/10 text-terminal-amber"
                  : "border border-terminal-border text-terminal-muted hover:text-[#c8d0e0]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading && posts.length === 0 && (
          <div className="p-4 text-[12px] text-terminal-muted">Loading news feed...</div>
        )}
        {!loading && posts.length === 0 && (
          <div className="p-4 text-[12px] text-terminal-muted">
            No articles found. News syncs periodically from Telegram channels.
          </div>
        )}
        <div className="divide-y divide-terminal-border">
          {posts.map((p) => {
            const expanded = expandedId === p.id;
            const sent = sentimentLabel(p.sentiment);

            return (
              <article
                key={p.id}
                className="px-4 py-3 transition-colors hover:bg-terminal-panel/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-terminal-muted">
                    {formatPosted(p.postedAt)}
                  </span>
                  {p.channel && (
                    <span className="rounded border border-terminal-border px-1.5 py-0.5 text-[9px] uppercase text-terminal-cyan">
                      @{p.channel}
                    </span>
                  )}
                  {p.category && (
                    <span className="rounded border border-terminal-border px-1.5 py-0.5 text-[9px] uppercase text-terminal-muted">
                      {p.category}
                    </span>
                  )}
                  {sent && (
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] uppercase ${sent.color}`}
                    >
                      {sent.label}
                    </span>
                  )}
                </div>

                {p.summary && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#e0e0e0]">
                    {p.summary}
                  </p>
                )}

                <div className={`mt-1 ${!expanded && !p.summary ? "" : "mt-1.5"}`}>
                  <p
                    className={`text-[12px] leading-snug text-terminal-muted ${
                      !expanded ? "line-clamp-3" : ""
                    }`}
                  >
                    {p.text}
                  </p>
                  {p.text.length > 200 && (
                    <button
                      onClick={() =>
                        setExpandedId((id) => (id === p.id ? null : p.id))
                      }
                      className="mt-1 text-[10px] text-terminal-cyan hover:underline"
                    >
                      {expanded ? "Show less" : "Read full"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
