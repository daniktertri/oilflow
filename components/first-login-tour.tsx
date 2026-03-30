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
import { usePathname } from "next/navigation";
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
        on Hyperliquid with <strong>USDC margin</strong>. Use the tour to learn
        where prices, your wallet, and liquidity locks live.
      </>
    ),
  },
  {
    title: "Top navigation",
    targetAttr: "tour-nav",
    body: (
      <>
        Move between <strong>Chart</strong> (live market view),{" "}
        <strong>Balance</strong> (wallet &amp; deposits),{" "}
        <strong>Lock liquidity</strong>, and <strong>How it works</strong> for the
        full product story.
      </>
    ),
  },
  {
    title: "Market strip",
    targetAttr: "tour-stats",
    body: (
      <>
        On the chart page, this row shows <strong>last price</strong>,{" "}
        <strong>oracle</strong>, <strong>24h volume</strong>, the selected{" "}
        <strong>interval</strong>, bar count, and <strong>lock time left</strong>{" "}
        when you have an active session.
      </>
    ),
  },
  {
    title: "Chart controls",
    targetAttr: "tour-chart-controls",
    body: (
      <>
        Switch <strong>area</strong> vs <strong>candles</strong>, pick a time{" "}
        <strong>interval</strong>, and <strong>refresh</strong> to reload data from
        the API.
      </>
    ),
  },
  {
    title: "Global bot activity",
    targetAttr: "tour-bot-feed",
    body: (
      <>
        A synthesized feed of market-wide style activity for the pair—use it
        alongside the chart for context (not a personal trade log).
      </>
    ),
  },
  {
    title: "Wallet & locks",
    targetAttr: "tour-header-wallet",
    body: (
      <>
        The header shows <strong>BAL</strong> (balance link), optional{" "}
        <strong>locked</strong> principal and <strong>session P&amp;L</strong> when
        applicable. Open <strong>Balance</strong> or <strong>Lock liquidity</strong>{" "}
        from the nav for deposits and lock flows.
      </>
    ),
  },
  {
    title: "You are set",
    body: (
      <>
        For risk, AI behaviour, and mechanics, read{" "}
        <Link
          href="/how-it-works"
          className="text-[#00e5ff] underline hover:text-[#ffc107]"
        >
          How it works
        </Link>
        . You can dismiss this tour anytime; it will not show again on this
        browser for your account.
      </>
    ),
  },
];

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
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const doneForUser = useMemo(
    () => (user ? hasCompletedOnboarding(user.telegramId) : true),
    [user]
  );

  /** Avoid resetting step when pathname changes mid-tour; reset when user logs out */
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

  return (
    <div
      className="fixed inset-0 z-[100] font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-login-tour-title"
      aria-describedby="first-login-tour-desc"
    >
      {/* Dim overlays — four rects around highlight */}
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
        <div className="w-full max-w-md rounded border border-[#2a3140] bg-[#0c0e12] p-4 shadow-xl shadow-black/50">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#5c6578]">
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
            className="mb-6 text-[11px] leading-relaxed text-[#c8d0e0]"
          >
            {current.body}
          </div>
          {current.targetAttr && !showHole ? (
            <p className="mb-4 text-[10px] text-[#5c6578]">
              Go to{" "}
              <Link href="/" className="text-[#00e5ff] underline hover:text-[#ffc107]">
                Chart
              </Link>{" "}
              to see this area highlighted.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-[10px] uppercase text-[#5c6578] hover:text-[#c8d0e0]"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={back}
                className="border border-[#2a3140] px-3 py-1.5 text-[10px] uppercase text-[#c8d0e0] hover:border-[#ffc107] disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                className="border border-[#ffc107] bg-[#1a1508] px-3 py-1.5 text-[10px] uppercase text-[#ffc107] hover:bg-[#221a0a]"
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
