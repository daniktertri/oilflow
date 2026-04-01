"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegramAuth } from "@/components/telegram-auth-provider";
import Link from "next/link";

type Alert = {
  id: string;
  benchmark: string;
  condition: string;
  threshold: number;
  active: boolean;
  last_triggered_at: string | null;
};

const BENCHMARKS = ["WTI", "BRENT", "OPEC", "DUBAI", "URALS", "WCS", "LLS"];

export default function AlertsPage() {
  const { user, loading: authLoading } = useTelegramAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchmark, setBenchmark] = useState("WTI");
  const [condition, setCondition] = useState("above");
  const [threshold, setThreshold] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { alerts?: Alert[] };
        setAlerts(data.alerts ?? []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user) fetchAlerts();
    else setLoading(false);
  }, [user, fetchAlerts]);

  const handleCreate = async () => {
    if (!threshold) return;
    setCreating(true);
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benchmark, condition, threshold: Number(threshold) }),
      });
      setThreshold("");
      await fetchAlerts();
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAlerts();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    await fetchAlerts();
  };

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-terminal-muted">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-[13px] text-terminal-muted">
          Log in with Telegram to set up price alerts
        </p>
        <Link
          href="/login?next=/alerts"
          className="border border-terminal-amber px-4 py-2 text-[12px] uppercase text-terminal-amber hover:bg-terminal-amber/10"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-[13px] uppercase tracking-wider text-terminal-amber">
          Price Alerts
        </h1>
        <p className="mt-1 text-[11px] text-terminal-muted">
          Get notified via Telegram when oil prices hit your targets
        </p>
      </div>

      {/* Create alert form */}
      <div className="mb-6 border border-terminal-border bg-terminal-panel p-4">
        <div className="text-[11px] uppercase tracking-wider text-terminal-muted">
          New Alert
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase text-terminal-muted">
              Benchmark
            </label>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className="border border-terminal-border bg-[#0c0e12] px-3 py-2 text-[12px] text-[#c8d0e0] outline-none focus:border-terminal-amber"
            >
              {BENCHMARKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-terminal-muted">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="border border-terminal-border bg-[#0c0e12] px-3 py-2 text-[12px] text-[#c8d0e0] outline-none focus:border-terminal-amber"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-terminal-muted">
              Price ($)
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="65.00"
              step="0.01"
              className="w-28 border border-terminal-border bg-[#0c0e12] px-3 py-2 text-[12px] text-[#c8d0e0] outline-none focus:border-terminal-amber"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !threshold}
            className="border border-terminal-green bg-terminal-green/10 px-4 py-2 text-[12px] uppercase text-terminal-green hover:bg-terminal-green/20 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Alert"}
          </button>
        </div>
      </div>

      {/* Active alerts */}
      <div className="border border-terminal-border bg-terminal-panel">
        <div className="border-b border-terminal-border px-4 py-2.5">
          <span className="text-[11px] uppercase tracking-wider text-terminal-muted">
            Your Alerts ({alerts.length})
          </span>
        </div>
        {loading ? (
          <div className="p-4 text-[12px] text-terminal-muted">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-[12px] text-terminal-muted">
            No alerts configured. Create one above.
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/50">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-[#0c0e12]"
              >
                <button
                  onClick={() => handleToggle(a.id, a.active)}
                  className={`h-3 w-3 rounded-full ${
                    a.active ? "bg-terminal-green" : "bg-terminal-muted"
                  }`}
                  title={a.active ? "Active - click to pause" : "Paused - click to activate"}
                />
                <span className="text-[12px] text-terminal-amber">{a.benchmark}</span>
                <span className="text-[12px] text-terminal-muted">{a.condition}</span>
                <span className="text-[13px] text-[#e0e0e0]">${a.threshold.toFixed(2)}</span>
                {a.last_triggered_at && (
                  <span className="text-[10px] text-terminal-muted">
                    Last: {new Date(a.last_triggered_at).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  className="ml-auto text-[11px] text-terminal-red hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
