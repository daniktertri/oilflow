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

/** One line for cards: collapse whitespace, cap length without cutting mid-word when possible */
function previewText(raw: string, maxChars: number) {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return { preview: t, rest: "" as string };
  let cut = t.slice(0, maxChars);
  const sp = cut.lastIndexOf(" ");
  if (sp > maxChars * 0.55) cut = cut.slice(0, sp);
  return { preview: cut.trim(), rest: t.slice(cut.length).trim() };
}

export function RelatedNews() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const q = new URLSearchParams({ limit: "3" });
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
      <div className="shrink-0 border-b border-[#1e2430] px-3 py-2.5">
        <div className="font-mono text-[11px] uppercase tracking-wider text-[#ffc107]">
          Oil headlines
        </div>
        <div className="mt-0.5 text-[10px] text-[#5c6578]">Telegram · last 3</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
        {loading && (
          <p className="font-mono text-[12px] text-[#5c6578]">Loading…</p>
        )}
        {err && !loading && posts.length === 0 && (
          <p className="font-mono text-[12px] text-[#ff8a80]">{err}</p>
        )}
        {!loading && posts.length === 0 && !err && (
          <p className="font-mono text-[12px] leading-relaxed text-[#5c6578]">
            No posts yet. The feed syncs periodically.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {posts.map((p) => {
            const { preview, rest } = previewText(p.text, 200);
            const expandable = rest.length > 0;
            const open = expandedId === p.id;
            const showBody =
              open || !expandable ? p.text.replace(/\s+/g, " ").trim() : preview;

            return (
              <li
                key={p.id}
                className="rounded border border-[#1e2430] bg-[#12151c]/80 px-2.5 py-2"
              >
                <div className="mb-1.5 font-mono text-[10px] text-[#5c6578]">
                  {formatPosted(p.postedAt)}
                </div>
                <p
                  className={`font-mono text-[12px] leading-snug text-[#c8d0e0] ${
                    !open && expandable ? "line-clamp-4" : ""
                  }`}
                >
                  {showBody}
                </p>
                {expandable && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((id) => (id === p.id ? null : p.id))
                    }
                    className="mt-1.5 font-mono text-[10px] text-[#00e5ff] hover:underline"
                  >
                    {open ? "Show less" : "Read full"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
