"use client";

import { useEffect, useState } from "react";
import { sameOriginApi } from "@/lib/client-api-url";

type Post = { id: string; text: string; postedAt: string };

function formatPosted(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

export function RelatedNews() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const q = new URLSearchParams({ limit: "5" });
        const res = await fetch(sameOriginApi("/api/news/related", q), {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          posts?: Post[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setErr(data.error || "Could not load news");
          setPosts([]);
          return;
        }
        setPosts(data.posts ?? []);
        if (data.error) setErr(data.error);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Load failed");
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden bg-[#0c0e12]">
      <div className="shrink-0 border-b border-[#1e2430] px-3 py-2">
        <div className="text-[11px] uppercase tracking-wider text-[#5c6578]">
          Related news
        </div>
        <div className="font-mono text-[11px] text-[#5c6578]">
          Last 5 · Telegram
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {loading && (
          <p className="px-1 font-mono text-[12px] text-[#5c6578]">Loading…</p>
        )}
        {err && !loading && posts.length === 0 && (
          <p className="px-1 font-mono text-[12px] text-[#ff8a80]">{err}</p>
        )}
        {!loading && posts.length === 0 && !err && (
          <p className="px-1 font-mono text-[12px] leading-relaxed text-[#5c6578]">
            No posts loaded yet. The server pulls the public channel feed
            periodically; check back shortly or ensure DATABASE_URL is set.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="border-b border-[#1e2430]/80 pb-3 last:border-0 last:pb-0"
            >
              <div className="mb-1 font-mono text-[10px] text-[#5c6578]">
                {formatPosted(p.postedAt)}
              </div>
              <p className="whitespace-pre-wrap font-mono text-[12px] leading-snug text-[#c8d0e0]">
                {p.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
