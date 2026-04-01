"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Post = {
  id: string;
  channel: string | null;
  text: string;
  postedAt: string;
  summary: string | null;
  sentiment: number | null;
  category: string | null;
};

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

export function RelatedNews() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/news/feed?limit=5", { cache: "no-store" });
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
          Telegram · latest
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {loading && (
          <p className="text-[12px] text-terminal-muted">Loading...</p>
        )}
        {!loading && posts.length === 0 && (
          <p className="text-[12px] leading-relaxed text-terminal-muted">
            No posts yet. The feed syncs periodically.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className="rounded border border-terminal-border bg-terminal-panel/80 px-2.5 py-2"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] text-terminal-muted">
                  {formatPosted(p.postedAt)}
                </span>
                {p.channel && (
                  <span className="text-[9px] text-terminal-cyan">
                    @{p.channel}
                  </span>
                )}
              </div>
              {p.summary ? (
                <p className="text-[12px] leading-snug text-[#c8d0e0]">
                  {p.summary}
                </p>
              ) : (
                <p className="line-clamp-3 text-[12px] leading-snug text-[#c8d0e0]">
                  {p.text}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
