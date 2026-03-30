"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTelegramAuth } from "@/components/telegram-auth-provider";
import {
  hasCompletedOnboarding,
  setOnboardingCompleted,
} from "@/lib/onboarding-storage";

type TourStep = {
  title: string;
  body: ReactNode;
  /** `data-tour` value on the page; optional — step is centered if missing */
  targetAttr?: string;
};

const STEPS: TourStep[] = [
  {
    title: "Welcome to OilFlow",
    body: (
      <>
        This app tracks <strong className="text-[#ffc107]">WTI crude oil</strong>{" "}
        on Hyperliquid with <strong>USDC margin</strong>. This tour covers the
        chart, balance, locks, and the dashboard.
      </>
    ),
  },
  {
    title: "Top navigation",
    targetAttr: "tour-nav",
    body: (
      <>
        Use <strong>Chart</strong>, <strong>Dashboard</strong>,{" "}
        <strong>Balance</strong>, <strong>Lock liquidity</strong>, and{" "}
        <strong>How it works</strong> to move around the app.
      </>
    ),
  },
  {
    title: "Market strip",
    targetAttr: "tour-stats",
    body: (
      <>
        <strong>Last</strong>, <strong>oracle</strong>, <strong>24h volume</strong>
        , interval, bar count, and <strong>lock time left</strong> when a session is
        running.
      </>
    ),
  },
  {
    title: "Chart controls",
    targetAttr: "tour-chart-controls",
    body: (
      <>
        Switch <strong>area</strong> vs <strong>candles</strong>, pick an{" "}
        <strong>interval</strong>, and <strong>refresh</strong> to reload data.
      </>
    ),
  },
  {
    title: "Global bot activity",
    targetAttr: "tour-bot-feed",
    body: (
      <>
        A synthesized market-style feed for the pair—not your personal fills.
      </>
    ),
  },
  {
    title: "Wallet in the header",
    targetAttr: "tour-header-wallet",
    body: (
      <>
        Quick view of <strong>BAL</strong>, and when applicable{" "}
        <strong>locked</strong> size and <strong>session P&amp;L</strong>.
      </>
    ),
  },
  {
    title: "Available balance",
    targetAttr: "tour-balance-available",
    body: (
      <>
        Your <strong>spendable USDC</strong> in the app (simulated wallet). Locks
        and withdrawals pull from here.
      </>
    ),
  },
  {
    title: "Deposit",
    targetAttr: "tour-balance-deposit",
    body: (
      <>
        <strong>Solana USDC</strong> deposit address and QR. Record simulated
        top-ups after you send on-chain (until sync is wired).
      </>
    ),
  },
  {
    title: "Top-up & withdraw",
    targetAttr: "tour-balance-actions",
    body: (
      <>
        <strong>Top-up</strong> credits balance for demos; <strong>withdraw</strong>{" "}
        moves USDC out if you have enough.
      </>
    ),
  },
  {
    title: "Ledger",
    targetAttr: "tour-balance-ledger",
    body: (
      <>
        <strong>Recent transactions</strong>: deposits, withdrawals, lock-ins, and
        settlements—newest at the top.
      </>
    ),
  },
  {
    title: "Lock panel",
    targetAttr: "tour-lock-wallet",
    body: (
      <>
        See <strong>wallet balance</strong>, start a <strong>lock</strong> with
        amount and duration, or track an active lock&apos;s principal and session
        P&amp;L.
      </>
    ),
  },
  {
    title: "Lock & run",
    targetAttr: "tour-lock-form",
    body: (
      <>
        Choose <strong>amount</strong> and <strong>duration</strong>, then{" "}
        <strong>Add lock</strong>. While active, positions post realized P&amp;L
        each hour.
      </>
    ),
  },
  {
    title: "Executed trades",
    targetAttr: "tour-lock-trades",
    body: (
      <>
        Each row is a <strong>realized trade</strong> for that hour while a lock
        is active—the full profit for that hour.
      </>
    ),
  },
  {
    title: "Dashboard overview",
    targetAttr: "tour-dashboard-overview",
    body: (
      <>
        Snapshot of <strong>available</strong> USDC, <strong>locked</strong>{" "}
        principal, <strong>session P&amp;L</strong>, and <strong>time left</strong>{" "}
        for the current lock.
      </>
    ),
  },
  {
    title: "Daily P&L chart",
    targetAttr: "tour-dashboard-pnl",
    body: (
      <>
        <strong>Realized P&L by day</strong> when locks settle. Today&apos;s bar can
        include <strong>open session</strong> P&L until the lock ends.
      </>
    ),
  },
  {
    title: "You are set",
    body: (
      <>
        Read{" "}
        <Link
          href="/how-it-works"
          className="text-[#00e5ff] underline hover:text-[#ffc107]"
        >
          How it works
        </Link>{" "}
        for risk and mechanics. Skip anytime—this tour won&apos;t show again for
        your account on this browser.
      </>
    ),
  },
];

/** Route the tour expects for each step so highlights match the page. */
function pathForStepIndex(s: number): string | null {
  if (s <= 5) return "/";
  if (s <= 9) return "/balance";
  if (s <= 12) return "/lock";
  if (s <= 15) return "/dashboard";
  return null;
}

function pathLabel(path: string): string {
  const m: Record<string, string> = {
    "/": "Chart",
    "/balance": "Balance",
    "/lock": "Lock liquidity",
    "/dashboard": "Dashboard",
  };
  return m[path] ?? path;
}

type Rect = { top: number; left: number; width: number; height: number };

function readHighlightRect(attr: string | undefined): Rect | null {
  if (!attr || typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tour="${attr}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad = 8;
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

export function FirstLoginTour() {
  const { user, loading } = useTelegramAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const doneForUser = useMemo(
    () => (user ? hasCompletedOnboarding(user.telegramId) : true),
    [user]
  );

  const openedThisLoginRef = useRef(false);

  useEffect(() => {
    if (!user) openedThisLoginRef.current = false;
  }, [user]);

  useEffect(() => {
    if (loading || !user || doneForUser) return;
    if (pathname === "/login") return;
    if (openedThisLoginRef.current) return;
    openedThisLoginRef.current = true;
    setOpen(true);
    setStep(0);
  }, [loading, user, doneForUser, pathname]);

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const expectedPath = pathForStepIndex(step);

  useEffect(() => {
    if (!open || expectedPath == null) return;
    if (pathname === expectedPath) return;
    router.push(expectedPath);
  }, [open, step, pathname, expectedPath, router]);

  const updateRect = useCallback(() => {
    const r = readHighlightRect(current.targetAttr);
    setRect(r);
  }, [current.targetAttr]);

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
  }, [open, step, pathname, updateRect]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updateRect();
    const onScroll = () => updateRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, updateRect]);

  const finish = useCallback(() => {
    if (user) setOnboardingCompleted(user.telegramId);
    setOpen(false);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  if (!open || !user) return null;

  const showHole = rect && rect.width > 0 && rect.height > 0;
  const hintPath = expectedPath && pathname !== expectedPath ? expectedPath : null;

  return (
    <div
      className="fixed inset-0 z-[100] font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-login-tour-title"
      aria-describedby="first-login-tour-desc"
    >
      {showHole ? (
        <>
          <div
            className="absolute bg-black/75"
            style={{ top: 0, left: 0, right: 0, height: rect.top }}
          />
          <div
            className="absolute bg-black/75"
            style={{
              top: rect.top,
              left: 0,
              width: rect.left,
              height: rect.height,
            }}
          />
          <div
            className="absolute bg-black/75"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
            }}
          />
          <div
            className="absolute bg-black/75"
            style={{
              top: rect.top + rect.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="pointer-events-none absolute rounded border-2 border-[#ffc107] shadow-[0_0_0_1px_rgba(255,193,7,0.3)]"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/75" />
      )}

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded border border-[#2a3140] bg-[#0c0e12] p-5 shadow-xl shadow-black/50">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-[#5c6578]">
            Quick tour · {step + 1} / {STEPS.length}
          </p>
          <h2
            id="first-login-tour-title"
            className="mb-3 text-sm font-normal text-[#ffc107]"
          >
            {current.title}
          </h2>
          <div
            id="first-login-tour-desc"
            className="mb-6 text-[12px] leading-relaxed text-[#c8d0e0]"
          >
            {current.body}
          </div>
          {hintPath ? (
            <p className="mb-4 text-[11px] text-[#5c6578]">
              Opening{" "}
              <Link
                href={hintPath}
                className="text-[#00e5ff] underline hover:text-[#ffc107]"
              >
                {pathLabel(hintPath)}
              </Link>
              …
            </p>
          ) : null}
          {current.targetAttr && !showHole && !hintPath ? (
            <p className="mb-4 text-[11px] text-[#5c6578]">
              Go to{" "}
              <Link
                href={expectedPath ?? "/"}
                className="text-[#00e5ff] underline hover:text-[#ffc107]"
              >
                {pathLabel(expectedPath ?? "/")}
              </Link>{" "}
              to see this area highlighted.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-[11px] uppercase text-[#5c6578] hover:text-[#c8d0e0]"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={back}
                className="min-h-[2.5rem] border border-[#2a3140] px-4 py-2 text-[11px] uppercase text-[#c8d0e0] hover:border-[#ffc107] disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                className="min-h-[2.5rem] border border-[#ffc107] bg-[#1a1508] px-4 py-2 text-[11px] uppercase text-[#ffc107] hover:bg-[#221a0a]"
              >
                {isLast ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
