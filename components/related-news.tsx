"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  category: string | null;
};

const SOURCE_COLORS: Record<string, string> = {
  telegram: "text-emerald-400",
  oilprice: "text-orange-400",
  eia: "text-amber-400",
  cnbc: "text-blue-400",
  reuters: "text-sky-400",
};

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

function DirectionArrow({ direction }: { direction: string | null }) {
  if (direction === "bullish") return <span className="text-[11px] text-terminal-green">▲</span>;
  if (direction === "bearish") return <span className="text-[11px] text-terminal-red">▼</span>;
  return <span className="text-[9px] text-terminal-muted">—</span>;
}

export function RelatedNews() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/news/feed?limit=8", { cache: "no-store" });
        const data = (await res.json()) as { posts?: Post[] };
        if (!cancelled) setPosts(data.posts ?? []);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0c0e12]">
      <div className="shrink-0 border-b border-terminal-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-terminal-amber">
            Oil Headlines
          </span>
          <Link
            href="/news"
            className="text-[10px] text-terminal-cyan hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="mt-0.5 text-[10px] text-terminal-muted">
          Multi-source · live
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {loading && (
          <p className="text-[12px] text-terminal-muted">Loading...</p>
        )}
        {!loading && posts.length === 0 && (
          <p className="text-[12px] leading-relaxed text-terminal-muted">
            No posts yet. Run /api/seed to populate.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className="rounded border border-terminal-border bg-terminal-panel/80 px-2.5 py-2"
            >
              <div className="mb-1 flex items-center gap-2">
                <DirectionArrow direction={p.direction} />
                <span className="text-[10px] text-terminal-muted">
                  {formatPosted(p.publishedAt)}
                </span>
                <span className={`text-[9px] ${SOURCE_COLORS[p.source] ?? "text-terminal-muted"}`}>
                  {p.sourceName}
                </span>
                {p.impactLevel === "high" && (
                  <span className="rounded bg-red-500/10 px-1 py-0.5 text-[8px] font-bold uppercase text-red-400">
                    HIGH
                  </span>
                )}
              </div>
              {p.title && (
                <p className="mb-0.5 text-[12px] font-medium leading-snug text-[#e0e0e0]">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-terminal-cyan">
                      {p.title}
                    </a>
                  ) : p.title}
                </p>
              )}
              {p.summary ? (
                <p className="text-[11px] leading-snug text-[#9ca3af]">
                  {p.summary}
                </p>
              ) : (
                <p className="line-clamp-2 text-[11px] leading-snug text-[#9ca3af]">
                  {p.text}
                </p>
              )}
              {p.priceImpact && (
                <span className="mt-1 inline-block text-[9px] text-terminal-cyan">
                  {p.priceImpact}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
