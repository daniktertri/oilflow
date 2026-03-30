"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";

const links: { href: string; label: string }[] = [
  { href: "/", label: "Chart" },
  { href: "/balance", label: "Balance" },
  { href: "/lock", label: "Lock liquidity" },
];

/** Static shell while pathname hook resolves — avoids Next/Webpack issues with `search-params` chunk. */
export function AppNavFallback() {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-[#1e2430] bg-[#0a0c10] px-3 py-2">
      <span className="mr-3 font-mono text-[11px] text-[#ffc107]">OilFlow</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="rounded px-2.5 py-1 font-mono text-[11px] uppercase text-[#5c6578] hover:bg-[#12151c] hover:text-[#c8d0e0]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function AppNavInner() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-[#1e2430] bg-[#0a0c10] px-3 py-2">
      <span className="mr-3 font-mono text-[11px] text-[#ffc107]">OilFlow</span>
      {links.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              active
                ? "bg-[#1e2430] text-[#00e5ff]"
                : "text-[#5c6578] hover:bg-[#12151c] hover:text-[#c8d0e0]"
            }`}
          >
            {label}
          </Link>
        );
      })}
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
