import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — OilFlow",
  description:
    "Get help on Telegram and follow OilFlow news and updates on our channel.",
};

const SUPPORT_TELEGRAM = "https://t.me/oilflowaisupport";
const NEWS_CHANNEL = "https://t.me/oilflowai";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#c8d0e0]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 font-mono text-[14px] uppercase tracking-wider text-[#ffc107]">
          Support &amp; updates
        </h1>
        <p className="mb-8 text-[11px] text-[#5c6578]">
          OilFlow · Telegram
        </p>

        <div className="space-y-6">
          <section className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-[#00e5ff]">
              Get support
            </h2>
            <p className="mb-4 text-[12px] leading-relaxed text-[#c8d0e0]">
              Questions, issues, or feedback? Reach us on Telegram at{" "}
              <a
                href={SUPPORT_TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[#00e5ff] hover:underline"
              >
                @oilflowaisupport
              </a>
              .
            </p>
            <a
              href={SUPPORT_TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded border border-[#2a3140] bg-[#0c0e12] px-4 py-2.5 font-mono text-[12px] text-[#ffc107] transition-colors hover:border-[#ffc107]"
            >
              Open Telegram support
            </a>
          </section>

          <section className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-[#00e5ff]">
              News &amp; updates
            </h2>
            <p className="mb-4 text-[12px] leading-relaxed text-[#c8d0e0]">
              Announcements, product updates, and news are published on our
              public Telegram channel.
            </p>
            <a
              href={NEWS_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded border border-[#2a3140] bg-[#0c0e12] px-4 py-2.5 font-mono text-[12px] text-[#ffc107] transition-colors hover:border-[#ffc107]"
            >
              @oilflowai on Telegram
            </a>
          </section>

          <p className="text-[11px] text-[#5c6578]">
            <Link href="/" className="text-[#00e5ff] hover:underline">
              Back to chart
            </Link>
            {" · "}
            <Link href="/how-it-works" className="text-[#00e5ff] hover:underline">
              How it works
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
