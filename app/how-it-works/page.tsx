import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#c8d0e0]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 font-mono text-[14px] uppercase tracking-wider text-[#ffc107]">
          How it works
        </h1>
        <p className="mb-8 text-[11px] text-[#5c6578]">
          OilFlow · WTI crude on Hyperliquid · USDC margin
        </p>

        <div className="space-y-6">
          <section className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-[#00e5ff]">
              The AI trading bot
            </h2>
            <div className="space-y-3 text-[12px] leading-relaxed text-[#c8d0e0]">
              <p>
                OilFlow is built around an <strong className="text-[#ffc107]">AI trading bot</strong>{" "}
                that continuously scans and interprets{" "}
                <strong>news and signals related to oil</strong>—supply shocks,
                inventories, OPEC commentary, sanctions, and geopolitical flash
                points. We pay special attention to{" "}
                <strong>high-impact regions</strong> where headlines can move
                crude in minutes: think{" "}
                <strong>Iran</strong>, the Strait of Hormuz, major producers in
                the Middle East, Russia-related flows, and other choke points
                that routinely show up in energy coverage.
              </p>
              <p className="text-[#5c6578]">
                The model does not replace judgement on the ground; it is a
                machine layer that ingests a large volume of sources, ranks
                relevance, and feeds a systematic execution stack so reactions can
                be faster and more consistent than manual clicking—within the
                risk limits you choose when you participate.
              </p>
            </div>
          </section>

          <section className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-[#00e5ff]">
              Earning by providing liquidity
            </h2>
            <p className="text-[12px] leading-relaxed text-[#c8d0e0]">
              As a user, you do not need to pick every headline yourself. You can{" "}
              <strong>allocate USDC as liquidity</strong> that the bot may use
              within the product rules: when the strategy is profitable, your
              share of the economics comes from that participation. In short, you
              are <strong>backing the bot&apos;s trading capacity</strong> and
              sharing in the outcome—after fees—rather than operating the stack
              manually. Top up or review funds on{" "}
              <Link href="/balance" className="text-[#00e5ff] hover:underline">
                Balance
              </Link>
              .
            </p>
          </section>

          <section className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-[#00e5ff]">
              The locking mechanism
            </h2>
            <div className="space-y-3 text-[12px] leading-relaxed text-[#c8d0e0]">
              <p>
                Liquidity is not free-floating day to day in the same way as a
                simple spot balance. You <strong>lock</strong> an amount for a
                defined window so the engine can size positions and session logic
                predictably. While a lock is active, capital is committed to that
                window; when it expires, principal and any session P&amp;L are
                settled according to the rules shown in the app.
              </p>
              <p className="text-[#5c6578]">
                You choose the duration when you lock (short stress tests or
                longer runs). Longer commitments align better with how the
                strategy amortizes noise and fees—see{" "}
                <Link href="/lock" className="text-[#00e5ff] hover:underline">
                  Lock liquidity
                </Link>{" "}
                for the current controls.
              </p>
            </div>
          </section>

          <section className="rounded border border-[#1e2430] bg-[#12151c] p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-[#00e5ff]">
              Platform fee (50% of profits)
            </h2>
            <p className="text-[12px] leading-relaxed text-[#c8d0e0]">
              <strong className="text-[#ffc107]">
                We retain 50% of net trading profits
              </strong>{" "}
              generated in scope. That split covers{" "}
              <strong>bot infrastructure</strong>,{" "}
              <strong>algorithm development and maintenance</strong>, data and
              execution costs, and ongoing risk and compliance work. The
              remaining <strong>50%</strong> accrues to liquidity providers
              according to the product rules in force at the time of each
              session. This is a profits-based fee: it applies to{" "}
              <strong>positive</strong> performance, not a flat charge on
              principal.
            </p>
          </section>

          <section className="rounded border border-[#ffc107]/25 bg-[#12151c] p-5">
            <h2 className="mb-3 text-[11px] uppercase tracking-wider text-[#ffc107]">
              Principal guarantee vs. shorter locks
            </h2>
            <div className="space-y-3 text-[12px] leading-relaxed text-[#c8d0e0]">
              <p>
                <strong className="text-[#00c853]">
                  Locks of 90 days or longer
                </strong>{" "}
                carry a <strong>guarantee on the committed sum</strong> as
                described in our commercial terms: subject to the stated
                exceptions (e.g. force majeure, chain failure, or abuse), your{" "}
                <strong>locked principal is protected</strong> for that
                commitment window so you are not taking open-ended market risk on
                the nominal amount you pledged for the lock.
              </p>
              <p>
                <strong className="text-[#ff8a80]">
                  Locks shorter than 90 days
                </strong>{" "}
                are treated differently: they are designed for flexibility and
                experimentation, and{" "}
                <strong>the risk of loss on your capital is on you</strong>.
                Shorter windows do not include the same principal guarantee—you
                participate fully in the upside and downside of the session
                mechanics for that period.
              </p>
              <p className="text-[11px] text-[#5c6578]">
                Always read the latest terms before locking. Nothing on this page
                is investment advice.
              </p>
            </div>
          </section>
        </div>

        <p className="mt-10 text-[11px] text-[#5c6578]">
          <Link href="/" className="text-[#00e5ff] hover:underline">
            ← Chart
          </Link>
          {" · "}
          <Link href="/lock" className="text-[#00e5ff] hover:underline">
            Lock liquidity
          </Link>
        </p>
      </div>
    </div>
  );
}
