"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { useTelegramAuth } from "@/components/telegram-auth-provider";

function BrandLogo() {
  return (
    <Link
      href="/"
      className="mr-3 flex shrink-0 items-center gap-2"
      aria-label="OilFlow home"
    >
      <Image
        src="/favicon.svg"
        alt=""
        width={28}
        height={28}
        className="rounded-md"
        priority
      />
      <span className="font-mono text-[12px] text-[#ffc107]">OilFlow</span>
    </Link>
  );
}

const links: { href: string; label: string }[] = [
  { href: "/", label: "Chart" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/balance", label: "Balance" },
  { href: "/lock", label: "Lock liquidity" },
  { href: "/how-it-works", label: "How it works" },
];

/** Static shell while pathname hook resolves — avoids Next/Webpack issues with `search-params` chunk. */
export function AppNavFallback() {
  return (
    <nav className="flex flex-wrap items-center gap-2 border-b border-[#1e2430] bg-[#0a0c10] px-4 py-2.5">
      <BrandLogo />
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="rounded px-3 py-1.5 font-mono text-[12px] uppercase text-[#5c6578] hover:bg-[#12151c] hover:text-[#c8d0e0]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function AppNavInner() {
  const pathname = usePathname();
  const { user, loading, logout } = useTelegramAuth();

  return (
    <nav
      data-tour="tour-nav"
      className="flex flex-wrap items-center gap-2 border-b border-[#1e2430] bg-[#0a0c10] px-4 py-2.5"
    >
      <BrandLogo />
      {links.map(({ href, label }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded px-3 py-1.5 font-mono text-[12px] uppercase tracking-wide transition-colors ${
              active
                ? "bg-[#1e2430] text-[#00e5ff]"
                : "text-[#5c6578] hover:bg-[#12151c] hover:text-[#c8d0e0]"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <span className="ml-auto flex items-center gap-2 font-mono text-[12px]">
        {loading ? (
          <span className="text-[#5c6578]">…</span>
        ) : user ? (
          <>
            <span className="max-w-[10rem] truncate text-[#c8d0e0]">
              {user.username ? `@${user.username}` : user.firstName}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded px-2.5 py-1 text-[#5c6578] hover:bg-[#12151c] hover:text-[#c8d0e0]"
            >
              Log out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded px-3 py-1.5 text-[#5c6578] hover:bg-[#12151c] hover:text-[#00e5ff]"
          >
            Log in
          </Link>
        )}
      </span>
    </nav>
  );
}

export function AppNav() {
  return (
    <Suspense fallback={<AppNavFallback />}>
      <AppNavInner />
    </Suspense>
  );
}
